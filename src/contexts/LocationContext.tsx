import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  status: "granted" | "denied" | "prompt" | "unknown";
  coords: LocationCoords | null;
  requestLocation: () => Promise<GeolocationPosition | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const ASKED_KEY = "hth_location_asked";
const LEGACY_COORDS_KEY = "hth_location_coords";
const LAST_AUTO_ZIP_KEY = "hth_last_auto_zip_at";

async function reverseGeocodeToZip(lat: number, lon: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.countryCode && j.countryCode !== "US") return null;
    const zip = (j?.postcode as string | undefined)?.trim().slice(0, 5);
    if (zip && /^\d{5}$/.test(zip)) return zip;
    return null;
  } catch {
    return null;
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const { user, profile, refreshProfile } = useAuth() as any;
  const syncingRef = useRef(false);

  useEffect(() => {
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

  const requestLocation = useCallback((): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
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

  // Auto-fetch coords when permission is already granted (silent, no prompt)
  useEffect(() => {
    if (status !== "granted" || coords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, [status, coords]);

  // Auto-sync detected ZIP to profile when it changes
  useEffect(() => {
    if (!user || !coords) return;
    if (syncingRef.current) return;

    // Throttle to once per hour
    try {
      const last = Number(localStorage.getItem(LAST_AUTO_ZIP_KEY) || "0");
      if (Date.now() - last < 60 * 60 * 1000) return;
    } catch {}

    syncingRef.current = true;
    (async () => {
      const zip = await reverseGeocodeToZip(coords.latitude, coords.longitude);
      if (zip && zip !== profile?.zip_code) {
        const { error } = await supabase
          .from("profiles")
          .update({ zip_code: zip })
          .eq("user_id", user.id);
        if (!error) {
          try { localStorage.setItem(LAST_AUTO_ZIP_KEY, String(Date.now())); } catch {}
          try { await refreshProfile?.(); } catch {}
        }
      } else if (zip) {
        try { localStorage.setItem(LAST_AUTO_ZIP_KEY, String(Date.now())); } catch {}
      }
      syncingRef.current = false;
    })();
  }, [user, coords, profile?.zip_code, refreshProfile]);

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
