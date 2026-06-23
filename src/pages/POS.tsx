import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PrinterService, getStoreConfig } from '../lib/printing'
import type { ReceiptData } from '../lib/printing'
import { AlertTriangle, CheckCircle, Smartphone } from 'lucide-react'

interface CartItem {
  product: any
  quantity: number
}

export default function POS() {
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  
  // Receipt state
  const [lastSale, setLastSale] = useState<any>(null)
  const [printerStatus, setPrinterStatus] = useState<{status: string, printerName: string}>({ status: 'disconnected', printerName: 'Carregando...' })

  useEffect(() => {
    // Carrega status inicial da impressora
    setPrinterStatus(PrinterService.getConnectionStatus())
  }, [])

  const handlePrinterConnect = async () => {
    try {
      await PrinterService.preconnect()
      setPrinterStatus(PrinterService.getConnectionStatus())
    } catch (error: any) {
      if (error.name !== 'NotFoundError') {
        alert('Erro ao conectar impressora: ' + error.message)
      }
      setPrinterStatus(PrinterService.getConnectionStatus())
    }
  }

  useEffect(() => {
    async function loadData() {
      const [productsRes, customersRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('customers').select('*').order('name')
      ])
      if (productsRes.data) setProducts(productsRes.data)
      if (customersRes.data) setCustomers(customersRes.data)
    }
    loadData()
  }, [])

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) => prev.map(item => item.product.id === productId ? { ...item, quantity } : item))
  }

  const totalAmount = cart.reduce((acc, item) => acc + (Number(item.product.sale_price) * item.quantity), 0)

  // Tabs: 'avulsa' | 'fiado'
  const [saleType, setSaleType] = useState<'avulsa' | 'fiado'>('avulsa')

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (saleType === 'fiado' && !selectedCustomer) {
      alert('Selecione o cliente devedor.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const finalPaymentMethod = saleType === 'fiado' ? 'fiado' : paymentMethod

      const { data: saleId, error: rpcError } = await supabase.rpc('checkout_sale', {
        p_customer_id: saleType === 'fiado' ? selectedCustomer : null,
        p_payment_method: finalPaymentMethod,
        p_total_amount: totalAmount,
        p_items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.sale_price,
          total_price: Number(item.product.sale_price) * item.quantity
        }))
      })

      if (rpcError) throw rpcError

      // Prepara os dados para o Recibo
      const customerName = saleType === 'fiado' ? (customers.find(c => c.id === selectedCustomer)?.name || 'Desconhecido') : 'Consumidor Final'
      const storeConfig = getStoreConfig()
      
      const receiptData: ReceiptData = {
        storeName: storeConfig.name,
        storeAddress: storeConfig.address,
        saleId: String(saleId).substring(0, 8).toUpperCase(),
        date: new Date().toLocaleString(),
        operator: user?.email?.split('@')[0] || 'Operador',
        customerName,
        paymentMethod: finalPaymentMethod,
        items: cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.product.sale_price),
          subtotal: Number(item.product.sale_price) * item.quantity,
        })),
        total: totalAmount,
      }

      setLastSale({
         saleId: String(saleId),
         date: new Date().toISOString(),
         items: [...cart],
         total: totalAmount,
         method: finalPaymentMethod,
         customerName
      })

      setCart([])
      setSelectedCustomer('')
      setPaymentMethod('cash')
      
      // Aciona impressão via PrinterService (com fallback automático)
      try {
        const result = await PrinterService.printReceipt(receiptData)
        if (result.error) {
          console.warn(result.error)
        }
      } catch (printError) {
        console.warn('Erro na impressão:', printError)
        // Já tem fallback interno, não precisa alertar o usuário
      } finally {
        setPrinterStatus(PrinterService.getConnectionStatus())
      }

    } catch (error: any) {
      alert('Erro ao finalizar venda: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 screen-only">
        {/* Products List */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
             <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-start">
               <h2 className="text-2xl font-semibold text-[#EDEDED]">Ponto de Venda</h2>
               
               {/* Printer Status Widget */}
               <button 
                 onClick={handlePrinterConnect}
                 className="flex items-center space-x-2 bg-[#1c1c1c] border border-[#3E3E3E] px-3 py-1.5 rounded-full text-xs hover:bg-[#3E3E3E] transition-colors"
                 title="Clique para forçar a conexão com a impressora"
               >
                 {printerStatus.status === 'connected' ? (
                   <><CheckCircle size={14} className="text-[#24B47E]" /> <span className="text-[#24B47E] font-medium">Conectada ({printerStatus.printerName})</span></>
                 ) : printerStatus.status === 'browser' ? (
                   <><Smartphone size={14} className="text-blue-500" /> <span className="text-blue-500 font-medium">Layout Web Ativo</span></>
                 ) : (
                   <><AlertTriangle size={14} className="text-yellow-500" /> <span className="text-yellow-500 font-medium">Desconectada ({printerStatus.printerName})</span></>
                 )}
               </button>
             </div>
             <div className="flex bg-[#1c1c1c] border border-[#3E3E3E] rounded-md p-1 w-full md:w-auto justify-center">
                <button 
                  onClick={() => setSaleType('avulsa')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${saleType === 'avulsa' ? 'bg-[#24B47E] text-white' : 'text-[#8B8B8B] hover:text-[#EDEDED]'}`}
                >
                  Venda Avulsa
                </button>
                <button 
                  onClick={() => setSaleType('fiado')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${saleType === 'fiado' ? 'bg-red-600 text-white' : 'text-[#8B8B8B] hover:text-[#EDEDED]'}`}
                >
                  Dívida / Fiado
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto h-[55vh] md:h-[calc(100vh-12rem)] pb-4 pr-2">
            {products.map(product => (
              <div 
                key={product.id} 
                className="bg-[#161616] border border-[#3E3E3E] rounded-lg p-4 cursor-pointer hover:border-[#24B47E] transition-colors flex flex-col justify-between"
                onClick={() => addToCart(product)}
              >
                <div>
                   <div className="font-medium text-[#EDEDED] leading-tight">{product.name}</div>
                   <div className="text-sm text-[#8B8B8B] mt-1">{product.code}</div>
                </div>
                <div>
                   <div className="font-semibold text-[#24B47E] mt-3">Mt {Number(product.sale_price).toFixed(2)}</div>
                   <div className="text-xs text-[#8B8B8B] mt-1">Estoque: {product.current_stock}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="bg-[#161616] border border-[#3E3E3E] rounded-lg flex flex-col h-[calc(100vh-6rem)]">
          <div className={`p-4 border-b border-[#3E3E3E] ${saleType === 'fiado' ? 'bg-red-600/10' : 'bg-[#1c1c1c]'} rounded-t-lg transition-colors`}>
            <h3 className="font-semibold text-lg text-[#EDEDED]">
               {saleType === 'avulsa' ? 'Carrinho - Avulsa' : 'Carrinho - Fiado'}
            </h3>
          </div>
          
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {cart.length === 0 && (
               <div className="text-[#8B8B8B] text-center mt-10">Adicione produtos ao carrinho</div>
            )}
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between items-center">
                <div className="flex-1 pr-2">
                  <div className="text-[#EDEDED] text-sm leading-tight">{item.product.name}</div>
                  <div className="text-xs text-[#8B8B8B] mt-0.5">Mt {Number(item.product.sale_price).toFixed(2)} x {item.quantity}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="bg-[#1c1c1c] text-[#EDEDED] border border-[#3E3E3E] w-7 h-7 rounded-md flex items-center justify-center">-</button>
                  <span className="text-[#EDEDED] w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="bg-[#1c1c1c] text-[#EDEDED] border border-[#3E3E3E] w-7 h-7 rounded-md flex items-center justify-center">+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#3E3E3E] space-y-4">
            {saleType === 'avulsa' ? (
               <div>
                 <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Forma de Pagamento</label>
                 <select 
                   value={paymentMethod} 
                   onChange={e => setPaymentMethod(e.target.value)}
                   className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:outline-none focus:border-[#24B47E]"
                 >
                   <option value="cash">Dinheiro</option>
                   <option value="credit_card">Cartão de Crédito</option>
                   <option value="debit_card">Cartão de Débito</option>
                   <option value="pix">PIX</option>
                 </select>
               </div>
            ) : (
               <div>
                 <label className="block text-sm font-medium text-red-400 mb-1">Selecionar Devedor</label>
                 <select 
                   value={selectedCustomer} 
                   onChange={e => setSelectedCustomer(e.target.value)}
                   className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:outline-none focus:border-red-500"
                 >
                   <option value="">-- Escolha o Cliente --</option>
                   {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
            )}
            
            <div className="flex justify-between items-center py-2 text-xl font-bold text-[#EDEDED]">
              <span>Total</span>
              <span>Mt {totalAmount.toFixed(2)}</span>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading || (saleType === 'fiado' && !selectedCustomer)}
              className={`w-full text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 ${saleType === 'fiado' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#24B47E] hover:bg-[#24B47E]/90'}`}
            >
              {loading ? 'Finalizando...' : (saleType === 'fiado' ? 'Registrar Dívida' : 'Finalizar Venda')}
            </button>
          </div>
        </div>
      </div>

      {/* Recibo para Impressora Térmica 58mm (Oculto em tela cheia via CSS) */}
      {lastSale && (
        <div className="receipt-58mm hidden">
           <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <strong>MINHA LOJA</strong><br/>
              Recibo de Venda<br/>
              --------------------------------<br/>
              Data: {new Date(lastSale.date).toLocaleString()}<br/>
              {lastSale.method === 'fiado' ? `Devedor: ${lastSale.customerName}` : 'Cliente: Avulso'}<br/>
              Pagamento: {lastSale.method.toUpperCase()}
           </div>
           --------------------------------<br/>
           <table style={{ width: '100%', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                 <tr>
                    <th>QTD</th>
                    <th>ITEM</th>
                    <th>TOTAL</th>
                 </tr>
              </thead>
              <tbody>
                 {lastSale.items.map((item: any) => (
                    <tr key={item.product.id}>
                       <td>{item.quantity}</td>
                       <td>{item.product.name.substring(0, 15)}</td>
                       <td>{(item.product.sale_price * item.quantity).toFixed(2)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
           --------------------------------<br/>
           <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
              TOTAL: Mt {lastSale.total.toFixed(2)}
           </div>
           <br/>
           <div style={{ textAlign: 'center', fontSize: '10px' }}>
              {lastSale.method === 'fiado' ? 'Assinatura do Devedor:' : 'Obrigado pela preferencia!'}
              {lastSale.method === 'fiado' && <><br/><br/>______________________</>}
           </div>
           <br/>
           <br/>
        </div>
      )}
    </>
  )
}
