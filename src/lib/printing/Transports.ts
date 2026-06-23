// Transportes de impressão — conectam e enviam bytes para a impressora

import type { PrinterDevice } from './PrinterConfig'

/**
 * Interface que todos os transportes implementam
 */
export interface PrintTransport {
  isSupported(): boolean
  connect(device?: PrinterDevice): Promise<void>
  send(data: Uint8Array): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
}

// ============================================================
// 1. Web Bluetooth Transport (BLE)
// ============================================================
export class BluetoothTransport implements PrintTransport {
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private connected = false

  isSupported(): boolean {
    return 'bluetooth' in navigator
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) throw new Error('Web Bluetooth não suportado neste navegador')

    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455']
    })

    const server = await this.device.gatt!.connect()

    // Tenta encontrar o serviço de impressão (UUIDs comuns para impressoras térmicas)
    const serviceUUIDs = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
    ]

    let service: BluetoothRemoteGATTService | null = null
    for (const uuid of serviceUUIDs) {
      try {
        service = await server.getPrimaryService(uuid)
        if (service) break
      } catch {
        continue
      }
    }

    if (!service) {
      // Fallback: tenta pegar todos os serviços
      const services = await server.getPrimaryServices()
      if (services.length > 0) service = services[0]
    }

    if (!service) throw new Error('Serviço de impressão não encontrado no dispositivo BLE')

    const characteristics = await service.getCharacteristics()
    // Procura a característica que aceita escrita
    this.characteristic = characteristics.find((c: any) =>
      c.properties.write || c.properties.writeWithoutResponse
    ) || null

    if (!this.characteristic) throw new Error('Característica de escrita não encontrada')

    this.connected = true
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error('Impressora BLE não conectada')

    // Envia em blocos de 20 bytes (limite BLE)
    const chunkSize = 20
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk)
      } else {
        await this.characteristic.writeValueWithResponse(chunk)
      }
      // Pequeno delay entre chunks para estabilidade
      await new Promise(r => setTimeout(r, 30))
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.connected = false
    this.characteristic = null
    this.device = null
  }

  isConnected(): boolean {
    return this.connected && !!this.device?.gatt?.connected
  }
}

// ============================================================
// 2. Web Serial Transport (BT Classic SPP + USB Serial)
// ============================================================
export class SerialTransport implements PrintTransport {
  private port: SerialPort | null = null
  private writer: WritableStreamDefaultWriter | null = null
  private connected = false

  isSupported(): boolean {
    return 'serial' in navigator
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) throw new Error('Web Serial não suportado neste navegador')

    this.port = await (navigator as any).serial.requestPort()
    await this.port!.open({ baudRate: 9600 })

    const writable = this.port!.writable
    if (!writable) throw new Error('Porta serial não tem stream de escrita')
    this.writer = writable.getWriter()
    this.connected = true
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error('Impressora serial não conectada')
    await this.writer.write(data)
  }

  async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        this.writer.releaseLock()
        this.writer = null
      }
      if (this.port) {
        await this.port.close()
        this.port = null
      }
    } catch { /* ignore close errors */ }
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }
}

// ============================================================
// 3. WebUSB Transport
// ============================================================
export class UsbTransport implements PrintTransport {
  private device: USBDevice | null = null
  private endpointNumber = 1
  private connected = false

  isSupported(): boolean {
    return 'usb' in navigator
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) throw new Error('WebUSB não suportado neste navegador')

    this.device = await (navigator as any).usb.requestDevice({
      filters: [] // Aceita qualquer dispositivo USB
    })

    await this.device!.open()

    if (this.device!.configuration === null) {
      await this.device!.selectConfiguration(1)
    }

    const iface = this.device!.configuration!.interfaces[0]
    await this.device!.claimInterface(iface.interfaceNumber)

    // Encontra o endpoint OUT (bulk transfer)
    const endpoint = iface.alternate.endpoints.find(
      (ep: any) => ep.direction === 'out' && ep.type === 'bulk'
    )
    if (endpoint) {
      this.endpointNumber = endpoint.endpointNumber
    }

    this.connected = true
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.device) throw new Error('Impressora USB não conectada')
    await this.device.transferOut(this.endpointNumber, data.buffer as ArrayBuffer)
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device) {
        await this.device.close()
        this.device = null
      }
    } catch { /* ignore */ }
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }
}

// ============================================================
// 4. Browser Transport (window.print + PDF fallback)
// ============================================================
export class BrowserTransport implements PrintTransport {
  private connected = false

  isSupported(): boolean {
    return true // Sempre disponível
  }

  async connect(): Promise<void> {
    this.connected = true
  }

  async send(_data: Uint8Array): Promise<void> {
    // Este transporte não envia bytes ESC/POS.
    // O PrinterService.ts chamará diretamente printViaBrowser() ao invés de send().
    // Aqui é um no-op de segurança.
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }
}
