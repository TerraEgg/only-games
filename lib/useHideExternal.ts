"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "og_hide_external";

export function getHideExternal(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function useHideExternal() {
  const [hide, setHideState] = useState(false);

  useEffect(() => {
    setHideState(getHideExternal());
  }, []);

  const setHide = useCallback((value: boolean) => {
    setHideState(value);
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    window.dispatchEvent(new Event("hide-external-changed"));
  }, []);

  // Listen for changes from other components
  useEffect(() => {
    function onChanged() {
      setHideState(getHideExternal());
    }
    window.addEventListener("hide-external-changed", onChanged);
    return () => window.removeEventListener("hide-external-changed", onChanged);
  }, []);

  return { hideExternal: hide, setHideExternal: setHide };
}
