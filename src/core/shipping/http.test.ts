import { describe, expect, it } from "vitest";
import { ShippingError } from "../integrations/rajaongkir/errors";
import { clientIp, errorResponse } from "./http";

describe("errorResponse", () => {
  it("maps a ShippingError to its status and a structured body", async () => {
    const res = errorResponse(new ShippingError("QUOTA_EXCEEDED", "habis"));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: { code: "QUOTA_EXCEEDED", message: "habis" } });
  });

  it("hides unknown errors behind a generic 500 without leaking details", async () => {
    const res = errorResponse(new Error("secret internal detail key=abc"));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("secret");
    expect(text).toContain("UPSTREAM_ERROR");
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(clientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip and then to a shared bucket", () => {
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
