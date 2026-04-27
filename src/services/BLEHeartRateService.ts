/**
 * BLEHeartRateService
 *
 * Integrates with Bluetooth Low Energy heart rate monitors (Polar, Garmin, etc.)
 * using the standard Web Bluetooth API (GATT Heart Rate service – UUID 0x180D).
 *
 * Usage:
 *   const svc = new BLEHeartRateService(onHR, onDisconnect);
 *   await svc.connect();
 *   svc.disconnect();
 *
 * Only available in Chromium-based browsers over HTTPS or localhost.
 */

export type HRPayload = {
  bpm: number;
  /** Contact status: true = sensor is touching skin, null = not reported */
  contact: boolean | null;
};

export type BLEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Minimal type shims for Web Bluetooth API (not in standard DOM typings)
type BLEDevice = {
  name?: string;
  gatt?: { connected: boolean; connect(): Promise<BLEGATTServer>; disconnect(): void };
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};
type BLEGATTServer = {
  getPrimaryService(service: number): Promise<BLEGATTService>;
};
type BLEGATTService = {
  getCharacteristic(char: number): Promise<BLECharacteristic>;
};
type BLECharacteristic = {
  value: DataView | null;
  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
};

// Standard GATT UUIDs
const HEART_RATE_SERVICE = 0x180d;
const HEART_RATE_MEASUREMENT_CHAR = 0x2a37;

export function isBLESupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'bluetooth' in navigator &&
    // Web Bluetooth requires a secure context (https or localhost)
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  );
}

export class BLEHeartRateService {
  private device: BLEDevice | null = null;
  private characteristic: BLECharacteristic | null = null;
  private onHR: (payload: HRPayload) => void;
  private onStateChange: (state: BLEConnectionState) => void;

  constructor(
    onHR: (payload: HRPayload) => void,
    onStateChange: (state: BLEConnectionState) => void,
  ) {
    this.onHR = onHR;
    this.onStateChange = onStateChange;
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleNotification = this.handleNotification.bind(this);
  }

  /** Request a nearby HR sensor and start streaming data. */
  async connect(): Promise<void> {
    if (!isBLESupported()) {
      throw new Error('Web Bluetooth no está disponible en este navegador o no es un contexto seguro.');
    }

    this.onStateChange('connecting');

    try {
      // Access Web Bluetooth via type assertion — types are not in standard DOM lib
      const bluetooth = (navigator as unknown as { bluetooth: {
        requestDevice(opts: { filters: Array<{ services: number[] }>; optionalServices?: number[] }): Promise<BLEDevice>;
      } }).bluetooth;

      this.device = await bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: [HEART_RATE_SERVICE],
      });

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);

      const server = await this.device.gatt!.connect();
      const service = await server.getPrimaryService(HEART_RATE_SERVICE);
      this.characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT_CHAR);

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotification);

      this.onStateChange('connected');
    } catch (err) {
      // User cancelled the picker or connection failed
      this.cleanup();
      if (err instanceof Error && err.name === 'NotFoundError') {
        // User dismissed the browser picker — treat as graceful cancel, not error
        this.onStateChange('disconnected');
      } else {
        this.onStateChange('error');
        throw err;
      }
    }
  }

  /** Gracefully disconnect and stop streaming. */
  disconnect(): void {
    this.cleanup();
    this.onStateChange('disconnected');
  }

  /** Device name shown after successful pairing. */
  get deviceName(): string | null {
    return this.device?.name ?? null;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private handleDisconnect(): void {
    this.cleanup();
    this.onStateChange('disconnected');
  }

  /**
   * Parse Heart Rate Measurement characteristic value (Bluetooth spec Vol 3 Part G).
   * Byte 0: flags
   *   bit 0 = 0 → HR value is uint8 at byte 1
   *   bit 0 = 1 → HR value is uint16 at bytes 1-2
   *   bit 1 = sensor contact feature present
   *   bit 2 = sensor contact status (1 = detected)
   */
  private handleNotification(event: Event): void {
    const target = event.target as unknown as BLECharacteristic;
    const value = target.value;
    if (!value) return;

    const flags = value.getUint8(0);
    const hrFormat16 = (flags & 0x01) !== 0;
    const contactPresent = (flags & 0x02) !== 0;
    const contactDetected = (flags & 0x04) !== 0;

    const bpm = hrFormat16 ? value.getUint16(1, true) : value.getUint8(1);
    const contact = contactPresent ? contactDetected : null;

    if (bpm > 0 && bpm < 300) {
      this.onHR({ bpm, contact });
    }
  }

  private cleanup(): void {
    if (this.characteristic) {
      try {
        this.characteristic.removeEventListener('characteristicvaluechanged', this.handleNotification);
        this.characteristic.stopNotifications().catch(() => {});
      } catch { /* ignore */ }
      this.characteristic = null;
    }
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect);
      if (this.device.gatt?.connected) {
        try { this.device.gatt.disconnect(); } catch { /* ignore */ }
      }
    }
    this.device = null;
  }
}
