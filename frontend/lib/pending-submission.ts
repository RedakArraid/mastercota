"use client";

import { useEffect, useRef, useState } from "react";

type Submission<T> = { request_id: string; payload: T };

/** Preserve a write across reloads and lost responses until the server confirms it. */
export function usePendingSubmission<T>(key: string | null) {
  const current = useRef<Submission<T> | null>(null);
  const [pending, setPending] = useState<Submission<T> | null>(null);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  useEffect(() => {
    let value: Submission<T> | null = null;
    if (key) {
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) value = JSON.parse(stored);
      } catch { /* Private browsing: retries remain protected in this page. */ }
    }
    current.current = value;
    setPending(value);
    setReadyKey(key);
  }, [key]);

  function begin(payload: T): Submission<T> {
    if (current.current) return current.current;
    const value = { request_id: crypto.randomUUID(), payload };
    current.current = value;
    if (key) {
      try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* See above. */ }
    }
    setPending(value);
    return value;
  }
  function clear() {
    current.current = null;
    if (key) {
      try { sessionStorage.removeItem(key); } catch { /* See above. */ }
    }
    setPending(null);
  }
  return { pending, begin, clear, ready: key !== null && readyKey === key };
}
