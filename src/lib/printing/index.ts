export { PrinterService } from './PrinterService'
export { buildEscPosReceipt, buildHtmlReceipt } from './ReceiptBuilder'
export type { PrintTransport } from './Transports'
export {
  type PrinterDevice,
  type ReceiptData,
  type ReceiptItem,
  type StoreConfig,
  type ConnectionType,
  type PrinterModel,
  type PaperWidth,
  getSavedPrinters,
  savePrinters,
  getDefaultPrinter,
  getStoreConfig,
  saveStoreConfig,
} from './PrinterConfig'
