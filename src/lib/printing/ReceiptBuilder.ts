// Construtor de recibos ESC/POS usando ReceiptPrinterEncoder
import type { ReceiptData, PaperWidth } from './PrinterConfig'

/**
 * Constrói o conteúdo do recibo em formato ESC/POS (Uint8Array)
 * usando a biblioteca @point-of-sale/receipt-printer-encoder.
 */
export async function buildEscPosReceipt(
  receipt: ReceiptData,
  paperWidth: PaperWidth = '58mm'
): Promise<Uint8Array> {
  // Dynamic import para evitar problemas de SSR e reduzir bundle inicial
  const { default: ReceiptPrinterEncoder } = await import(
    '@point-of-sale/receipt-printer-encoder'
  )

  const columns = paperWidth === '58mm' ? 32 : 48

  const encoder = new ReceiptPrinterEncoder({
    language: 'esc-pos',
    columns,
    newline: '\n',
    autoFlush: false,
  })

  // Separadores
  const sep = '='.repeat(columns)
  const dash = '-'.repeat(columns)

  // Cabeçalho
  encoder
    .initialize()
    .align('center')
    .bold(true)
    .line(receipt.storeName || 'MINHA LOJA')
    .bold(false)

  if (receipt.storeAddress) {
    encoder.line(receipt.storeAddress)
  }

  encoder
    .line(sep)
    .align('left')
    .line(`Data: ${receipt.date}`)
    .line(`Venda: #${receipt.saleId}`)
    .line(`Operador: ${receipt.operator}`)
    .line(`Cliente: ${receipt.customerName}`)
    .line(`Pagamento: ${receipt.paymentMethod.toUpperCase()}`)
    .line(dash)

  // Cabeçalho da tabela
  const qtyW = 4
  const priceW = 10
  const nameW = columns - qtyW - priceW - 2

  encoder
    .bold(true)
    .line(
      'QTD'.padEnd(qtyW) +
      ' ' +
      'PRODUTO'.padEnd(nameW) +
      ' ' +
      'SUBTOTAL'.padStart(priceW)
    )
    .bold(false)
    .line(dash)

  // Itens
  for (const item of receipt.items) {
    const qty = String(item.quantity).padEnd(qtyW)
    const name = item.name.substring(0, nameW).padEnd(nameW)
    const price = item.subtotal.toFixed(2).padStart(priceW)
    encoder.line(`${qty} ${name} ${price}`)
  }

  // Total
  encoder
    .line(dash)
    .bold(true)
    .align('right')
    .line(`TOTAL: Mt ${receipt.total.toFixed(2)}`)
    .bold(false)
    .line(sep)

  // Rodapé
  encoder
    .align('center')
    .line('Obrigado pela preferência!')
    .newline()
    .newline()
    .newline()
    .cut()

  return encoder.encode()
}

/**
 * Constrói o HTML do recibo para impressão via window.print() ou PDF
 */
export function buildHtmlReceipt(receipt: ReceiptData): string {
  const itemsHtml = receipt.items
    .map(
      (item) => `
    <tr>
      <td style="text-align:left">${item.quantity}</td>
      <td style="text-align:left">${item.name}</td>
      <td style="text-align:right">Mt ${item.unitPrice.toFixed(2)}</td>
      <td style="text-align:right">Mt ${item.subtotal.toFixed(2)}</td>
    </tr>`
    )
    .join('')

  return `
    <div class="receipt-58mm" style="font-family:monospace;font-size:12px;width:58mm;padding:4mm;margin:0 auto;">
      <div style="text-align:center;margin-bottom:8px;">
        <strong style="font-size:14px;">${receipt.storeName || 'MINHA LOJA'}</strong><br/>
        ${receipt.storeAddress ? `${receipt.storeAddress}<br/>` : ''}
        <span style="border-top:1px solid #000;border-bottom:1px solid #000;display:block;margin:4px 0;padding:2px 0;">RECIBO DE VENDA</span>
      </div>
      <div style="margin-bottom:6px;font-size:11px;">
        Data: ${receipt.date}<br/>
        Venda: #${receipt.saleId}<br/>
        Operador: ${receipt.operator}<br/>
        Cliente: ${receipt.customerName}<br/>
        Pagamento: ${receipt.paymentMethod.toUpperCase()}
      </div>
      <table style="width:100%;font-size:11px;border-collapse:collapse;">
        <thead>
          <tr style="border-top:1px dashed #000;border-bottom:1px dashed #000;">
            <th style="text-align:left;padding:2px 0;">QTD</th>
            <th style="text-align:left;padding:2px 0;">ITEM</th>
            <th style="text-align:right;padding:2px 0;">UNIT</th>
            <th style="text-align:right;padding:2px 0;">SUB</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px;text-align:right;font-weight:bold;font-size:13px;">
        TOTAL: Mt ${receipt.total.toFixed(2)}
      </div>
      <div style="text-align:center;margin-top:8px;font-size:10px;border-top:1px solid #000;padding-top:4px;">
        Obrigado pela preferência!
      </div>
    </div>
  `
}
