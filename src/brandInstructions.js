// Brand-specific detailed instructions loaded on-demand via get_brand_instructions tool
// This keeps the main system prompt lean. Only loaded when the agent encounters these brands.

const BRAND_INSTRUCTIONS = {

  TOMY: `## TOMY AUTOCLAVE QUOTING — COMPLETE INSTRUCTIONS

  ## STEP 1: PRE-QUOTE (always send this FIRST before quoting)
  When a dealer asks for any TOMY autoclave (SX-500 or SX-700), you need the INSTALLATION SITE name and STATE for JKKP compliance. You MUST have BOTH pieces of info explicitly stated in the email before quoting.
  
  CHECK THE EMAIL — only skip the pre-quote if:
  - The dealer explicitly provides a site/end-user name AND a Malaysian state (e.g., "end user: Hospital ABC, Sabah" or a full address with state visible like "Universiti Malaya, Kuala Lumpur")
  - The dealer's COMPANY NAME alone is NOT sufficient as the site name — the autoclave may be installed at a different end-user location
  - A company domain (e.g., "ebsperfectlab.com") or email signature without a state does NOT count
  - If in doubt, ALWAYS send the pre-quote to ask — it is better to ask than to quote without site info
  
  Send the pre-quote email if EITHER the installation site name OR state is missing:
  
  Pre-quote email template (ONLY if site info is missing):
  "Thank you for your enquiry on the TOMY [model] autoclave.
  Before we can prepare your quotation, could you please provide the following:
  - Site/company name: (where the autoclave will be installed)
  - State: (location state)
  This is required as our engineer will need to perform the JKKP compulsory safety pressure test on site during installation together with the JKKP officer.
  Looking forward to hearing from you!"
  
  Include these links in the pre-quote:
  - TOMY brochures: https://drive.google.com/drive/folders/14Zwvt44_b4SG8dtnlGe3ZbPy7LYlMMQo
  - Do NOT include the eStore message in TOMY pre-quote emails.

  ## STEP 2: FULL QUOTATION (after dealer provides site info)
  Once dealer provides site name and state, look up the MOB fee for that state (see table below), then build the quotation.

  IMPORTANT — SINGLE TRIP: The engineer mobilizes to site ONCE. This single trip covers BOTH:
  - JKKP inspection (mandatory safety pressure test with JKKP officer)
  - Installation, commissioning & training
  Include this note in every TOMY quotation: "Engineer mobilization to site is a single trip covering both JKKP inspection and installation/commissioning/training."

  HOW TO PRESENT PRICES TO DEALER:
  - Installation & Commissioning = RM 450 (MOB waived since engineer is already on site for JKKP)
  - JKKP Inspection = 1,300 + MOB for their state = show the COMBINED TOTAL only
    Example Sabah: show "2,800" NOT "1,300 + 1,500" or "1,300 + MOB"
    Example KL: show "1,400" NOT "1,300 + 100"
  - The dealer should NEVER see the word "MOB", "+ MOB", or any MOB breakdown — just clean final prices

  ### SX-500 MANDATORY ITEMS:
  | SKU | Description | Price (MYR) |
  | T01-SX-500 | SX-500 Autoclave 58L (2 baskets included FOC) | 22,300 |
  | F07-ACA-315B | Additional Standard Basket (3rd basket for full capacity) | 700 |
  | SV-WARRANTY-1 YEAR | 1 Year Warranty | Included |
  | INSTALLATION & COMMISSIONING | Installation & Commissioning | 450 |
  | SV-ITJKKP | JKKP Inspection | [calculate: 1,300 + MOB for state] |
  | CALIBRATION | Pressure Gauge & Safety Valve (JKKP mandatory) | Inclusive |

  ### SX-700 MANDATORY ITEMS:
  | SKU | Description | Price (MYR) |
  | T01-SX-700 | SX-700 Autoclave 79L (2 baskets included FOC) | 35,000 |
  | F07-ACA-700B | Additional Standard Basket (3rd basket for full capacity) | 905 |
  | SV-WARRANTY-1 YEAR | 1 Year Warranty | Included |
  | INSTALLATION & COMMISSIONING | Installation & Commissioning | 450 |
  | SV-ITJKKP | JKKP Inspection | [calculate: 1,300 + MOB for state] |
  | CALIBRATION | Pressure Gauge & Safety Valve (JKKP mandatory) | Inclusive |

  ### MOBILIZATION (MOB) FEES BY STATE (internal reference — NEVER show to dealer):
  KL/Klang Valley/Selangor: RM 100 | Negeri Sembilan: RM 160 | Melaka: RM 300 | Perak: RM 450
  Pahang: RM 1,050 | Terengganu: RM 1,150 | Kelantan: RM 1,250 | Johor: RM 850
  Langkawi: RM 900 | P. Pinang: RM 850 | Kedah: RM 1,050 | Perlis: RM 1,150
  Sabah (KK, Labuan, Sandakan, Tawau): RM 1,500 | Labuan (combined with KK): RM 1,300
  Sarawak (Kuching, Bintulu, Miri, Sibu): RM 1,500 | Sarawak (Limbang): RM 2,500

  ### TOTAL CALCULATION:
  Total = Autoclave + Basket + 450 (installation) + (1,300 + MOB) for JKKP
  Example SX-500 KL: 22,300 + 700 + 450 + 1,400 = RM 24,850
  Example SX-700 Sabah: 35,000 + 905 + 450 + 2,800 = RM 39,155

  ### PRICING RULE: The TOMY pricelist already contains 2026 dealer prices. Do NOT apply any percentage increase. Quote exactly as shown in the pricelist. Services (installation, JKKP, MOB, delivery) are also fixed — use as-is.

  ### OPTIONAL ACCESSORIES — show as separate "Optional Accessories (Add-on)" table:
  SX-500 accessories:
  | F07-ACA-315B | Additional Standard Basket | 700 |
  | F07-SBSS-325 | Basket Support Stand | 210 |
  | F07-ACA-315T | Long Basket for Waste | 1,190 |
  | T01-599907 | Printer Module (ships separately) | 9,400 |
  | EST Charge | For government sites (if applicable) | 150 |

  SX-700 accessories:
  | F07-ACA-700B | Additional Standard Basket | 905 |
  | F07-SBSS-345 | Basket Support Stand | 210 |
  | F07-ACA-700T | Long Basket for Waste | 1,300 |
  | T01-599907 | Printer Module (ships separately) | 9,400 |
  | EST Charge | For government sites (if applicable) | 150 |

  ### DELIVERY CHARGES (for both SX-500 and SX-700):
  Peninsular Malaysia (ALL states): RM 260
  Sabah / Labuan / Sarawak: Dealer to arrange their own Collection & Delivery (do NOT quote a delivery charge — state this clearly in the quotation)

  ### KEY FEATURES — include "Why TOMY?" section in every TOMY quotation:
  - Made in Japan — superior build quality, 300+ satisfied users in Malaysia including major F&B, universities, and research institutions. DOSH/JKKP approved.
  - Top-Open Lid Design — easy one-handed operation with foot pedal, mechanically-assisted lid opening/closing, perfect height for easy loading/unloading and cleaning
  - Fast Cooling Down — built-in cooling fan saves up to 60 minutes cooling time and up to 45% power savings compared to competitors
  - Compact Design — no side clearance needed for lid, can be installed side-by-side. SX-500 fits 3 stackable baskets, 8 bottles (500mL) per basket. SX-700 fits 3 stackable baskets, 11 bottles (500mL) per basket.
  - 5 Sterilizing Courses — liquid sterilizing (prevents boiling), standard, sterilizing-warming (prevents culture media coagulation), heating-warming (dissolving media), and memory recall
  - Safety Features — water level detector, lid interlock, pressure fine adjustment, auto-variable exhaust speed (6 levels), timer function

  ### NOTES TO INCLUDE:
  - 2 standard baskets included FOC with the autoclave
  - Calibration on Pressure Gauge and Safety Valve is included as per JKKP requirements
  - Engineer mobilization to site is a single trip covering both JKKP inspection and installation/commissioning/training
  - Delivery is NOT included in the quotation total — for Peninsular Malaysia add RM 260. For Sabah/Labuan/Sarawak: state "Dealer to arrange their own Collection & Delivery"
  - Printer Module must be ordered with a separate shipment
  - Do NOT add any PO deadline for TOMY (no "Send PO by..." note). TOMY lead time comes from the LEAD_TIMES tab and is shown in the Stock Status column only.

  ### PRODUCT LINKS — include ALL of these in every TOMY quotation:
  - See the advantages of TOMY autoclave: https://www.youtube.com/watch?v=3KkahfffrOk
  - FC-BIOS TOMY collection: https://www.fcbios.com.my/collections/tomy-autoclave
  - Available Collateral (download from Google Drive): https://drive.google.com/drive/folders/14Zwvt44_b4SG8dtnlGe3ZbPy7LYlMMQo
    List these documents:
    - TOMY SX-Series Brochure — Product features and specifications
    - TOMY Autoclave Product & Accessories Brochure — Complete accessory catalog
    - Choosing The Right Autoclave — Selection guide for customers
    - TOMY Autoclave Credentials — 300+ satisfied users reference list
    - Electricity Saving & Increased Capacity Sheet — Power savings comparison

  ### IQOQPQ — ONLY quote if dealer specifically requests. If IQOQPQ is ordered, MUST include Full Calibration (CAL-2).
  IQOQPQ: RM 500 (SV-T01-AUTOCLAVE-IQOQPQ)
  CAL-2 by region: Central (KL/Sel/NS/Melaka) RM 595 | North (Penang/Kedah/Perlis/Perak) RM 895 | South (Johor) RM 895 | East (Pahang/Terengganu/Kelantan) RM 895 | Sabah RM 1,195 | Sarawak RM 1,195 | Sarawak Limbang: Upon request

  ### COMMON MISTAKES TO AVOID:
  - Do NOT quote without asking for site name/state first
  - Do NOT apply 3% increase to services (installation, JKKP, MOB, delivery)
  - Do NOT quote IQOQPQ without Full Calibration (CAL-2)
  - Do NOT forget to mention delivery is NOT included
  - Do NOT forget the 3rd basket as a mandatory line item
  - Do NOT forget to include the "Why TOMY?" features section

  ### STANDALONE ACCESSORY REQUESTS:
  When a dealer asks for TOMY autoclave accessories WITHOUT ordering the autoclave itself:
  - "basket for SS-325" or "SS-325 basket" → Quote F07-ACA-315B (Standard Basket for SX-500). SS-325 refers to the SX-500 chamber.
  - "basket for SS-345" or "SS-345 basket" → Quote F07-ACA-700B (Standard Basket for SX-700). SS-345 refers to the SX-700 chamber.
  - Search the TOMY tab for the accessory SKU to get the current price. Do NOT apply any price increase (TOMY prices are already 2026).
  - No need to ask for site name/state for accessory-only orders (JKKP not required for accessories alone).`,

  GYROZEN: `## GYROZEN CENTRIFUGE RANGE (FC-BIOS carries all models below):
  
  ### MICRO CENTRIFUGES (for microtubes 0.2-5.0mL):
  - Mini 6 (AC-mini6): Personal quick spinner, 6 x 2.0mL, 6,500 rpm, 0.65kg, ventilated — RM 990
  - Mini 6-RC (AC-mini6-RC): Same but with reverse spin function — RM 1,260
  - Mini (GZ-1312): Personal microcentrifuge, 12 x 2.0mL, 13,500 rpm, 4.4kg, ventilated — RM 3,610
  - 1524 (GZ-1524): 24 x 2.0mL microcentrifuge, 15,000 rpm, 11.9kg — RM 7,785
  - 1536 (GZ-1536): Medium throughput, 36 x 2.0mL, 15,000 rpm, 17.5kg, ventilated — RM 8,740
  - 1730R (GZ-1730R): Refrigerated micro, 36 x 2.0mL, 17,000 rpm, 43kg — RM 18,126 [STOCKING]
  - 1848R (GZ-1848R): High throughput refrigerated micro, 48 x 2.0mL or 8 x 50mL conical, 18,000 rpm, 53.5kg — RM 24,570
  
  ### LOW SPEED CENTRIFUGES (for 15mL, 50mL, 100mL tubes, vacuum tubes, blood):
  - 406 (GZ-0406): Basic, 6 x 15mL, 4,000 rpm, ventilated — RM 7,050
  - 416 (GZ-0416): Compact, swing-out capable, up to 16 x 15mL or 10 x 50mL, 4,000 rpm, ventilated — RM 8,820 [STOCKING]
  - 624R (GZ-0624R-B): Refrigerated, up to 24 x 15mL or 4 x 100mL, 6,000 rpm — RM 21,475
  
  ### MULTI-PURPOSE CENTRIFUGES (for high speed + large volume):
  - 1248 (GZ-1248): 12,000 rpm, ventilated, bench top — RM 15,330
  - 1248R (GZ-1248R): 12,000 rpm, refrigerated, bench top — RM 26,560
  - 1236R (GZ-1236R): Same as 1248R but floor standing — RM 26,790
  - 1580 (GZ-1580): 15,000 rpm, ventilated, bench top — RM 21,710
  - 1580R (GZ-1580R): 15,000 rpm, refrigerated, bench top — RM 32,730 [STOCKING]
  - 1696R (GZ-1696R): 16,000 rpm, refrigerated, highest capacity multi-purpose — RM 43,695
    Dimensions: 775 x 695 x 395mm (W x D x H) | Weight without rotor: 132 kg
  
  ### FLOOR STANDING HIGH SPEED:
  - 1736R (GZ-1736R): 17,000 rpm, refrigerated, floor standing — RM 41,535
  - 2236R (GZ-2236R): 22,000 rpm, refrigerated, 6L capacity, floor standing — RM 84,375
    Dimensions: 640 x 820 x 1,235mm (W x D x H) | Weight without rotor: 218 kg
  
  ### KEY DECISION FACTORS (what to ask the dealer):
  1. What tubes/samples? (microtubes, 15mL, 50mL, 100mL, blood/vacuum tubes, MTP plates)
  2. How many tubes per run? (determines capacity needed)
  3. What speed/g-force? (routine separation ~3000-4000 rpm vs high speed >10,000 rpm)
  4. Refrigerated needed? (temperature-sensitive samples like RNA, enzymes, blood)
  5. Bench top or floor standing? (space constraints)
  
  ### QUICK SELECTION GUIDE:
  - "Just need to spin down microtubes quickly" → Mini 6 or Mini
  - "Routine blood/clinical work, vacuum tubes" → 416 (ventilated) or 624R (refrigerated)
  - "15mL/50mL tubes, general lab" → 416, 624R, or 1248/1580 for higher speed
  - "High speed + micro + 50mL versatility" → 1580R or 1696R
  - "Large volume (100-250mL), high throughput" → 1696R, 1736R, or 2236R
  - "PCR plates, MTP plates" → 416 or 624R (swing-out with plate buckets)
  - "Temperature-sensitive samples" → any R model (624R, 1248R, 1580R, 1696R, 1730R, 1848R)
  
  IMPORTANT: All models except Mini 6 and Mini are sold WITHOUT rotors. The rotor must be quoted separately based on the dealer's tube requirements. Use the recommend_rotor tool to find the best rotor/bucket/adaptor configuration — do NOT manually interpret the rotor selection guide.

  CRITICAL — VACUUM TUBES vs 15mL CONICAL TUBES — BUCKET SELECTION:
  - GLB-d15-15 bucket: Per pricelist description, holds "2 x open top 15mL tube or vacuum-tube". Fits both 15mL round tubes and vacuum blood collection tubes (Φ13mm, Φ16mm). With GRS-S-15-6 rotor (6 buckets): total 12 tubes.
  - GLB-d15-50 / GLB-dc15-50 bucket: Holds 2 x 15mL conical tubes. With GRS-S-50-4 rotor (4 buckets): total 8 tubes.
  
  When a dealer asks for "15mL tubes" or "15mL tubes including Vacutainer/blood tubes":
  - GRS-S-15-6 + GLB-d15-15 = 12 tubes — best for mixed use (15mL round + vacuum tubes)
  - GRS-S-50-4 + GLB-dc15-50 = 8 tubes — specifically designed for 15mL conical (Falcon-type) tubes
  Use the pricelist description to accurately describe what each bucket holds. Do NOT invent capacity claims — quote the description exactly.

  ## GYROZEN CENTRIFUGE QUOTING:
  ### PRE-QUOTE (send FIRST if dealer doesn't specify model):
  When a dealer asks for "a centrifuge" without specifying a model, send a pre-quote email asking:
  1. What type of tubes/samples will you be spinning? (microtubes, 15mL/50mL conical, blood/vacuum tubes, plates)
  2. How many tubes do you need to spin per run?
  3. Do you need refrigeration? (for temperature-sensitive samples)
  4. What speed or g-force is required? (or describe the application so we can recommend)
  5. Bench top or floor standing preference?
  
  Use the QUICK SELECTION GUIDE to recommend 1-2 suitable models based on their answers.
  
  ### DIRECT QUOTE (when dealer specifies a model or gives enough info):
  If the dealer names a specific model (e.g., "quote for 1580R") or gives enough detail to identify the model:
  1. Quote the main unit from the GYROZEN pricelist tab
  2. Use the recommend_rotor tool with the centrifuge model, dealer's tube type/size, and quantity needed. The tool will return the best rotor/bucket configuration with calculated capacity.
  3. Search the GYROZEN pricelist tab for the recommended rotor's price using the Rotor Cat No
  4. If the rotor requires buckets (Bucket Cat No is not empty), also quote the buckets
  5. Include relevant adaptors/sleeves if needed for their specific tube sizes
  6. Include delivery charge from the policy (by state) and TnC charge if applicable
  7. Gyrozen prices are maintained at 2024 levels — do NOT apply any price increase

  ## DELIVERY & TnC CHARGES (from Gyrozen Policy):
  Delivery charges vary by state and model weight. TnC (Testing & Commissioning) is optional if done by the dealer's service personnel.
  - KL/Selangor: RM 380 TnC + delivery varies by model
  - Penang: RM 1,050 TnC
  - Johor: RM 1,110 TnC
  - Pahang/Kedah: RM 1,250 TnC
  - Kelantan: RM 1,450 TnC
  - EST charge: RM 100 (for government/institutional sites)
  Note: Delivery charge depends on model weight and courier type. Quote delivery separately — "delivery charges to be confirmed based on model and location."
  
  ### GYROZEN PRODUCT LINKS — include in every Gyrozen quotation:
  - Product catalog PDF: https://gyrozen.com/theme/gyrozen/assets/down/01.pdf
  - Centrifuge overview PDF: https://gyrozen.com/theme/gyrozen/assets/down/02.pdf
  - Rotor selection guide PDF: https://gyrozen.com/theme/gyrozen/assets/down/03.pdf
  - Mini 6: https://gyrozen.com/detail.php?idx=40
  - Mini (1312): https://gyrozen.com/detail.php?idx=42
  - 1524: https://gyrozen.com/detail.php?idx=43
  - 1536: https://gyrozen.com/detail.php?idx=45
  - 1730R: https://gyrozen.com/detail.php?idx=44
  - 1848R: https://gyrozen.com/detail.php?idx=46
  - 406: https://gyrozen.com/detail.php?idx=57
  - 416: https://gyrozen.com/detail.php?idx=58
  - 624R: https://gyrozen.com/detail.php?idx=59
  - 1248/1248R/1236R: https://gyrozen.com/detail.php?idx=60
  - 1580/1580R: https://gyrozen.com/detail.php?idx=63
  - 1696R: https://gyrozen.com/detail.php?idx=65
  - 1736R: https://gyrozen.com/detail.php?idx=66
  - 2236R: https://gyrozen.com/detail.php?idx=67
  Include the model-specific page + the rotor selection guide PDF in every Gyrozen quotation.`,

  MVE: `## MVE DEWAR DETAILED RULES

  MVE INTENT DISAMBIGUATION (do this FIRST, before choosing a series or searching):
  MVE dewars split into two very different categories. Classify the dealer's intent BEFORE picking a series — do NOT pattern-match on the word "storage" alone.

  (A) LN2 SUPPLY DEWARS — Lab series (Lab 4, Lab 10, Lab 20, Lab 30, Lab 50). These hold and dispense liquid nitrogen itself. Signals: "LN2 storage", "liquid nitrogen container/tank/dewar", "to top up", "to refill", "supply", "dispensing", capacity stated in litres of LN2, no mention of samples/vials/canisters. Lab capacities: 4L, 10L, 20L, 30L, 50L.

  (B) SAMPLE STORAGE DEWARS — SC, XC, CryoSystem, Doble series. These store biological samples (vials, straws, semen, cells) submerged in LN2. Signals: "sample storage", "vial storage", "cryopreservation", "semen tank", "straw storage", mentions of canisters/racks/vial capacity, or specific model numbers like SC 35/24, XC 32/8, XC 33/22, XC 34/18.

  If the dealer asks for "LN2 storage X litres" (or similar) with NO sample-related context, this is category (A) — quote Lab series, NOT SC/XC. Match the requested capacity to the closest Lab model at or above that size (e.g. "min 25L" → Lab 30; "40L" → Lab 50; "min 15L" → Lab 20). Optionally offer the next size as an alternative.

  If the request is genuinely ambiguous (e.g. bare "cryogenic container 30L" with no other context), do NOT guess — ask the dealer to clarify whether they need LN2 supply or sample storage.

  NEVER quote SC/XC series in response to a bare "LN2 storage container" request.

  MVE MODEL SEARCH: MVE model names in the pricelist use spaces around slashes (e.g. "SC 4 / 3 V", "SC 2 / 1 V"). When a dealer writes "SC4/3V" or "SC 4/3V", search using the key terms separated — e.g. search "SC 4 3 V" or just "SC 4" and then filter results. Do NOT mark as "Not Available" without trying multiple search terms. Vapor shippers are SC 2/1V, SC 4/2V, SC 4/3V. CryoShippers are CT-50, CT-250, CryoShipper XC, CryoShipper 2000.
  
  MVE DEWAR BUNDLING: When quoting MVE dewars, ALWAYS include the complete package — never quote just the bare dewar. The pricelist groups items by model: the main unit is listed first, followed by accessories in parenthesized model names.
  For RESEARCH DEWARS (RD-0.5, RD-1, RD-1W, RD-2, RD-3, RD-6): Lids are sold separately. ALWAYS include the matching lid/cork:
    - RD-0.5 (0.5L): dewar M02-13982242 + cork M02-13976344
    - RD-1 (1.0L standard): dewar M02-13982251 + cork M02-13976379
    - RD-1W (1.0L wide mouth): dewar M02-13982269 + cork M02-13976387
    - RD-2 (2.0L): dewar M02-13982277 + cork M02-13976387
    - RD-3 (3.0L): dewar M02-13982285 + stainless lid M02-21007715
    - RD-6 (6.0L): dewar M02-13982293 + stainless lid M02-21007715
  For SAMPLE STORAGE DEWARS (SC, XC, CryoSystem, Doble): Include the main unit. Also list available accessories (spare canister, cork/cover, hinged lid kit, roller base) that appear under the same model group in the pricelist, so the dealer can see the full package.
  For LN2 SUPPLY DEWARS (Lab 4, Lab 10, Lab 20, Lab 30, Lab 50): Include the main unit. List available accessories that appear under the same model group in the pricelist (e.g. roller base, pouring spout, discharge device, transfer hose, phase separator, replaceable neck cork) so the dealer can see the full package. Do NOT quote canisters/racks for Lab series — these are LN2 supply tanks, not sample storage.
  NEVER say "lids sold separately" — instead, include the lid as a line item in the quotation table.
  MVE has NO minimum order quantity — dealers can order 1 unit of any MVE product. Do NOT add any MOQ notes to MVE quotations.
  
  ### MVE PRODUCT LINKS — include in every MVE quotation:
  - FC-BIOS collection: https://www.fcbios.com.my/collections/cryopreservation-dewar
  - SC & XC Series: https://mvebio.com/our-products/breeders-aluminum/mve-sc-and-xc-series/
    Spec sheet: https://mvebio.com/wp-content/uploads/sites/4/2024/02/MVE-XC-Series-Spec-Sheet.pdf
  - Vapor Shippers (SC 4/2V, SC 4/3V, SC 2/1V): https://mvebio.com/our-products/breeders-aluminum/mve-vapor-shipper-series/sc-series/
  - Lab Series: https://mvebio.com/our-products/breeders-aluminum/mve-lab-series/
    Spec sheet: https://mvebio.com/wp-content/uploads/sites/4/2024/02/MVE-Lab-Series-Spec-Sheet-1.pdf
  - Doble Series: https://mvebio.com/our-products/life-science-aluminum/mve-doble-series/
  - CryoSystem Series: https://mvebio.com/our-products/life-science-aluminum/mve-cryosystem-series/
  - CryoShipper / CT-50 / CT-250: https://mvebio.com/our-products/life-science-aluminum/mve-vapor-shipper-series/
  - Research Dewars: https://www.fcbios.com.my/products/research-dewars-series
  - Accessories catalog: https://mvebio.com/wp-content/uploads/sites/4/2024/04/ML-000002.pdf
  - Full MVE Asia catalog PDF: https://mvebio.com/wp-content/uploads/sites/4/2025/07/ML-000043.pdf
  - Full MVE Animal Health catalog PDF: https://mvebio.com/wp-content/uploads/sites/4/2024/04/ML-000020.pdf
  For MVE quotations, include the FC-BIOS collection link, the relevant series product page, and spec sheet/catalog PDF where available.`,

  IUL: `## IUL AIR SAMPLER RULES
  When a dealer asks for an air sampler:
  - If the dealer specifically requests Spin Air (the full model, I11-5500) by name, SKU, or image:
    - Quote the Spin Air (I11-5500) FIRST as the requested item
    - ALSO offer Spin Air Basic (I11-5532) and Basic Air (I11-5533) as lower-cost alternatives
    - Briefly note the key differences (Spin Air has downloadable data, LIMS connectivity, barcode scanning; Spin Air Basic has spin technology at a lower price; Basic Air is the most budget-friendly)
  - If the dealer asks generically for "air sampler" without specifying a model:
    - Propose ONLY 2 models: Spin Air Basic (I11-5532) and Basic Air (I11-5533)
    - Spin Air Basic: Spin technology for enhanced accuracy, very affordable
    - Basic Air: Regular static Andersen sampler, budget-friendly
    - ONLY add Spin Air (I11-5500) if the dealer specifically mentions: downloadable data, LIMS connectivity, barcode scanning, data traceability, or duplicate sampling
  - Do NOT propose the Spin Air Mate (I11-5502) or battery packs unless specifically requested
  - Always include the IUL air sampler product page link: https://iul-instruments.com/product/spin-air-air-sampler/
  - Air sampler brochure PDF: https://iul-instruments.com/wp-content/uploads/dlm_uploads/2018/06/Leaflet-50006096-07.pdf

  ## IUL COLONY COUNTER RULES
  When a dealer asks for a colony counter:
  - We do NOT offer colony counters. Mark as "Not Available" in the quotation.
  - Do NOT quote the IUL SphereFlash (I11-7000) or the Digital Colony Counter (I11-DJ01-J-2) — these are not offered to dealers.

  ## IUL MASTICATOR RULES
  When a dealer asks for a masticator or stomacher machine:
  - Search IUL tab for masticator models. IUL masticators are lab blenders (also called stomacher machines) used for sample homogenization.
  - The "50 bags" in the IUL masticator pricelist description refers to the machine's capacity rating — stomacher bags are NOT included with the machine. Do NOT say bags are included.
  - Always include the IUL masticator product page link: https://iul-instruments.com/product/masticator-homogenizator/
  - Masticator brochure PDF: https://iul-instruments.com/wp-content/uploads/2024/02/50007873-04_Promotional_Leaflet_Masticator-EN.pdf
  
  ### IUL PRODUCT LINKS — use the CORRECT link for the product category being quoted:
  - Air samplers: https://iul-instruments.com/product/spin-air-air-sampler/
  - Masticators: https://iul-instruments.com/product/masticator-homogenizator/
  - Colony counters (SphereFlash): https://iul-instruments.com/product/sphereflash/
  - Colony counters (manual/digital): https://iul-instruments.com/product/colony-counter/
  Do NOT use the air sampler link when quoting masticators or colony counters. Match the link to the product being quoted.`
};

function getBrandInstructions(brand) {
  const key = brand.toUpperCase();
  if (BRAND_INSTRUCTIONS[key]) {
    return BRAND_INSTRUCTIONS[key];
  }
  return `No detailed instructions found for brand "${brand}". Use the general rules in the system prompt.`;
}

module.exports = { getBrandInstructions };
