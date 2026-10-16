import { NativeModule, requireOptionalNativeModule } from 'expo';

export type PairedDevice = { name: string; address: string };

declare class ChakulaPrinterModule extends NativeModule {
  pairedDevicesAsync(): Promise<PairedDevice[]>;
  printAsync(address: string, data: Uint8Array): Promise<void>;
  disconnectAsync(): Promise<void>;
}

// Null on web, iOS and kitchen APKs built before printing was added (OTA updates still run there).
export default requireOptionalNativeModule<ChakulaPrinterModule>('ChakulaPrinter');
