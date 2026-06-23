import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Sales() {
  const [sales, setSales] = useState<any[]>([])

  useEffect(() => {
    async function fetchSales() {
      const { data } = await supabase
        .from('sales')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
      if (data) setSales(data)
    }
    fetchSales()
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-[#EDEDED]">Histórico de Vendas</h2>
      </div>

      <div className="bg-[#161616] rounded-lg border border-[#3E3E3E] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1c1c1c] border-b border-[#3E3E3E]">
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Data</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Cliente</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Método</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-[#8B8B8B]">Nenhuma venda registrada.</td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="border-b border-[#3E3E3E] hover:bg-[#1c1c1c] transition-colors">
                  <td className="px-6 py-4 text-[#EDEDED]">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-[#EDEDED]">{sale.customers?.name || 'Cliente Avulso'}</td>
                  <td className="px-6 py-4 text-[#EDEDED] capitalize">{sale.payment_method}</td>
                  <td className="px-6 py-4 text-[#EDEDED]">Mt {Number(sale.total_amount).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
