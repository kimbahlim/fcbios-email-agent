// Regression tests for parsePackStructure in src/googleSheets.js
// Run with: node tests/test-pack-parser.js
//
// Background: commit 44f7089 (May 5 2026) added _has_pack_pricing to block
// fabricated pack pricing for items like the Hitachi sample cup. That fix was
// too broad — it also blocked legitimate decimal-stock items (e.g. DispoZ
// inoculating loops, TARSONS empty tip boxes) where pack structure was clearly
// stated in the description but no Bag Price column existed.
//
// parsePackStructure() reads the description string and returns parsed pack/case
// structure when present. The case_only flag from checkStock still gates whether
// the agent actually QUOTES loose pack pricing — the parser only describes
// physical structure.

const { parsePackStructure } = require('../src/googleSheets');

const cases = [
  // Should parse — decimal-stock items SHOULD get loose pack pricing
  { desc: "Cell Spreader L Type, E.O Sterile, 10pcs/zipbag, 500/pack, 5000/case", expectPacksPerCase: 10 },
  { desc: "162mm, 3mL Polyethylene Transfer Pipette, 500pcs/box, 5000/case", expectPacksPerCase: 10 },
  { desc: "Swab Rayon - PS shaft, Plain, Sterile in dia.16x150mm Tube, Labelled, 100/pack, 2000/case", expectPacksPerCase: 20 },
  { desc: "60mL, PP Specimen Container with Label, Yellow Cap(PE), Sterile, 20/pack, 500/case", expectPacksPerCase: 25 },
  { desc: "200uL, PP Tips, Bulk, Yellow, Eppendorf Type, 1000/pack, 30,000/case", expectPacksPerCase: 30 },
  { desc: "30mL Stool Container with Spoon, Sterile, Labelled, PS, dia.25x80mm, 50/pack, 500/case", expectPacksPerCase: 10 },
  { desc: "PP Embedding Cassette, Bulk, White, 250/pack, 2500/case", expectPacksPerCase: 10 },
  { desc: "Test Tube, 12x75mm, 5mL, PP, 500/bag, 5000/case", expectPacksPerCase: 10 },
  { desc: "1uL + Needle Tip Inoculating Loops, Sterile, 10pcs/bag, 100bags/box, 6boxes/case", expectPacksPerCase: 6 },

  // Critical edge case — Hitachi sample cup IS parseable. case_only flag (whole-number stock)
  // is what stops misuse, NOT the parser. Parser correctly parses; downstream gating handles the rest.
  { desc: "3mL, PS Sample Cups, Hitachi 7150, 7060 Series, 500/pack, 5000/case", expectPacksPerCase: 10 },

  // Should NOT parse — no clear pack/case structure
  { desc: "90mm Petri Dish (Selangor/WP price: RM190, West MY: RM202, East MY: RM206)", expectPacksPerCase: null },
  { desc: "Empty Tip Box 96 Place (Universal) 1000ul", expectPacksPerCase: null },
  { desc: "", expectPacksPerCase: null },
  { desc: null, expectPacksPerCase: null },

  // Tricky — single product has internal qty but no pack/case structure
  { desc: "1.5mL, PP Microtube, Eppendorf Type, 500/pack, 10,000/case", expectPacksPerCase: 20 },
];

console.log('=== PACK STRUCTURE PARSER TESTS ===\n');
let pass = 0;
let fail = 0;
for (const tc of cases) {
  const result = parsePackStructure(tc.desc);
  const actual = result ? result.packs_per_case : null;
  const ok = actual === tc.expectPacksPerCase;
  if (ok) pass++; else fail++;
  console.log(`${ok ? '✓' : '✗'} expect=${tc.expectPacksPerCase} got=${actual}  ${result ? '['+result.pattern+']' : '[no match]'}`);
  console.log(`    "${(tc.desc || '').substring(0, 80)}"`);
}
console.log(`\n${pass}/${pass+fail} passed`);
process.exit(fail > 0 ? 1 : 0);
