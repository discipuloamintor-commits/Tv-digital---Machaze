import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Users, ShoppingCart, LogOut, Receipt, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const menu = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'PDV', path: '/pdv', icon: <ShoppingCart size={20} /> },
    { name: 'Produtos', path: '/produtos', icon: <Package size={20} /> },
    { name: 'Clientes', path: '/clientes', icon: <Users size={20} /> },
    { name: 'Vendas', path: '/vendas', icon: <Receipt size={20} /> },
    { name: 'Impressoras', path: '/configuracoes/impressoras', icon: <Printer size={20} /> },
  ]

  return (
    <div className="flex h-screen bg-[#1c1c1c] text-[#EDEDED] dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#3E3E3E] bg-[#161616] flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-[#24B47E]">Estoque & Vendas</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {menu.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-[#24B47E]/10 text-[#24B47E]' 
                    : 'text-[#8B8B8B] hover:bg-[#3E3E3E] hover:text-[#EDEDED]'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#3E3E3E]">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-2 w-full rounded-md text-[#8B8B8B] hover:bg-[#3E3E3E] hover:text-[#EDEDED] transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#1c1c1c]">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
