"use client";

import { useEffect } from "react";

const REFRESH_EVENT = "planora:workspace-refresh";

/** Notify open views that workspace data changed (e.g. quick-added task). */
export function emitWorkspaceRefresh() {
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

/** Re-run `callback` whenever another surface changes workspace data. */
export function useWorkspaceRefresh(callback: () => void) {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [callback]);
}
