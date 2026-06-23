// Tipos e interfaces para o módulo de impressão

export type ConnectionType = 'bluetooth-ble' | 'serial' | 'usb' | 'network' | 'browser'

export type PrinterModel = 'RPP02N' | 'MPT-II' | 'Zjiang' | 'XPrinter' | 'Rongta' | 'Goojprt' | 'Outro'

export type PaperWidth = '58mm' | '80mm'

export interface PrinterDevice {
  id: string
  name: string
  model: PrinterModel
  connectionType: ConnectionType
  paperWidth: PaperWidth
  networkAddress?: string // ex: 192.168.1.100:9100
  isDefault: boolean
  deviceInfo?: {
    vendorId?: number
    productId?: number
    serialNumber?: string
    bluetoothId?: string
  }
}

export interface ReceiptData {
  storeName: string
  storeAddress: string
  saleId: string
  date: string
  operator: string
  customerName: string
  paymentMethod: string
  items: ReceiptItem[]
  total: number
}

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface StoreConfig {
  name: string
  address: string
  phone: string
  thankYouMessage: string
}

const STORAGE_KEY = 'printer_config'
const STORE_KEY = 'store_config'

// Gerenciamento de configuração persistente (localStorage por dispositivo)
export function getSavedPrinters(): PrinterDevice[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function savePrinters(printers: PrinterDevice[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(printers))
}

export function getDefaultPrinter(): PrinterDevice | null {
  const printers = getSavedPrinters()
  return printers.find(p => p.isDefault) || printers[0] || null
}

export function getStoreConfig(): StoreConfig {
  try {
    const data = localStorage.getItem(STORE_KEY)
    if (data) return JSON.parse(data)
  } catch { /* ignore */ }
  return {
    name: 'MINHA LOJA',
    address: '',
    phone: '',
    thankYouMessage: 'Obrigado pela preferência!'
  }
}

export function saveStoreConfig(config: StoreConfig): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(config))
}
