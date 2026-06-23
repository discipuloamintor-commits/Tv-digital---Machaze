import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Ledger View State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [ledger, setLedger] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  })

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('name')
    if (data) setCustomers(data)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('customers').insert([formData])

    setLoading(false)

    if (error) {
      alert('Erro ao criar cliente: ' + error.message)
    } else {
      setIsModalOpen(false)
      fetchCustomers()
      setFormData({ name: '', phone: '', address: '', notes: '' })
    }
  }

  const openLedger = async (customer: any) => {
    setSelectedCustomer(customer)
    const { data } = await supabase
      .from('customer_ledger')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    
    if (data) setLedger(data)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-[#EDEDED]">Clientes</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#24B47E] text-white px-4 py-2 rounded-md hover:bg-[#24B47E]/90 transition-colors"
        >
          Novo Cliente
        </button>
      </div>

      <div className="bg-[#161616] rounded-lg border border-[#3E3E3E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[#1c1c1c] border-b border-[#3E3E3E]">
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Nome</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Telefone</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Saldo Devedor (Fiado)</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-[#8B8B8B]">Nenhum cliente cadastrado.</td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="border-b border-[#3E3E3E] hover:bg-[#1c1c1c] transition-colors">
                  <td className="px-6 py-4 text-[#EDEDED]">{customer.name}</td>
                  <td className="px-6 py-4 text-[#EDEDED]">{customer.phone}</td>
                  <td className="px-6 py-4 text-red-500 font-medium">Mt {Number(customer.debt_balance).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => openLedger(customer)}
                      className="text-[#24B47E] hover:text-[#24B47E]/80 transition-colors"
                    >
                      Ver Extrato
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal Novo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161616] border border-[#3E3E3E] rounded-lg w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-[#3E3E3E]">
              <h3 className="text-lg font-semibold text-[#EDEDED]">Novo Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8B8B8B] hover:text-[#EDEDED]">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Nome Completo</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Telefone / WhatsApp</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Endereço</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Observações</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" />
              </div>
              
              <div className="pt-4 border-t border-[#3E3E3E] flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[#EDEDED] hover:bg-[#3E3E3E] rounded-md transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#24B47E] text-white rounded-md hover:bg-[#24B47E]/90 transition-colors disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Extrato do Cliente (Fiado) */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161616] border border-[#3E3E3E] rounded-lg w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-[#3E3E3E]">
              <div>
                <h3 className="text-lg font-semibold text-[#EDEDED]">Extrato - {selectedCustomer.name}</h3>
                <p className="text-sm text-[#8B8B8B]">Saldo Atual: <span className="text-red-500 font-bold">Mt {Number(selectedCustomer.debt_balance).toFixed(2)}</span></p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-[#8B8B8B] hover:text-[#EDEDED]">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-x-auto p-4">
              <table className="w-full text-left border-collapse text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#3E3E3E]">
                    <th className="pb-2 text-[#8B8B8B]">Data</th>
                    <th className="pb-2 text-[#8B8B8B]">Descrição</th>
                    <th className="pb-2 text-right text-[#8B8B8B]">Crédito (Pago)</th>
                    <th className="pb-2 text-right text-[#8B8B8B]">Débito (Fiado)</th>
                    <th className="pb-2 text-right text-[#8B8B8B]">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-[#8B8B8B]">Nenhuma movimentação registrada.</td>
                    </tr>
                  ) : (
                    ledger.map((entry) => (
                      <tr key={entry.id} className="border-b border-[#3E3E3E]">
                        <td className="py-3 text-[#EDEDED]">{new Date(entry.created_at).toLocaleDateString()}</td>
                        <td className="py-3 text-[#EDEDED]">{entry.description}</td>
                        <td className="py-3 text-right text-[#24B47E] font-medium">{entry.credit > 0 ? `Mt ${Number(entry.credit).toFixed(2)}` : '-'}</td>
                        <td className="py-3 text-right text-red-500 font-medium">{entry.debit > 0 ? `Mt ${Number(entry.debit).toFixed(2)}` : '-'}</td>
                        <td className="py-3 text-right text-[#EDEDED] font-medium">Mt {Number(entry.balance).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#3E3E3E] bg-[#1c1c1c] flex justify-between items-center rounded-b-lg">
               <button 
                onClick={() => {
                   const amount = prompt('Digite o valor que o cliente está pagando (ex: 50.00):')
                   if (amount && !isNaN(Number(amount))) {
                      supabase.from('payments').insert([{
                         customer_id: selectedCustomer.id,
                         amount: Number(amount)
                      }]).then(() => {
                         alert('Pagamento registrado!')
                         setSelectedCustomer(null)
                         fetchCustomers()
                      })
                   }
                }}
                className="bg-[#24B47E] text-white px-4 py-2 rounded-md hover:bg-[#24B47E]/90 transition-colors"
               >
                 Registrar Pagamento
               </button>
               <button onClick={() => window.print()} className="text-[#8B8B8B] hover:text-[#EDEDED] border border-[#3E3E3E] px-4 py-2 rounded-md transition-colors">
                 Imprimir Extrato
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
