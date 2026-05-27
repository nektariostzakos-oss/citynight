#!/usr/bin/env node
// Idempotent: looks up existing products by metadata.package_id before creating.
// Re-running won't duplicate; it just prints the current price IDs.

const SK = process.env.STRIPE_SECRET_KEY;
if (!SK) {
  console.error("STRIPE_SECRET_KEY env var required");
  process.exit(1);
}

async function stripe(method, path, body) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${SK}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Stripe ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return json;
}

async function findProduct(packageId) {
  const list = await stripe(
    "GET",
    `products/search?query=${encodeURIComponent(`metadata['package_id']:'${packageId}' AND active:'true'`)}`
  );
  return list.data?.[0] ?? null;
}

async function ensureProduct(spec) {
  const existing = await findProduct(spec.metadata.package_id);
  if (existing) {
    console.log(`reuse product ${existing.id} (${spec.metadata.package_id})`);
    return existing;
  }
  const created = await stripe("POST", "products", {
    name: spec.name,
    description: spec.description,
    "metadata[package_id]": spec.metadata.package_id,
  });
  console.log(`create product ${created.id} (${spec.metadata.package_id})`);
  return created;
}

async function findPriceForProduct(productId, expected) {
  const list = await stripe("GET", `prices?product=${productId}&active=true&limit=100`);
  return list.data?.find((p) => {
    if (p.currency !== expected.currency) return false;
    if (p.unit_amount !== expected.unit_amount) return false;
    if (expected.recurring) {
      return p.recurring && p.recurring.interval === expected.recurring.interval;
    }
    return p.type === "one_time";
  }) ?? null;
}

async function ensurePrice(productId, spec) {
  const existing = await findPriceForProduct(productId, spec);
  if (existing) {
    console.log(`reuse price   ${existing.id} (${spec.nickname})`);
    return existing;
  }
  const body = {
    product: productId,
    currency: spec.currency,
    unit_amount: String(spec.unit_amount),
    nickname: spec.nickname,
  };
  if (spec.recurring) body["recurring[interval]"] = spec.recurring.interval;
  const created = await stripe("POST", "prices", body);
  console.log(`create price  ${created.id} (${spec.nickname})`);
  return created;
}

// Atelier Cloud — recurring subscription, monthly + yearly prices.
const saasProd = await ensureProduct({
  name: "Atelier Cloud",
  description: "Atelier, hosted by us. Branded salon booking site, updates and uptime included.",
  metadata: { package_id: "saas" },
});
const saasMonthlyPrice = await ensurePrice(saasProd.id, {
  currency: "eur",
  unit_amount: 2900,
  nickname: "Atelier Cloud (monthly)",
  recurring: { interval: "month" },
});
const saasYearlyPrice = await ensurePrice(saasProd.id, {
  currency: "eur",
  unit_amount: 29000,
  nickname: "Atelier Cloud (yearly)",
  recurring: { interval: "year" },
});

// Atelier Self-Hosted — one-time ZIP, 1 site license.
const selfHostedProd = await ensureProduct({
  name: "Atelier Self-Hosted",
  description: "Atelier full source, self-hosted license for one site. Pay once, lifetime updates.",
  metadata: { package_id: "self-hosted" },
});
const selfHostedPrice = await ensurePrice(selfHostedProd.id, {
  currency: "eur",
  unit_amount: 14900,
  nickname: "Atelier Self-Hosted (one-time)",
});

// Atelier Agency — one-time ZIP, 5 site license + resell rights.
const agencyProd = await ensureProduct({
  name: "Atelier Agency",
  description: "Atelier full source, 5-site license with resell rights. Pay once, lifetime updates.",
  metadata: { package_id: "agency" },
});
const agencyPrice = await ensurePrice(agencyProd.id, {
  currency: "eur",
  unit_amount: 39900,
  nickname: "Atelier Agency (one-time)",
});

console.log("");
console.log("STRIPE_PRICE_SAAS_MONTHLY=" + saasMonthlyPrice.id);
console.log("STRIPE_PRICE_SAAS_YEARLY=" + saasYearlyPrice.id);
console.log("STRIPE_PRICE_SELF_HOSTED=" + selfHostedPrice.id);
console.log("STRIPE_PRICE_AGENCY=" + agencyPrice.id);
