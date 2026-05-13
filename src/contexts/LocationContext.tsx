import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  /** "granted" | "denied" | "prompt" | "unknown" */
  status: "granted" | "denied" | "prompt" | "unknown";
  coords: LocationCoords | null;
  /** Trigger the native/OS permission request directly (no custom pre-prompt). */
  requestLocation: () => Promise<GeolocationPosition | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const ASKED_KEY = "hth_location_asked";
// Legacy key removed for security (H2). We clear it on mount to scrub stored coordinates.
const LEGACY_COORDS_KEY = "hth_location_coords";

export function LocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  // H2: coords live only in memory for the session. They are NOT persisted.
  const [coords, setCoords] = useState<LocationCoords | null>(null);

  useEffect(() => {
    // Scrub any plaintext coords saved by older versions
    try { localStorage.removeItem(LEGACY_COORDS_KEY); } catch {}

    (async () => {
      if (!navigator.geolocation) {
        setStatus("denied");
        return;
      }

      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        setStatus(result.state as "granted" | "denied" | "prompt");
        result.onchange = () => setStatus(result.state as "granted" | "denied" | "prompt");
      } catch {
        setStatus("unknown");
      }
    })();
  }, []);

  /**
   * Calls the native/OS geolocation API directly. On iOS (Capacitor or Safari) and
   * Android this surfaces the system permission dialog — no custom in-app prompt.
   */
  const requestLocation = useCallback((): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Only kept in memory — never persisted.
          setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setStatus("granted");
          localStorage.setItem(ASKED_KEY, "true");
          resolve(pos);
        },
        () => {
          setStatus("denied");
          localStorage.setItem(ASKED_KEY, "true");
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });
  }, []);

  return (
    <LocationContext.Provider value={{ status, coords, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within LocationProvider");
  return context;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within LocationProvider");
  return context;
}
