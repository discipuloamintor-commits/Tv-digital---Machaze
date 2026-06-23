import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Package, Users, Receipt, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalDebt: 0,
    salesToday: 0
  })

  useEffect(() => {
    async function loadStats() {
      // Products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Low stock count
      const { data: lowStockData } = await supabase
        .from('products')
        .select('id')
        .eq('is_active', true)
        .lt('current_stock', 5)

      // Total debt
      const { data: customers } = await supabase
        .from('customers')
        .select('debt_balance')

      const totalDebt = customers?.reduce((acc, curr) => acc + Number(curr.debt_balance), 0) || 0

      // Sales today (mocked for simplicity, should use proper date filtering)
      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalProducts: productsCount || 0,
        lowStock: lowStockData?.length || 0,
        totalDebt: totalDebt,
        salesToday: salesCount || 0
      })
    }

    loadStats()
  }, [])

  const statCards = [
    { title: 'Total de Produtos', value: stats.totalProducts, icon: <Package size={24} className="text-blue-500" /> },
    { title: 'Estoque Baixo', value: stats.lowStock, icon: <TrendingUp size={24} className="text-yellow-500" /> },
    { title: 'Contas a Receber', value: `Mt ${stats.totalDebt.toFixed(2)}`, icon: <Users size={24} className="text-red-500" /> },
    { title: 'Vendas Totais', value: stats.salesToday, icon: <Receipt size={24} className="text-[#24B47E]" /> },
  ]

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 text-[#EDEDED]">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-[#161616] p-6 rounded-lg border border-[#3E3E3E] shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-[#1c1c1c] rounded-md border border-[#3E3E3E]">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-[#8B8B8B]">{stat.title}</p>
              <p className="text-2xl font-semibold text-[#EDEDED]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
