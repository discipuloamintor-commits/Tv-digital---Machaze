import { useState, useEffect } from 'react'
import {
  Printer,
  Plus,
  Trash2,
  Wifi,
  Bluetooth,
  Usb,
  Monitor,
  Star,
  TestTube,
  X,
  Save,
  AlertTriangle,
  Check,
  Settings,
} from 'lucide-react'
import {
  type PrinterDevice,
  type ConnectionType,
  type PrinterModel,
  type PaperWidth,
  type StoreConfig,
  getSavedPrinters,
  savePrinters,
  getStoreConfig,
  saveStoreConfig,
  PrinterService,
} from '../lib/printing'

const connectionLabels: Record<ConnectionType, string> = {
  'bluetooth-ble': 'Bluetooth (BLE)',
  serial: 'Bluetooth Classic / Serial',
  usb: 'USB Direto',
  network: 'Rede / IP',
  browser: 'Navegador (window.print)',
}

const connectionIcons: Record<ConnectionType, typeof Bluetooth> = {
  'bluetooth-ble': Bluetooth,
  serial: Bluetooth,
  usb: Usb,
  network: Wifi,
  browser: Monitor,
}

const modelOptions: PrinterModel[] = [
  'RPP02N',
  'MPT-II',
  'Zjiang',
  'XPrinter',
  'Rongta',
  'Goojprt',
  'Outro',
]

export default function PrinterSettings() {
  const [printers, setPrinters] = useState<PrinterDevice[]>([])
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoreConfig())
  const [showModal, setShowModal] = useState(false)
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})
  const [supportedConnections, setSupportedConnections] = useState<ConnectionType[]>([])
  const [showStoreModal, setShowStoreModal] = useState(false)

  const [formData, setFormData] = useState<{
    name: string
    model: PrinterModel
    connectionType: ConnectionType
    paperWidth: PaperWidth
    networkAddress: string
    isDefault: boolean
  }>({
    name: '',
    model: 'RPP02N',
    connectionType: 'browser',
    paperWidth: '58mm',
    networkAddress: '',
    isDefault: false,
  })

  useEffect(() => {
    setPrinters(getSavedPrinters())
    setSupportedConnections(PrinterService.getSupportedConnections())
  }, [])

  const handleAddPrinter = () => {
    if (!formData.name.trim()) {
      alert('Informe o nome da impressora')
      return
    }

    const newPrinter: PrinterDevice = {
      id: crypto.randomUUID(),
      name: formData.name,
      model: formData.model,
      connectionType: formData.connectionType,
      paperWidth: formData.paperWidth,
      networkAddress: formData.connectionType === 'network' ? formData.networkAddress : undefined,
      isDefault: formData.isDefault || printers.length === 0,
    }

    // Se esta é default, remove o default das outras
    let updated = [...printers]
    if (newPrinter.isDefault) {
      updated = updated.map(p => ({ ...p, isDefault: false }))
    }
    updated.push(newPrinter)

    savePrinters(updated)
    setPrinters(updated)
    setShowModal(false)
    setFormData({
      name: '',
      model: 'RPP02N',
      connectionType: 'browser',
      paperWidth: '58mm',
      networkAddress: '',
      isDefault: false,
    })
  }

  const handleRemove = (id: string) => {
    const updated = printers.filter(p => p.id !== id)
    savePrinters(updated)
    setPrinters(updated)
  }

  const handleSetDefault = (id: string) => {
    const updated = printers.map(p => ({ ...p, isDefault: p.id === id }))
    savePrinters(updated)
    setPrinters(updated)
  }

  const handleTestPrint = async (printer: PrinterDevice) => {
    setTestStatus(prev => ({ ...prev, [printer.id]: 'testing' }))
    try {
      if (printer.connectionType === 'browser') {
        // Testa via window.print()
        PrinterService.printViaBrowser({
          storeName: storeConfig.name,
          storeAddress: storeConfig.address,
          saleId: 'TESTE',
          date: new Date().toLocaleString(),
          operator: 'Sistema',
          customerName: 'Teste',
          paymentMethod: 'TESTE',
          items: [{ name: 'Produto Teste', quantity: 1, unitPrice: 10.0, subtotal: 10.0 }],
          total: 10.0,
        })
        setTestStatus(prev => ({ ...prev, [printer.id]: 'success' }))
      } else {
        await PrinterService.testPrint(printer)
        setTestStatus(prev => ({ ...prev, [printer.id]: 'success' }))
      }
    } catch (error: any) {
      console.error('Teste de impressão falhou:', error)
      setTestStatus(prev => ({ ...prev, [printer.id]: 'error' }))
      alert(`Falha no teste: ${error.message}`)
    }

    setTimeout(() => {
      setTestStatus(prev => ({ ...prev, [printer.id]: 'idle' }))
    }, 3000)
  }

  const handleSaveStoreConfig = () => {
    saveStoreConfig(storeConfig)
    setShowStoreModal(false)
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#EDEDED]">Impressoras</h2>
          <p className="text-sm text-[#8B8B8B] mt-1">
            Configure as impressoras térmicas para emissão de recibos
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowStoreModal(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-[#3E3E3E] text-[#EDEDED] rounded-md hover:bg-[#3E3E3E] transition-colors"
          >
            <Settings size={16} />
            <span>Dados da Loja</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-[#24B47E] text-white px-4 py-2 rounded-md hover:bg-[#24B47E]/90 transition-colors"
          >
            <Plus size={16} />
            <span>Adicionar Impressora</span>
          </button>
        </div>
      </div>

      {/* Compatibilidade do navegador */}
      <div className="bg-[#161616] border border-[#3E3E3E] rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-[#8B8B8B] mb-3">APIs suportadas neste navegador:</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(connectionLabels).map(([type, label]) => {
            const supported = supportedConnections.includes(type as ConnectionType)
            return (
              <span
                key={type}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  supported
                    ? 'bg-[#24B47E]/10 text-[#24B47E] border border-[#24B47E]/30'
                    : 'bg-red-500/10 text-red-500 border border-red-500/30'
                }`}
              >
                {supported ? '✓' : '✗'} {label}
              </span>
            )
          })}
        </div>
      </div>

      {/* Lista de impressoras */}
      {printers.length === 0 ? (
        <div className="bg-[#161616] border border-[#3E3E3E] rounded-lg p-12 text-center">
          <Printer size={48} className="mx-auto text-[#3E3E3E] mb-4" />
          <p className="text-[#8B8B8B] text-lg">Nenhuma impressora configurada</p>
          <p className="text-[#8B8B8B] text-sm mt-2">
            O sistema usará a impressão pelo navegador (window.print) por padrão.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {printers.map(printer => {
            const Icon = connectionIcons[printer.connectionType] || Monitor
            const status = testStatus[printer.id] || 'idle'

            return (
              <div
                key={printer.id}
                className={`bg-[#161616] border rounded-lg p-4 flex items-center justify-between ${
                  printer.isDefault ? 'border-[#24B47E]/50' : 'border-[#3E3E3E]'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      printer.isDefault ? 'bg-[#24B47E]/10 text-[#24B47E]' : 'bg-[#1c1c1c] text-[#8B8B8B]'
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#EDEDED] font-medium">{printer.name}</span>
                      {printer.isDefault && (
                        <span className="text-xs bg-[#24B47E]/10 text-[#24B47E] border border-[#24B47E]/30 px-2 py-0.5 rounded-full">
                          Padrão
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[#8B8B8B]">
                      {printer.model} · {connectionLabels[printer.connectionType]} · {printer.paperWidth}
                      {printer.networkAddress && ` · ${printer.networkAddress}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTestPrint(printer)}
                    disabled={status === 'testing'}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center space-x-1 ${
                      status === 'success'
                        ? 'bg-[#24B47E]/10 text-[#24B47E]'
                        : status === 'error'
                        ? 'bg-red-500/10 text-red-500'
                        : 'border border-[#3E3E3E] text-[#8B8B8B] hover:text-[#EDEDED] hover:bg-[#3E3E3E]'
                    }`}
                  >
                    {status === 'testing' ? (
                      <span>Testando...</span>
                    ) : status === 'success' ? (
                      <>
                        <Check size={14} />
                        <span>OK</span>
                      </>
                    ) : status === 'error' ? (
                      <>
                        <AlertTriangle size={14} />
                        <span>Falhou</span>
                      </>
                    ) : (
                      <>
                        <TestTube size={14} />
                        <span>Testar</span>
                      </>
                    )}
                  </button>

                  {!printer.isDefault && (
                    <button
                      onClick={() => handleSetDefault(printer.id)}
                      title="Definir como padrão"
                      className="p-1.5 rounded-md border border-[#3E3E3E] text-[#8B8B8B] hover:text-yellow-500 hover:border-yellow-500/30 transition-colors"
                    >
                      <Star size={14} />
                    </button>
                  )}

                  <button
                    onClick={() => handleRemove(printer.id)}
                    title="Remover"
                    className="p-1.5 rounded-md border border-[#3E3E3E] text-[#8B8B8B] hover:text-red-500 hover:border-red-500/30 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Adicionar Impressora */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161616] border border-[#3E3E3E] rounded-lg w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-[#3E3E3E]">
              <h3 className="text-lg font-semibold text-[#EDEDED]">Adicionar Impressora</h3>
              <button onClick={() => setShowModal(false)} className="text-[#8B8B8B] hover:text-[#EDEDED]">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Nome da Impressora</label>
                <input
                  type="text"
                  placeholder="Ex: Caixa 1"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Modelo</label>
                  <select
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value as PrinterModel })}
                    className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                  >
                    {modelOptions.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Largura do Papel</label>
                  <select
                    value={formData.paperWidth}
                    onChange={e => setFormData({ ...formData, paperWidth: e.target.value as PaperWidth })}
                    className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                  >
                    <option value="58mm">58mm</option>
                    <option value="80mm">80mm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Tipo de Conexão</label>
                <select
                  value={formData.connectionType}
                  onChange={e => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })}
                  className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                >
                  {Object.entries(connectionLabels).map(([type, label]) => {
                    const supported = supportedConnections.includes(type as ConnectionType)
                    return (
                      <option key={type} value={type}>
                        {label} {!supported ? '(não suportado)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {formData.connectionType === 'network' && (
                <div>
                  <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Endereço IP:Porta</label>
                  <input
                    type="text"
                    placeholder="192.168.1.100:9100"
                    value={formData.networkAddress}
                    onChange={e => setFormData({ ...formData, networkAddress: e.target.value })}
                    className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                  />
                </div>
              )}

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-[#3E3E3E] text-[#24B47E] focus:ring-[#24B47E]"
                />
                <span className="text-sm text-[#8B8B8B]">Definir como impressora padrão</span>
              </label>

              <div className="pt-4 border-t border-[#3E3E3E] flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-[#EDEDED] hover:bg-[#3E3E3E] rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPrinter}
                  className="px-4 py-2 bg-[#24B47E] text-white rounded-md hover:bg-[#24B47E]/90 transition-colors flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dados da Loja */}
      {showStoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161616] border border-[#3E3E3E] rounded-lg w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-[#3E3E3E]">
              <h3 className="text-lg font-semibold text-[#EDEDED]">Dados da Loja (Recibo)</h3>
              <button onClick={() => setShowStoreModal(false)} className="text-[#8B8B8B] hover:text-[#EDEDED]">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Nome da Loja</label>
                <input
                  type="text"
                  value={storeConfig.name}
                  onChange={e => setStoreConfig({ ...storeConfig, name: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Endereço</label>
                <input
                  type="text"
                  value={storeConfig.address}
                  onChange={e => setStoreConfig({ ...storeConfig, address: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Telefone</label>
                <input
                  type="text"
                  value={storeConfig.phone}
                  onChange={e => setStoreConfig({ ...storeConfig, phone: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B8B8B] mb-1">Mensagem de Agradecimento</label>
                <input
                  type="text"
                  value={storeConfig.thankYouMessage}
                  onChange={e => setStoreConfig({ ...storeConfig, thankYouMessage: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#3E3E3E] rounded-md px-3 py-2 text-[#EDEDED] focus:border-[#24B47E] focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#3E3E3E] flex justify-end space-x-3">
                <button onClick={() => setShowStoreModal(false)} className="px-4 py-2 text-[#EDEDED] hover:bg-[#3E3E3E] rounded-md transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSaveStoreConfig} className="px-4 py-2 bg-[#24B47E] text-white rounded-md hover:bg-[#24B47E]/90 transition-colors flex items-center space-x-2">
                  <Save size={16} />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
