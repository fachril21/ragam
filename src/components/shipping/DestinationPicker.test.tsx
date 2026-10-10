// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DestinationPicker, STORAGE_KEY } from "./DestinationPicker";

const opt = (id: string, label: string) => ({ id, label, city: "BANDUNG", province: "JAWA BARAT" });
const respond = (destinations: unknown[]) =>
  new Response(JSON.stringify({ destinations }), { status: 200 });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  fetchMock = vi.fn(async () =>
    respond([opt("1", "BATUNUNGGAL, BANDUNG"), opt("2", "KUJANGSARI, BANDUNG")]),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const input = () => screen.getByRole("combobox");

/** Types a value and lets the 300 ms debounce and the mocked request settle. */
async function typeQuery(value: string) {
  fireEvent.change(input(), { target: { value } });
  await act(() => vi.advanceTimersByTimeAsync(300));
}

describe("DestinationPicker", () => {
  it("exposes combobox semantics and a labelled input", () => {
    render(<DestinationPicker onSelect={vi.fn()} />);
    const field = screen.getByRole("combobox", { name: /tujuan/i });
    expect(field).toHaveAttribute("aria-expanded", "false");
    expect(field).toHaveAttribute("aria-autocomplete", "list");
  });

  it("E3: makes no request and shows no list for fewer than 3 characters", async () => {
    render(<DestinationPicker onSelect={vi.fn()} />);
    await typeQuery("ba");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("lists options after the debounce and selects with the mouse", async () => {
    const onSelect = vi.fn();
    render(<DestinationPicker onSelect={onSelect} />);
    await typeQuery("ban");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    fireEvent.click(options[1]);
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "2" }));
    expect(input()).toHaveValue("KUJANGSARI, BANDUNG");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("E27: works with the keyboard (arrows, Enter, Escape)", async () => {
    const onSelect = vi.fn();
    render(<DestinationPicker onSelect={onSelect} />);
    await typeQuery("ban");
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(input()).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[0].id);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }));

    await typeQuery("kuj");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("E27: option rows meet the 44px touch target", async () => {
    render(<DestinationPicker onSelect={vi.fn()} />);
    await typeQuery("ban");
    for (const o of screen.getAllByRole("option")) expect(o.className).toMatch(/min-h-11/);
  });

  it("announces the empty state politely", async () => {
    fetchMock.mockImplementationOnce(async () => respond([]));
    render(<DestinationPicker onSelect={vi.fn()} />);
    await typeQuery("zzz");
    expect(screen.getByRole("status")).toHaveTextContent(/tidak ada/i);
  });

  it("E6: a quota error shows the message and a WhatsApp fallback", async () => {
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({ error: { code: "QUOTA_EXCEEDED", message: "Kuota habis" } }),
          { status: 429 },
        ),
    );
    render(<DestinationPicker onSelect={vi.fn()} />);
    await typeQuery("zzz");
    expect(screen.getByRole("alert")).toHaveTextContent(/kuota habis/i);
    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
  });

  it("E28: stores the choice and restores it after a reload", async () => {
    const { unmount } = render(<DestinationPicker onSelect={vi.fn()} />);
    await typeQuery("ban");
    fireEvent.click(screen.getAllByRole("option")[0]);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({ id: "1" });
    unmount();

    const onSelect = vi.fn();
    render(<DestinationPicker onSelect={onSelect} />);
    expect(input()).toHaveValue("BATUNUNGGAL, BANDUNG");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
  });

  it("E28: ignores corrupted stored data", () => {
    sessionStorage.setItem(STORAGE_KEY, "{not json");
    const onSelect = vi.fn();
    render(<DestinationPicker onSelect={onSelect} />);
    expect(input()).toHaveValue("");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("clears the selection when the user edits the text again", async () => {
    const onSelect = vi.fn();
    render(<DestinationPicker onSelect={onSelect} />);
    await typeQuery("ban");
    fireEvent.click(screen.getAllByRole("option")[0]);
    fireEvent.change(input(), { target: { value: "BATUNUNGGAL, BANDUNGx" } });
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
