"use client";

export type WalletSnapshot = { coins?: number; shards?: number };
const EVENT = "wallet:update";

/** Menyebarkan saldo terbaru yang DIKEMBALIKAN SERVER ke komponen lain (mis. wallet chip). */
export function emitWalletUpdate(snapshot: WalletSnapshot) {
  window.dispatchEvent(new CustomEvent<WalletSnapshot>(EVENT, { detail: snapshot }));
}

export function onWalletUpdate(fn: (s: WalletSnapshot) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<WalletSnapshot>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
