import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    unit: 'un',
    sale_price: '',
    cost_price: '',
    current_stock: '',
    min_stock: ''
  })

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    if (data) setProducts(data)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Gerar Código Automático (PROD-XXXX)
    let newCode = 'PROD-0001'
    const { data: lastProduct } = await supabase
      .from('products')
      .select('code')
      .order('created_at', { ascending: false })
      .limit(1)

    if (lastProduct && lastProduct.length > 0 && lastProduct[0].code.startsWith('PROD-')) {
      const lastNumber = parseInt(lastProduct[0].code.replace('PROD-', ''), 10)
      if (!isNaN(lastNumber)) {
        newCode = `PROD-${String(lastNumber + 1).padStart(4, '0')}`
      }
    }

    const { error } = await supabase.from('products').insert([{
      code: newCode,
      name: formData.name,
      unit: formData.unit,
      sale_price: Number(formData.sale_price),
      cost_price: Number(formData.cost_price),
      current_stock: Number(formData.current_stock) || 0,
      min_stock: Number(formData.min_stock) || 0
    }])

    setLoading(false)

    if (error) {
      alert('Erro ao criar produto: ' + error.message)
    } else {
      setIsModalOpen(false)
      fetchProducts() // Atualiza a lista
      setFormData({ name: '', unit: 'un', sale_price: '', cost_price: '', current_stock: '', min_stock: '' }) // Limpa form
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-[#EDEDED]">Produtos</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#24B47E] text-white px-4 py-2 rounded-md hover:bg-[#24B47E]/90 transition-colors"
        >
          Novo Produto
        </button>
      </div>

      <div className="bg-[#161616] rounded-lg border border-[#3E3E3E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[#1c1c1c] border-b border-[#3E3E3E]">
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Código</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Nome</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Estoque Atual</th>
              <th className="px-6 py-4 text-sm font-medium text-[#8B8B8B]">Preço de Venda</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-[#8B8B8B]">Nenhum produto cadastrado.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-[#3E3E3E] hover:bg-[#1c1c1c] transition-colors">
                  <td className="px-6 py-4 text-[#EDEDED]">{product.code}</td>
                  <td className="px-6 py-4 text-[#EDEDED]">{product.name}</td>
                  <td className="px-6 py-4">
                    <span className={product.current_stock <= product.min_stock ? "text-red-500 font-bold" : "text-[#EDEDED]"}>
                      {product.current_stock}
                    </span>
                    {product.current_stock <= product.min_stock && (
                      <span className="ml-2 text-xs text-red-500 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded-full">
                        Baixo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[#EDEDED]">Mt {Number(product.sale_price).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal Novo Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161616] border border-[#3E3E3E] rounded-lg w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-[#3E3E3E]">
              <h3 className="text-lg font-semibold text-[#EDEDED]">Novo Produto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8B8B8B] hover:text-[#EDEDED]">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Nome do Produto</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Preço de Custo</label>
                  <input required type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Preço de Venda</label>
                  <input required type="number" step="0.01" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Unidade</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none">
                    <option value="un">Un (un)</option>
                    <option value="kg">Kg (kg)</option>
                    <option value="m">M (m)</option>
                    <option value="cx">Cx (cx)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Estoque</label>
                  <input required type="number" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Mínimo</label>
                  <input required type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none" title="Estoque Mínimo para Alerta" />
                </div>
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
    </div>
  )
}
