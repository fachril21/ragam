"use client";

import { useEffect, useState } from "react";

export const DEBOUNCE_MS = 300;
export const MIN_QUERY_LENGTH = 3;

export interface DestinationItem {
  id: string;
  label: string;
  city: string;
  province: string;
}

type Settled =
  | { query: string; status: "ready" | "empty"; options: DestinationItem[] }
  | { query: string; status: "error"; errorCode: string; message: string };

export interface DestinationSearchState {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  options: DestinationItem[];
  errorCode?: string;
  message?: string;
}

const NETWORK_MESSAGE = "Periksa koneksi internet lalu coba lagi.";
const GENERIC_MESSAGE = "Pencarian tujuan sedang bermasalah.";

async function readError(response: Response): Promise<{ code: string; message: string }> {
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  return {
    code: body?.error?.code ?? "UPSTREAM_ERROR",
    message: body?.error?.message ?? GENERIC_MESSAGE,
  };
}

/**
 * Debounced destination autocomplete. Requests start 300 ms after the last keystroke, only for
 * 3+ characters, and a newer query aborts the older request so stale answers are never shown.
 */
export function useDestinationSearch(query: string): DestinationSearchState {
  const trimmed = query.trim();
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/shipping/destinations?q=${encodeURIComponent(trimmed)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          const { code, message } = await readError(response);
          if (!controller.signal.aborted) {
            setSettled({ query: trimmed, status: "error", errorCode: code, message });
          }
          return;
        }
        const body = (await response.json()) as { destinations?: DestinationItem[] };
        if (controller.signal.aborted) return;
        const options = body.destinations ?? [];
        setSettled({ query: trimmed, status: options.length ? "ready" : "empty", options });
      } catch {
        if (controller.signal.aborted) return;
        setSettled({
          query: trimmed,
          status: "error",
          errorCode: "NETWORK",
          message: NETWORK_MESSAGE,
        });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  if (trimmed.length < MIN_QUERY_LENGTH) return { status: "idle", options: [] };
  if (!settled || settled.query !== trimmed) return { status: "loading", options: [] };
  if (settled.status === "error") {
    return { status: "error", options: [], errorCode: settled.errorCode, message: settled.message };
  }
  return { status: settled.status, options: settled.options };
}
