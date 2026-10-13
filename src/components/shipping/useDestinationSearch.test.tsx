// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEBOUNCE_MS, useDestinationSearch } from "./useDestinationSearch";

const option = (id: string) => ({ id, label: `L${id}`, city: "C", province: "P" });
const ok = (destinations: unknown[]) =>
  new Response(JSON.stringify({ destinations, cached: false }), { status: 200 });
const fail = (code: string, status: number) =>
  new Response(JSON.stringify({ error: { code, message: `msg-${code}` } }), { status });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn(async () => ok([option("1")]));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const flush = () => act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));

describe("useDestinationSearch", () => {
  it("E3: stays idle and makes no request below 3 characters", async () => {
    const { result } = renderHook(() => useDestinationSearch("ba "));
    await flush();
    expect(result.current.status).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("E4-AC1: waits 300 ms before calling the API, then returns options", async () => {
    const { result } = renderHook(() => useDestinationSearch("ban"));
    expect(result.current.status).toBe("loading");
    await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/shipping/destinations?q=ban");
    expect(result.current.status).toBe("ready");
    expect(result.current.options).toHaveLength(1);
  });

  it("collapses fast typing into a single request", async () => {
    const { rerender } = renderHook(({ q }) => useDestinationSearch(q), {
      initialProps: { q: "ban" },
    });
    await act(() => vi.advanceTimersByTimeAsync(100));
    rerender({ q: "band" });
    await act(() => vi.advanceTimersByTimeAsync(100));
    rerender({ q: "bandu" });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=bandu");
  });

  it("E26: ignores a stale response that resolves after a newer query", async () => {
    let resolveFirst: (r: Response) => void = () => {};
    fetchMock
      .mockImplementationOnce(() => new Promise<Response>((r) => (resolveFirst = r)))
      .mockImplementationOnce(async () => ok([option("2")]));
    const { result, rerender } = renderHook(({ q }) => useDestinationSearch(q), {
      initialProps: { q: "ban" },
    });
    await flush();
    rerender({ q: "bandung" });
    await flush();
    await act(async () => resolveFirst(ok([option("stale")])));
    expect(result.current.options.map((o) => o.id)).toEqual(["2"]);
  });

  it("reports an empty result", async () => {
    fetchMock.mockImplementationOnce(async () => ok([]));
    const { result } = renderHook(() => useDestinationSearch("zzz"));
    await flush();
    expect(result.current.status).toBe("empty");
  });

  it("E6: surfaces the error code and message from the API", async () => {
    fetchMock.mockImplementationOnce(async () => fail("QUOTA_EXCEEDED", 429));
    const { result } = renderHook(() => useDestinationSearch("ban"));
    await flush();
    expect(result.current.status).toBe("error");
    expect(result.current.errorCode).toBe("QUOTA_EXCEEDED");
    expect(result.current.message).toBe("msg-QUOTA_EXCEEDED");
  });

  it("offline: a network failure becomes a friendly error, not an exception", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useDestinationSearch("ban"));
    await flush();
    expect(result.current.status).toBe("error");
    expect(result.current.message).toMatch(/koneksi/i);
  });

  it("an HTML or garbage error body still yields a generic error", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("<html>", { status: 502 }));
    const { result } = renderHook(() => useDestinationSearch("ban"));
    await flush();
    expect(result.current.status).toBe("error");
    expect(result.current.errorCode).toBe("UPSTREAM_ERROR");
  });
});
