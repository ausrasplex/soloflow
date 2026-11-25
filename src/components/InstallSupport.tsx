'use client';
import { useEffect } from 'react';

// Registers the service worker that makes SoloFlow installable and shows a friendly page when the server is
// unreachable. Browsers only allow this on HTTPS or localhost; elsewhere it quietly does nothing.
export default function InstallSupport() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}
