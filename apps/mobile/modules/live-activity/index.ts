import { requireNativeModule, Platform } from 'expo-modules-core';

type LiveActivityNativeModule = {
  isSupported(): boolean;
  startCompletionActivity(
    personelAd: string,
    magazaAd: string,
    puanMetni: string,
    durationSeconds: number
  ): void;
};

function loadNativeModule(): LiveActivityNativeModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeModule('LiveActivity');
  } catch {
    // Native modül derlenmemiş (ör. Expo Go) — özellik sessizce devre dışı kalır.
    return null;
  }
}

const NativeModule: LiveActivityNativeModule | null = loadNativeModule();

/** iOS 16.2+ ve gerçek cihazda Live Activity desteği var mı? */
export function isLiveActivitySupported(): boolean {
  try {
    return NativeModule?.isSupported() ?? false;
  } catch {
    return false;
  }
}

/**
 * Dynamic Island / kilit ekranında birkaç saniyeliğine
 * "Değerlendirme Tamamlandı ✓" bildirimi gösterir.
 * Expo Go'da veya desteklenmeyen cihazlarda sessizce hiçbir şey yapmaz.
 */
export function showDegerlendirmeTamamlandi(params: {
  personelAd: string;
  magazaAd: string;
  puanMetni?: string;
  durationSeconds?: number;
}): void {
  if (!NativeModule) return;
  try {
    NativeModule.startCompletionActivity(
      params.personelAd,
      params.magazaAd,
      params.puanMetni ?? '',
      params.durationSeconds ?? 5
    );
  } catch {
    // Native modül bulunamadı (ör. Expo Go) — sessizce yok say.
  }
}
