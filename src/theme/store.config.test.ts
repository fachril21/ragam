import { describe, expect, it } from "vitest";
import { storeConfig, whatsappLink } from "./store.config";

describe("storeConfig", () => {
  it("has the fields the storefront needs", () => {
    expect(storeConfig.name).toBeTruthy();
    expect(storeConfig.whatsapp).toMatch(/^62\d{8,13}$/);
    expect(storeConfig.hours).toBeTruthy();
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link with an encoded message", () => {
    const url = whatsappLink("Halo, tanya Kaos Basic & ukuran M");
    expect(url).toBe(
      `https://wa.me/${storeConfig.whatsapp}?text=${encodeURIComponent("Halo, tanya Kaos Basic & ukuran M")}`,
    );
  });

  it("omits the text param when no message is given", () => {
    expect(whatsappLink()).toBe(`https://wa.me/${storeConfig.whatsapp}`);
  });
});
