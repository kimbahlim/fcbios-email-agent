// Brand auto-detection from dealer email content.
// Scans email text for SKU patterns and product keywords, returns list of brand keys
// whose detailed instructions should be auto-injected into the agent's user message.
//
// Currently supports: HIMEDIA
// To add more brands: append a check below, return the BRAND key matching
// brandInstructions.js (e.g., 'TARSONS', 'DISPOZ', 'LP', etc.)

const { getBrandInstructions } = require('./brandInstructions');

function detectBrandsInEmail(emailBody) {
  const brands = new Set();
  if (!emailBody) return [];
  const text = String(emailBody);

  // ===== HIMEDIA detection =====
  // Strong signal: H05- SKU prefix OR HiMedia SKU code patterns
  // Patterns covered: M### (e.g. M011, M290), MV###, MH###, GM###, GMH###, MCD###,
  //                   GRM###, RM###, LQ###, MB###, ML###, MS###, MBT###, HTBM###,
  //                   CCK###, PCT###, AT###, FD###, OD###, PT###, PW###, SD###, SF###,
  //                   TC###, TCP###, CO###, CR###, SL###, SM###, LA###, MAP###, MF###
  const himediaSkuRegex = /\b(H05-|M\d{2,5}\b|MV\d{2,5}\b|MH\d{2,5}\b|GM\d{2,5}\b|GMH\d{2,5}\b|MCD\d{2,5}\b|GRM\d{2,5}\b|RM\d{2,5}\b|LQ\d{2,5}\b|MB\d{2,5}\b|ML\d{2,5}\b|MS\d{2,5}\b|MBT\d{2,5}\b|HTBM\d{2,5}\b|CCK\d{2,5}\b|PCT\d{2,5}\b)/i;
  // Strong signal: HiMedia by name
  const himediaNameRegex = /\bhi[\s-]?media\b|\bhimedialabs\b/i;
  // Microbiology media product keywords (very high HiMedia probability)
  const himediaProductRegex = /\b(agar|broth|peptone(?:\s+water)?|tryptone|soyabean|soybean|yeast extract|nutrient broth|macconkey|sabouraud|brain heart infusion|TSA|TSB|SCDM|SCDA|SCDLP|VRBA|VRBD|XLD|MRS|EMB|TCBS|BPW|BHI|MR-?VP|hicrome|hicynth|hipura|hipur|hiveg|chromogenic|selective agar|plate count agar|bismuth sulfite|fluid thioglycollate|baird parker|kligler|simmon|stuart|cary[\s-]?blair|rappaport|edwards|enterobacter|salmonella shigella|SS agar|EC O157|listeria|cetrimide|cled|HHD|R2A|m endo|standard methods)\b/i;
  // Chemistry / reagents (HiMedia GRM/RM/ML/MBT range)
  const himediaChemicalRegex = /\b(bradford|coomassie|BSA|bovine serum albumin|folin|biuret|lowry|BCA assay|protein (?:assay|estimation|quantitation)|MDA standard|malondialdehyde|tetramethoxypropane|TBARS|trichloroacetic|TCA|thiobarbituric|SOD enzyme|catalase enzyme|NBT|nitroblue tetrazolium|riboflavin|methionine|EDTA|tween[\s-]?\d+|polysorbate[\s-]?\d+|sodium dodecyl|SDS|phosphate buffer|glycine|tris(?:[\s-]?buffer|[\s-]?HCl|[\s-]?base)|imidazole|HEPES)\b/i;
  // Tissue culture
  const himediaTissueCultureRegex = /\b(DMEM|RPMI|fetal bovine serum|FBS|trypsin[\s-]?EDTA|gentamicin|fungizone|amphotericin|MEM|hank'?s|earle'?s|tissue culture|cell culture media)\b/i;

  if (
    himediaSkuRegex.test(text) ||
    himediaNameRegex.test(text) ||
    himediaProductRegex.test(text) ||
    himediaChemicalRegex.test(text) ||
    himediaTissueCultureRegex.test(text)
  ) {
    brands.add('HIMEDIA');
  }

  // ===== Future brands go here =====
  // if (/\bT38-|\btarsons\b/i.test(text)) brands.add('TARSONS');
  // if (/\bDZ02-|\bdispoz\b|\bdisposable petri\b/i.test(text)) brands.add('DISPOZ');
  // etc.

  return [...brands];
}

// Build the auto-injected text that gets prepended to the dealer email
function buildBrandContextBlock(brandKeys) {
  if (!brandKeys || brandKeys.length === 0) return '';
  const sections = brandKeys.map(brand => {
    const instructions = getBrandInstructions(brand);
    return `\n\n--- ${brand} brand instructions (auto-loaded based on email content) ---\n${instructions}`;
  });
  return `[BRAND-SPECIFIC RULES — AUTO-DETECTED FROM EMAIL CONTENT]
The following brand-specific rules apply to this enquiry. Read them BEFORE quoting.${sections.join('')}

[END OF BRAND-SPECIFIC RULES]

`;
}

module.exports = { detectBrandsInEmail, buildBrandContextBlock };
