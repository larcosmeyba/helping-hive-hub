import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

export type PermissionStatus = "granted" | "denied" | "prompt" | "unknown";

export function useLocationPermission() {
  const [status, setStatus] = useState<PermissionStatus>("unknown");
  const [showPrompt, setShowPrompt] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setStatus(result.state as PermissionStatus);
      result.onchange = () => setStatus(result.state as PermissionStatus);
    } catch {
      setStatus("unknown");
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const requestLocation = useCallback((): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setStatus("granted"); resolve(pos); },
        () => { setStatus("denied"); resolve(null); },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });
  }, []);

  return { status, showPrompt, setShowPrompt, requestLocation, checkStatus };
}

export function useCameraPermission() {
  const [status, setStatus] = useState<PermissionStatus>("unknown");
  const [showPrompt, setShowPrompt] = useState(false);

  const checkStatus = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera } = await import("@capacitor/camera");
        const perms = await Camera.checkPermissions();
        setStatus(perms.camera === "granted" ? "granted" : perms.camera === "denied" ? "denied" : "prompt");
      } catch {
        setStatus("unknown");
      }
    } else {
      try {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        setStatus(result.state as PermissionStatus);
        result.onchange = () => setStatus(result.state as PermissionStatus);
      } catch {
        setStatus("unknown");
      }
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera } = await import("@capacitor/camera");
        const result = await Camera.requestPermissions({ permissions: ["camera"] });
        const granted = result.camera === "granted";
        setStatus(granted ? "granted" : "denied");
        return granted;
      } catch {
        setStatus("denied");
        return false;
      }
    }
    // Web: actually trigger the browser permission prompt by requesting a
    // camera stream. Without this call, the browser only prompts when something
    // later opens the camera, so any UI that reads `status` would be stale.
    // We immediately stop the resulting tracks — we only wanted the prompt.
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("denied");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setStatus("granted");
      return true;
    } catch {
      setStatus("denied");
      return false;
    }
  }, []);

  return { status, showPrompt, setShowPrompt, requestCamera, checkStatus };
}
