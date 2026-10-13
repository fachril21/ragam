// Spike E4-AC0: probe RajaOngkir (Komerce) v1. Run: node --env-file=.env.local scripts/spike/rajaongkir.mjs <step>
// Costs real quota (100 hit/day on Starter). Never prints the API key.
const base = process.env.RAJAONGKIR_BASE_URL.replace(/\/?$/, "/");
const key = process.env.RAJAONGKIR_API_KEY;

async function call(method, path, params) {
  const url = new URL(path, base);
  const init = { method, headers: { key } };
  if (method === "GET" && params)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (method === "POST") {
    init.headers["content-type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(params).toString();
  }
  const t0 = performance.now();
  const res = await fetch(url, init);
  const ms = Math.round(performance.now() - t0);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 300);
  }
  return { status: res.status, ms, json };
}

const [, , step, ...args] = process.argv;
const out = (o) => console.log(JSON.stringify(o, null, 1).slice(0, 3500));
if (step === "search")
  out(
    await call("GET", "destination/domestic-destination", {
      search: args[0],
      limit: args[1] ?? "5",
      offset: "0",
    }),
  );
if (step === "cost")
  out(
    await call("POST", "calculate/domestic-cost", {
      origin: args[0],
      destination: args[1],
      weight: args[2] ?? "1000",
      courier: args[3] ?? "jne:jnt:sicepat:pos",
      price: "lowest",
    }),
  );
if (step === "track")
  out(
    await call("POST", "track/waybill", {
      awb: args[0],
      courier: args[1],
      last_phone_number: args[2] ?? "",
    }),
  );
