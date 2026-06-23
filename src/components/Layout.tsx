import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Users, ShoppingCart, LogOut, Receipt, Printer, Menu, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="flex h-screen bg-[#1c1c1c] text-[#EDEDED] dark overflow-hidden relative">
      
      {/* Mobile Header (Hamburger) */}
      <div className="md:hidden flex items-center justify-between bg-[#161616] border-b border-[#3E3E3E] p-4 absolute top-0 w-full z-20">
        <h1 className="text-xl font-bold text-[#24B47E]">Estoque & Vendas</h1>
        <button onClick={toggleMenu} className="text-[#EDEDED] focus:outline-none">
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Overlay Background for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden" 
          onClick={closeMenu}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-[#3E3E3E] bg-[#161616] flex flex-col transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6 hidden md:block">
          <h1 className="text-xl font-bold text-[#24B47E]">Estoque & Vendas</h1>
        </div>
        
        {/* Adiciona padding superior no mobile para compensar a falta do cabeçalho */}
        <nav className="flex-1 px-4 space-y-2 mt-6 md:mt-0 overflow-y-auto">
          {menu.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMenu}
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
      <main className="flex-1 overflow-auto bg-[#1c1c1c] pt-16 md:pt-0">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
