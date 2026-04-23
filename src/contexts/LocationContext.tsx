import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { PermissionModal } from "@/components/dashboard/PermissionModal";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  /** "granted" | "denied" | "prompt" | "unknown" */
  status: "granted" | "denied" | "prompt" | "unknown";
  coords: LocationCoords | null;
  /** Trigger the native/browser permission request */
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
  const [showModal, setShowModal] = useState(false);

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

  // Show the pre-permission modal once if status is "prompt" and we haven't asked before
  useEffect(() => {
    if (status === "prompt" && !localStorage.getItem(ASKED_KEY)) {
      const timer = setTimeout(() => setShowModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const requestLocation = useCallback((): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
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

  const handleModalContinue = async () => {
    setShowModal(false);
    await requestLocation();
  };

  const handleModalDismiss = () => {
    setShowModal(false);
    localStorage.setItem(ASKED_KEY, "true");
  };

  return (
    <LocationContext.Provider value={{ status, coords, requestLocation }}>
      {children}
      <PermissionModal
        open={showModal}
        type="location"
        onContinue={handleModalContinue}
        onDismiss={handleModalDismiss}
      />
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within LocationProvider");
  return context;
}
