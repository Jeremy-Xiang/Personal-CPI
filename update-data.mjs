// update-data.mjs
// Pulls latest CPI 12-month percent changes from the BLS public API v2
// and writes data.json next to index.html. Run before each deploy:
//
//   node update-data.mjs
//
// No API key needed for <=25 series / 10y window, but unregistered use is
// capped at 25 requests/day. Register at https://data.bls.gov/registrationEngine/
// and set BLS_API_KEY for higher limits.

import { writeFileSync } from "node:fs";

const SERIES = [
  { series: "CUUR0000SA0",     name: "Headline CPI-U" },
  { series: "CUUR0000SEHA",    name: "Rent" },
  { series: "CUUR0000SAF11",   name: "Groceries" },
  { series: "CUUR0000SEFV",    name: "Dining out" },
  { series: "CUUR0000SETB01",  name: "Gasoline" },
  { series: "CUUR0000SEHF01",  name: "Electricity" },
  { series: "CUUR0000SEED",    name: "Phone & internet" },
  { series: "CUUR0000SEEB01",  name: "Tuition & fees" },
  { series: "CUUR0000SAM",     name: "Medical care" },
  { series: "CUUR0000SETE",    name: "Car insurance" },
  { series: "CUUR0000SAA",     name: "Clothing" },
  { series: "CUUR0000SAR",     name: "Recreation" },
  { series: "CUUR0000SETG01",  name: "Airfare" },
];

const year = new Date().getFullYear();
const body = {
  seriesid: SERIES.map(s => s.series),
  startyear: String(year - 2),
  endyear: String(year),
};
if (process.env.BLS_API_KEY) body.registrationkey = process.env.BLS_API_KEY;

const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const json = await res.json();
if (json.status !== "REQUEST_SUCCEEDED") {
  console.error("BLS API error:", JSON.stringify(json.message ?? json, null, 2));
  process.exit(1);
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
let asOf = null;
const out = [];

for (const s of json.Results.series) {
  // monthly observations only (M01..M12), newest first
  const obs = s.data
    .filter(d => d.period.startsWith("M") && d.period !== "M13")
    .map(d => ({ y: +d.year, m: +d.period.slice(1), v: +d.value }))
    .sort((a, b) => b.y - a.y || b.m - a.m);

  const latest = obs[0];
  if (!latest) {
    console.warn(`skipping ${s.seriesID}: no monthly observations`);
    continue;
  }
  const prior = obs.find(d => d.y === latest.y - 1 && d.m === latest.m);
  if (!prior) {
    console.warn(`skipping ${s.seriesID}: missing 12-month pair`);
    continue;
  }
  const pct = ((latest.v / prior.v) - 1) * 100;
  const label = `${MONTHS[latest.m - 1]} ${latest.y}`;
  if (!asOf) asOf = label; // series can lag each other; stamp with the first (headline)
  out.push({ series: s.seriesID, pct: +pct.toFixed(2), latest: label });
}

const headline = out.find(o => o.series === "CUUR0000SA0");
const data = {
  asOf,
  headline: headline ? headline.pct : null,
  categories: out.filter(o => o.series !== "CUUR0000SA0"),
};

writeFileSync(new URL("./data.json", import.meta.url), JSON.stringify(data, null, 2));
console.log(`wrote data.json — headline ${data.headline}% as of ${asOf}, ${data.categories.length} categories`);
