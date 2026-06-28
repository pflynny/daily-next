"use client";

import { useEffect, useState } from "react";

interface Cache {
  price: number;
  ts: number;
}
let cache: Cache | null = null;
const TTL = 5 * 60 * 1000;

async function fetchPrice(signal: AbortSignal): Promise<number> {
  const [btcRes, fxRes] = await Promise.all([
    fetch("https://cryptoprices.cc/BTC/", { signal }),
    fetch("https://open.er-api.com/v6/latest/USD", { signal }),
  ]);
  if (!btcRes.ok || !fxRes.ok) throw new Error("Price unavailable");
  const [btcText, fx] = await Promise.all([btcRes.text(), fxRes.json()]);
  const usd = Number.parseFloat(btcText);
  const gbp = fx?.rates?.GBP;
  if (!Number.isFinite(usd) || !gbp) throw new Error("Price unavailable");
  return usd * gbp;
}

export function useBtcPrice() {
  const [price, setPrice] = useState<number | null>(
    cache && Date.now() - cache.ts < TTL ? cache.price : null,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cache && Date.now() - cache.ts < TTL) {
      setPrice(cache.price);
      return;
    }
    const controller = new AbortController();
    let active = true;
    fetchPrice(controller.signal)
      .then((p) => {
        cache = { price: p, ts: Date.now() };
        if (active) {
          setPrice(p);
          setError(false);
        }
      })
      .catch((e) => {
        if (e?.name !== "AbortError" && active) setError(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const formatted =
    price != null
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
          maximumFractionDigits: 0,
        }).format(price)
      : null;

  return { price, formatted, error };
}
