/**
 * Services offered to retail customers. RajaOngkir also returns cargo and special-goods
 * services (JNE JTR/SPS, SiCepat GOKIL, PAKETPOS DANGEROUS/VALUABLE GOODS, POS KARGO) that are
 * priced for freight and must not appear in a fashion checkout (spike 2026-10-10, E12).
 */
const ALLOWED: Record<string, readonly string[]> = {
  jne: ["REG", "YES", "OKE"],
  jnt: ["EZ", "REG"],
  sicepat: ["REG", "BEST", "HALU"],
  pos: ["Pos Reguler", "Pos Nextday"],
};

export function isRetailService(courier: string, service: string): boolean {
  return (ALLOWED[courier] ?? []).some((s) => s.toLowerCase() === service.trim().toLowerCase());
}
