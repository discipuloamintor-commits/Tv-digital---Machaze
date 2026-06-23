-- Database Schema for Inventory and Sales Management System

-- 1. Create custom types
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'fiado');
CREATE TYPE user_role AS ENUM ('admin', 'employee');

-- 2. Create Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'employee'::user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Create Products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  current_stock INTEGER DEFAULT 0 NOT NULL,
  min_stock INTEGER DEFAULT 0 NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Create Inventory Movements table
CREATE TABLE inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('in', 'out', 'adjustment')) NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Create Customers table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  debt_balance DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Create Sales table
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. Create Sale Items table
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL
);

-- 9. Create Payments (Fiado) table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 10. Create Customer Ledger (Extrato) table
CREATE TABLE customer_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('sale', 'payment', 'adjustment')) NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT,
  debit DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  credit DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  balance DECIMAL(10, 2) NOT NULL,
  reference_id UUID, -- Can link to sales.id or payments.id
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 11. Triggers and Functions

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    CASE 
      WHEN new.email = 'superadmin@gmail.com' THEN 'admin'::user_role 
      ELSE 'employee'::user_role 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to update customer debt balance and ledger on new FIADO sale
CREATE OR REPLACE FUNCTION handle_fiado_sale()
RETURNS trigger AS $$
DECLARE
  current_balance DECIMAL(10,2);
BEGIN
  IF NEW.payment_method = 'fiado' THEN
    -- Get current debt
    SELECT debt_balance INTO current_balance FROM customers WHERE id = NEW.customer_id;
    
    -- Update customer debt
    UPDATE customers 
    SET debt_balance = debt_balance + NEW.total_amount 
    WHERE id = NEW.customer_id;
    
    -- Insert ledger entry
    INSERT INTO customer_ledger (customer_id, type, description, debit, credit, balance, reference_id)
    VALUES (
      NEW.customer_id, 
      'sale', 
      'Venda a Prazo (Fiado)', 
      NULL, 
      NEW.total_amount, 
      0, 
      current_balance + NEW.total_amount, 
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_fiado_sale_created
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE PROCEDURE handle_fiado_sale();

-- Function to handle new payments
CREATE OR REPLACE FUNCTION handle_new_payment()
RETURNS trigger AS $$
DECLARE
  current_balance DECIMAL(10,2);
BEGIN
  -- Get current debt
  SELECT debt_balance INTO current_balance FROM customers WHERE id = NEW.customer_id;
  
  -- Update customer debt
  UPDATE customers 
  SET debt_balance = debt_balance - NEW.amount 
  WHERE id = NEW.customer_id;
  
  -- Insert ledger entry
  INSERT INTO customer_ledger (customer_id, type, description, debit, credit, balance, reference_id)
  VALUES (
    NEW.customer_id, 
    'payment', 
    COALESCE(NEW.notes, 'Pagamento Recebido'), 
    NULL, 
    0, 
    NEW.amount, 
    current_balance - NEW.amount, 
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payment_created
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE PROCEDURE handle_new_payment();

-- Function to deduct stock on new sale_item
CREATE OR REPLACE FUNCTION handle_sale_item_stock()
RETURNS trigger AS $$
BEGIN
  -- Deduct stock
  UPDATE products
  SET current_stock = current_stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  -- Log inventory movement
  INSERT INTO inventory_movements (product_id, type, quantity, reason)
  VALUES (NEW.product_id, 'out', NEW.quantity, 'Venda');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_sale_item_created
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE PROCEDURE handle_sale_item_stock();

-- Function to handle checkout safely via RPC (Transaction)
CREATE OR REPLACE FUNCTION checkout_sale(
  p_customer_id UUID,
  p_payment_method payment_method,
  p_total_amount DECIMAL,
  p_items JSONB
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
BEGIN
  -- 1. Insert the sale record
  INSERT INTO sales (customer_id, payment_method, total_amount)
  VALUES (p_customer_id, p_payment_method, p_total_amount)
  RETURNING id INTO v_sale_id;

  -- 2. Loop through items and insert them
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total_price')::DECIMAL
    );
  END LOOP;

  -- Return the new sale ID
  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RLS Policies
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for most tables
CREATE POLICY "Allow authenticated read access" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON inventory_movements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON sales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON sale_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON customer_ledger FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert sales, sale_items, and payments
CREATE POLICY "Allow authenticated insert" ON sales FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON sale_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only admins can insert/update/delete products and categories
CREATE POLICY "Allow admin all" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admin all" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admin all" ON customers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
