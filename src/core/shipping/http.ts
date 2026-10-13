import { isShippingError } from "../integrations/rajaongkir/errors";

/** Structured error body shared by every /api/shipping route. UI picks its message by `code`. */
export function errorResponse(error: unknown): Response {
  if (isShippingError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.httpStatus },
    );
  }
  // Details stay in the server log; the client only gets a generic message.
  console.error("[shipping] unexpected error", error);
  return Response.json(
    { error: { code: "UPSTREAM_ERROR", message: "Terjadi kesalahan. Coba lagi nanti." } },
    { status: 500 },
  );
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
