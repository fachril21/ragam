// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RateList, rateKey, type RateOption } from "./RateList";
import { TrackingTimeline } from "./TrackingTimeline";

afterEach(cleanup);

const rate = (over: Partial<RateOption> = {}): RateOption => ({
  courier: "sicepat",
  courierName: "SiCepat",
  service: "REG",
  description: "Reguler",
  cost: 11000,
  etd: "1-2 day",
  isCheapest: false,
  ...over,
});

describe("RateList", () => {
  it("shows price, estimate and flags the cheapest option", () => {
    render(
      <RateList rates={[rate({ isCheapest: true }), rate({ courier: "jne", cost: 13000 })]} />,
    );
    expect(screen.getByText("Rp11.000")).toBeInTheDocument();
    expect(screen.getByText("Rp13.000")).toBeInTheDocument();
    expect(screen.getAllByText("Termurah")).toHaveLength(1);
  });

  it("E13: copes with a missing estimate", () => {
    render(<RateList rates={[rate({ etd: null })]} />);
    expect(screen.getByText(/estimasi tidak tersedia/i)).toBeInTheDocument();
  });

  it("E8: explains an empty result", () => {
    render(<RateList rates={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent(/belum ada layanan/i);
  });

  it("is a keyboard-operable radio group that reports the selection", () => {
    const onSelect = vi.fn();
    const a = rate();
    const b = rate({ courier: "jne", cost: 13000 });
    render(<RateList rates={[a, b]} selectedKey={rateKey(a)} onSelect={onSelect} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toBeChecked();
    fireEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith(b);
  });
});

describe("TrackingTimeline", () => {
  const tracking = {
    courier: "jne",
    awb: "R1",
    status: "ON PROCESS",
    delivered: false,
    history: [{ time: "2026-10-01 10:00", description: "Paket diterima", location: "JAKARTA" }],
  };

  it("renders the history in order", () => {
    render(<TrackingTimeline data={{ tracking }} />);
    expect(screen.getByText("Paket diterima")).toBeInTheDocument();
    expect(screen.getByText(/JAKARTA/)).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("E20: tells the customer the waybill is not available yet", () => {
    render(<TrackingTimeline data={{ tracking: null, reason: "NO_WAYBILL" }} />);
    expect(screen.getByRole("status")).toHaveTextContent(/belum tersedia/i);
  });

  it("E21: falls back to the waybill number with a copy button", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <TrackingTimeline
        data={{ tracking: null, reason: "NOT_FOUND", fallback: { courier: "jne", awb: "R1" } }}
      />,
    );
    expect(screen.getByText("R1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /salin/i }));
    expect(writeText).toHaveBeenCalledWith("R1");
    expect(await screen.findByRole("button", { name: /tersalin/i })).toBeInTheDocument();
  });

  it("shows delivered state and an empty history message", () => {
    render(<TrackingTimeline data={{ tracking: { ...tracking, delivered: true, history: [] } }} />);
    expect(screen.getByText("Terkirim")).toBeInTheDocument();
    expect(screen.getByText(/belum ada riwayat/i)).toBeInTheDocument();
  });
});
