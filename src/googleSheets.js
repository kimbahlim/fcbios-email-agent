const fetch = require('node-fetch');

const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

const cache = {};
const CACHE_TTL = 5 * 60 * 1000;

function clearCache() { Object.keys(cache).forEach(k => delete cache[k]); }

async function getTabData(tabName) {
  if (cache[tabName] && (Date.now() - cache[tabName].fetchedAt) < CACHE_TTL) return cache[tabName].data;
  const url = `${BASE_URL}/values/${encodeURIComponent(tabName)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error for "${tabName}": ${res.status}`);
  const json = await res.json();
  const rows = json.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => String(h || '').trim());
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
  cache[tabName] = { data, fetchedAt: Date.now() };
  return data;
}

async function searchProducts(keyword) {
  const tabs = await listBrandTabs();
  const results = [];
  const kw = keyword.toLowerCase();
  for (const tab of tabs) {
    try {
      const data = await getTabData(tab);
      const matches = data.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(kw)));
      if (matches.length > 0) results.push({ tab, matches: matches.slice(0, 10) });
    } catch (e) {}
  }
  return results;
}

async function searchBrand(brand, keyword) {
  try {
    const data = await getTabData(brand);
    const kw = keyword.toLowerCase();
    return data.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(kw))).slice(0, 20);
  } catch (e) { return []; }
}

async function checkStock(sku) {
  try {
    const data = await getTabData('Stock');
    const skuLower = sku.toLowerCase();
    const match = data.find(row => {
      const name = String(row['NAME'] || row['SKU'] || '').toLowerCase();
      return name === skuLower || name.includes(skuLower) || skuLower.includes(name);
    });
    if (!match) return { found: false, sku };
    return { found: true, sku, qty_available: parseFloat(match['AVAILABLE'] || match['Qty Available'] || '0'), uom: match['PRIMARY STOCK UNIT'] || match['UOM'] || '', brand: match['BRAND'] || '', description: match['DISPLAY NAME'] || match['Description'] || '' };
  } catch (e) { return { found: false, sku, error: e.message }; }
}

async function getLeadTime(brand) {
  try {
    const data = await getTabData('LEAD_TIMES');
    const match = data.find(row => String(row['Brand'] || '').toLowerCase().includes(brand.toLowerCase()));
    if (!match) return null;
    return { brand: match['Brand'], stocking_lead_time: match['Stocking Item Lead Time'], non_stocking_lead_time: match['Non-Stocking / Indent Lead Time'], notes: match['Notes'] };
  } catch (e) { return null; }
}

async function getNascoDealerTier(dealerName) {
  try {
    const data = await getTabData('Nasco_Tiers');
    const name = dealerName.toLowerCase();
    const match = data.find(row => String(row['Dealer Name'] || '').toLowerCase().includes(name));
    if (!match) return { found: false, tier: 'Tier 1 (<RM10K)' };
    return { found: true, dealer_name: match['Dealer Name'], sales_total: match['Sales Total'], tier: match['Tier'] };
  } catch (e) { return { found: false, tier: 'Tier 1 (<RM10K)' }; }
}

async function getPriceIncrease(brand) {
  try {
    const data = await getTabData('MASTER_INDEX');
    const match = data.find(row => String(row['Tab Name'] || '').toLowerCase().includes(brand.toLowerCase()) || String(row['Brand'] || '').toLowerCase().includes(brand.toLowerCase()));
    if (!match) return null;
    return { tab: match['Tab Name'], brand: match['Brand'], pl_year: match['PL Year'], increase: match['Increase %'], currency: match['Currency'], notes: match['Notes'] };
  } catch (e) { return null; }
}

async function checkNotForExport(productCode) {
  try {
    const data = await getTabData('HIMEDIA_Not_For_Export');
    return data.some(row => String(row['Product Code'] || '').toLowerCase() === productCode.toLowerCase());
  } catch (e) { return false; }
}

async function listBrandTabs() {
  const skip = ['MASTER_INDEX', 'PRICE_INCREASE_2026', 'HIMEDIA_Not_For_Export', 'Stock', 'Nasco_Tiers', 'LEAD_TIMES'];
  try {
    const url = `${BASE_URL}?key=${API_KEY}&fields=sheets.properties.title`;
    const res = await fetch(url);
    const json = await res.json();
    return json.sheets.map(s => s.properties.title).filter(t => !skip.includes(t));
  } catch (e) { return []; }
}

module.exports = { searchProducts, searchBrand, checkStock, getLeadTime, getNascoDealerTier, getPriceIncrease, checkNotForExport, listBrandTabs, getTabData, clearCache };
