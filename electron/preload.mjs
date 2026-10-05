import { contextBridge, ipcRenderer } from "electron";

/**
 * Thin bridge for Microsoft Store IAP.
 * Main process owns license probing; renderer never talks to WinRT directly.
 */
contextBridge.exposeInMainWorld("digitalLegacyStore", {
  getLicenseStatus: () => ipcRenderer.invoke("store:get-license-status"),
  /**
   * Request purchase / license refresh.
   * Returns { ok, reason } until StoreContext is wired in main.
   */
  requestProPurchase: () => ipcRenderer.invoke("store:request-pro-purchase"),
});
