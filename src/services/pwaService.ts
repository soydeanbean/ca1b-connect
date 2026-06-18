// src/services/pwaService.ts

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Listen for the beforeinstallprompt event
export function initPWAInstallListener(): void {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  window.addEventListener("appinstalled", () => {
    // Clear the deferred prompt
    deferredPrompt = null;
  });
}

// Check if the app is already installed (in standalone mode)
export function isAppInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

// Check if PWA can be installed (deferred prompt is available)
export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

// Trigger the install prompt
export async function installPWA(): Promise<boolean> {
  if (!deferredPrompt) return false;

  try {
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    // Clear the deferred prompt
    deferredPrompt = null;
    return outcome === "accepted";
  } catch (error) {
    console.error("PWA installation failed:", error);
    deferredPrompt = null;
    return false;
  }
}

// React hook for PWA install state
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isAppInstalled());

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    return installPWA();
  }, []);

  return { canInstall, installed, install };
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}