import { useEffect, useState } from "react";

const STORAGE_KEY = "hth_show_macros";
const EVENT_NAME = "hth:show-macros-changed";

function read(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return true; // default ON
  return raw === "1";
}

/**
 * User preference: show macro pills on meal cards.
 * Persisted in localStorage; updates broadcast across components via a custom event.
 */
export function useShowMacros(): [boolean, (next: boolean) => void] {
  const [show, setShow] = useState<boolean>(read);

  useEffect(() => {
    const onChange = () => setShow(read());
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = (next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(EVENT_NAME));
    setShow(next);
  };

  return [show, update];
}
