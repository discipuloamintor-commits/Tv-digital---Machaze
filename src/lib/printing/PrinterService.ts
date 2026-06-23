// PrinterService — Orquestrador principal do módulo de impressão
// Gerencia configuração, seleção de transporte e fallback automático

import type { ReceiptData, PrinterDevice, ConnectionType } from './PrinterConfig'
import { getDefaultPrinter, getStoreConfig } from './PrinterConfig'
import { buildEscPosReceipt, buildHtmlReceipt } from './ReceiptBuilder'
import {
  BluetoothTransport,
  SerialTransport,
  UsbTransport,
  BrowserTransport,
  type PrintTransport,
} from './Transports'

class PrinterServiceSingleton {
  private transports: Map<ConnectionType, PrintTransport> = new Map()
  private activeTransport: PrintTransport | null = null
  private activePrinter: PrinterDevice | null = null

  constructor() {
    this.transports.set('bluetooth-ble', new BluetoothTransport())
    this.transports.set('serial', new SerialTransport())
    this.transports.set('usb', new UsbTransport())
    this.transports.set('browser', new BrowserTransport())
  }

  /**
   * Retorna o transporte para um tipo de conexão
   */
  getTransport(type: ConnectionType): PrintTransport | undefined {
    return this.transports.get(type)
  }

  /**
   * Verifica quais tipos de conexão são suportados neste navegador
   */
  getSupportedConnections(): ConnectionType[] {
    const supported: ConnectionType[] = []
    for (const [type, transport] of this.transports) {
      if (transport.isSupported()) {
        supported.push(type as ConnectionType)
      }
    }
    return supported
  }

  /**
   * Conecta a uma impressora específica
   */
  async connect(printer?: PrinterDevice): Promise<void> {
    const target = printer || getDefaultPrinter()
    if (!target) throw new Error('Nenhuma impressora configurada')

    const transport = this.transports.get(target.connectionType)
    if (!transport) throw new Error(`Transporte "${target.connectionType}" não encontrado`)
    if (!transport.isSupported()) throw new Error(`"${target.connectionType}" não é suportado neste navegador`)

    await transport.connect(target)
    this.activeTransport = transport
    this.activePrinter = target
  }

  /**
   * Desconecta a impressora ativa
   */
  async disconnect(): Promise<void> {
    if (this.activeTransport) {
      await this.activeTransport.disconnect()
      this.activeTransport = null
      this.activePrinter = null
    }
  }

  /**
   * Retorna o status atual da conexão para o Widget do PDV
   */
  getConnectionStatus(): { status: 'connected' | 'disconnected' | 'browser', printerName: string } {
    const printer = this.activePrinter || getDefaultPrinter()
    if (!printer) return { status: 'browser', printerName: 'Impressora do Navegador' }
    if (printer.connectionType === 'browser') return { status: 'browser', printerName: printer.name }
    
    if (this.activeTransport && this.activeTransport.isConnected()) {
      return { status: 'connected', printerName: printer.name }
    }
    return { status: 'disconnected', printerName: printer.name }
  }

  /**
   * Pré-conecta a impressora (solicita permissão de hardware de forma segura)
   */
  async preconnect(): Promise<void> {
    const printer = getDefaultPrinter()
    if (!printer || printer.connectionType === 'browser') return
    
    const transport = this.transports.get(printer.connectionType)
    if (!transport || !transport.isSupported()) {
      throw new Error('Transporte não suportado')
    }

    if (!transport.isConnected()) {
      await transport.connect(printer)
      this.activeTransport = transport
      this.activePrinter = printer
    }
  }

  /**
   * Imprime um recibo — tenta o transporte configurado, com fallback para browser
   */
  async printReceipt(receipt: ReceiptData): Promise<{ method: string; success: boolean; error?: string }> {
    const printer = this.activePrinter || getDefaultPrinter()

    // Se não há impressora configurada ou é do tipo browser, vai direto para window.print()
    if (!printer || printer.connectionType === 'browser') {
      this.printViaBrowser(receipt)
      return { method: 'browser', success: true }
    }

    // Tenta impressão direta via ESC/POS
    try {
      const transport = this.transports.get(printer.connectionType)
      if (!transport || !transport.isSupported()) {
        throw new Error('Transporte não suportado')
      }

      // Se não está conectado, tenta conectar
      if (!transport.isConnected()) {
        await transport.connect(printer)
        this.activeTransport = transport
      }

      // Gera os bytes ESC/POS
      const escPosData = await buildEscPosReceipt(receipt, printer.paperWidth)

      // Envia para a impressora
      await transport.send(escPosData)

      return { method: printer.connectionType, success: true }
    } catch (error: any) {
      console.warn(`Impressão direta falhou (${printer.connectionType}):`, error.message)

      // Fallback automático para browser
      this.printViaBrowser(receipt)
      return {
        method: 'browser (fallback)',
        success: true,
        error: `Impressão direta falhou: ${error.message}. Usando impressão pelo navegador.`,
      }
    }
  }

  /**
   * Fallback: imprime via window.print() com layout CSS otimizado para 58mm
   */
  printViaBrowser(receipt: ReceiptData): void {
    const html = buildHtmlReceipt(receipt)

    // Cria iframe oculto para não afetar a página principal
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      // Fallback do fallback: abre numa nova janela
      const win = window.open('', '_blank', 'width=300,height=600')
      if (win) {
        win.document.write(`<html><body>${html}</body></html>`)
        win.document.close()
        win.focus()
        win.print()
      }
      return
    }

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recibo</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `)
    doc.close()

    // Aguarda um instante para renderizar e depois imprime
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()

      // Remove o iframe após a impressão
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 2000)
    }, 300)
  }

  /**
   * Gera PDF do recibo como fallback de contingência
   */
  async generatePdf(receipt: ReceiptData): Promise<Blob> {
    const { jsPDF } = await import('jspdf')

    const pageWidth = 58
    const margin = 4
    let y = margin + 2

    // Cria PDF com dimensões customizadas (58mm x altura dinâmica)
    const estimatedHeight = 60 + receipt.items.length * 5
    const pdf = new jsPDF({
      unit: 'mm',
      format: [pageWidth, estimatedHeight],
    })

    const fontSize = 7
    pdf.setFontSize(fontSize)

    // Cabeçalho
    pdf.setFont('helvetica', 'bold')
    pdf.text(receipt.storeName || 'MINHA LOJA', pageWidth / 2, y, { align: 'center' })
    y += 3

    if (receipt.storeAddress) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6)
      pdf.text(receipt.storeAddress, pageWidth / 2, y, { align: 'center' })
      y += 3
    }

    // Linha
    pdf.setFontSize(fontSize)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 3

    // Info
    pdf.setFont('helvetica', 'normal')
    const info = [
      `Data: ${receipt.date}`,
      `Venda: #${receipt.saleId}`,
      `Operador: ${receipt.operator}`,
      `Cliente: ${receipt.customerName}`,
      `Pagamento: ${receipt.paymentMethod.toUpperCase()}`,
    ]
    for (const line of info) {
      pdf.text(line, margin, y)
      y += 3
    }

    // Linha
    pdf.setDrawColor(150)
    pdf.setLineDashPattern([1, 1], 0)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 3

    // Itens
    pdf.setFont('helvetica', 'bold')
    pdf.text('QTD', margin, y)
    pdf.text('ITEM', margin + 8, y)
    pdf.text('SUB', pageWidth - margin, y, { align: 'right' })
    y += 3

    pdf.setFont('helvetica', 'normal')
    for (const item of receipt.items) {
      pdf.text(String(item.quantity), margin, y)
      pdf.text(item.name.substring(0, 18), margin + 8, y)
      pdf.text(`${item.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
      y += 3
    }

    // Total
    pdf.setLineDashPattern([1, 1], 0)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 3
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text(`TOTAL: Mt ${receipt.total.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
    y += 4

    // Rodapé
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6)
    pdf.text('Obrigado pela preferência!', pageWidth / 2, y, { align: 'center' })

    return pdf.output('blob')
  }

  /**
   * Testa a impressora com uma mensagem de teste
   */
  async testPrint(printer: PrinterDevice): Promise<void> {
    const transport = this.transports.get(printer.connectionType)
    if (!transport || !transport.isSupported()) {
      throw new Error(`Transporte "${printer.connectionType}" não suportado`)
    }

    await transport.connect(printer)

    const testReceipt: ReceiptData = {
      storeName: getStoreConfig().name,
      storeAddress: getStoreConfig().address,
      saleId: 'TESTE',
      date: new Date().toLocaleString(),
      operator: 'Sistema',
      customerName: 'Teste',
      paymentMethod: 'TESTE',
      items: [
        { name: 'Produto Teste', quantity: 1, unitPrice: 10.0, subtotal: 10.0 },
      ],
      total: 10.0,
    }

    const data = await buildEscPosReceipt(testReceipt, printer.paperWidth)
    await transport.send(data)
    await transport.disconnect()
  }
}

// Singleton
export const PrinterService = new PrinterServiceSingleton()
