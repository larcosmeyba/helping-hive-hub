import { Capacitor } from "@capacitor/core";

export function useIsNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
