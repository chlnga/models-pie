// Downloads the raw data JSONs that build-data.mjs compiles. Node port of the
// fetch logic that used to live inline in .github/workflows/deploy.yml, so the
// same code runs locally and in CI.
//
//   npm run fetch:data
//
// Writes to the repo root. pricing.json is intentionally not fetched: the
// frontend gets pricing from OpenRouter, so BenchLM pricing was unused dead
// weight.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch JSON with up to 3 attempts; validate(data) must return truthy.
async function fetchJson(url, validate) {
  const headers = { 'User-Agent': 'models-pie-ci' };
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (!validate(data)) throw new Error('response failed validation');
      return data;
    } catch (err) {
      lastErr = err;
      console.warn(`  attempt ${attempt} failed for ${url}: ${err.message}`);
      if (attempt < 3) await sleep(5000);
    }
  }
  throw new Error(`ERROR: failed to fetch ${url} (${lastErr?.message ?? lastErr})`);
}

function writeJson(file, data) {
  const json = JSON.stringify(data);
  writeFileSync(join(root, file), json);
  const kb = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`  ok  ${file} (${kb} KB)`);
}

const TARGETS = [
  {
    url: 'https://benchlm.ai/data/models.json',
    out: 'models.json',
    validate: (d) => Array.isArray(d?.items),
    report: (d) => `${d?.items?.length ?? 0} entries`,
  },
  {
    url: 'https://benchlm.ai/data/speed.json',
    out: 'speed.json',
    validate: (d) => Array.isArray(d?.items),
    report: (d) => `${d?.items?.length ?? 0} entries`,
  },
  {
    url: 'https://openrouter.ai/api/v1/models',
    out: 'openrouter-models.json',
    validate: (d) => Array.isArray(d?.data),
    report: (d) => `${d?.data?.length ?? 0} entries`,
  },
];

// Rank endpoints: project to [{id, name}] preserving ordinal position.
const RANK_TARGETS = [
  {
    url: 'https://openrouter.ai/api/v1/models?sort=throughput-high-to-low',
    out: 'speed-throughput-rank.json',
  },
  {
    url: 'https://openrouter.ai/api/v1/models?sort=latency-low-to-high',
    out: 'speed-latency-rank.json',
  },
];

console.log('Fetching raw data...');
for (const t of TARGETS) {
  const data = await fetchJson(t.url, t.validate);
  writeJson(t.out, data);
  console.log(`       ${t.report(data)}`);
}
for (const t of RANK_TARGETS) {
  const data = await fetchJson(t.url, (d) => Array.isArray(d?.data));
  const projected = (data?.data ?? []).map((m) => ({
    id: m?.id ?? '',
    name: m?.name ?? '',
  }));
  writeJson(t.out, projected);
  console.log(`       ${projected.length} ranked entries`);
}
console.log('Done.');
