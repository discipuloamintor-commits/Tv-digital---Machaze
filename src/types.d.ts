/// <reference types="vite/client" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '@point-of-sale/receipt-printer-encoder' {
  export default class ReceiptPrinterEncoder {
    constructor(options?: any);
    initialize(): this;
    align(alignment: 'left' | 'center' | 'right'): this;
    bold(enable: boolean): this;
    line(text: string): this;
    text(text: string): this;
    newline(): this;
    cut(): this;
    encode(): Uint8Array;
  }
}
