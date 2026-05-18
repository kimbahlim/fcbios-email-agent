// Brand-specific detailed instructions loaded on-demand via get_brand_instructions tool
// This keeps the main system prompt lean. Only loaded when the agent encounters these brands.

const BRAND_INSTRUCTIONS = {

  TOMY: `## TOMY AUTOCLAVE QUOTING — COMPLETE INSTRUCTIONS

  ## STEP 1: PRE-QUOTE (always send this FIRST before quoting)
  When a dealer asks for any TOMY autoclave (SX-500 or SX-700), you need the INSTALLATION SITE name and STATE for JKKP compliance. You MUST have BOTH pieces of info explicitly stated in the email before quoting.
  
  CRITICAL — DEALER'S OWN COMPANY/ADDRESS IS NEVER THE INSTALL SITE:
  The dealer is a reseller. The autoclave is being purchased FOR THEIR CUSTOMER, who is the end-user. The dealer's own company name, signature address, email domain, or office location in Malaysia is NEVER an acceptable substitute for end-user site info — even if the dealer's signature includes a state. The whole point of asking is to find out where the dealer's CUSTOMER will install it. Examples of what does NOT count as valid install site info:
    - Dealer's company name in From/CC/signature (e.g., "TAAT BESTARI SDN BHD", "GAIA SCIENCE", "Polyscientific")
    - Dealer's office address with state (e.g., "Ampang, Selangor", "Puchong, Selangor", "Kuala Lumpur")
    - Dealer's email domain or website
    - Forwarded emails routed via enquiry@fcbios.com.my — the original sender is still a dealer enquiring on behalf of their customer
  
  CHECK THE EMAIL — only skip the pre-quote if the dealer EXPLICITLY identifies the END-USER site, using language like:
    - "end user: [Hospital/University/Company name], [State]"
    - "for our customer [Name] in [State]"
    - "to be installed at [Site name], [State]"
    - "the user is [Name], located in [State]"
    - "site: [Name]" with state
    - Or similar wording that makes it unambiguous that the named site is the END-USER (not the dealer themselves)
  
  When the email contains ONLY the dealer's signature with their own company name and address, that is NOT enough — even if the signature says a Malaysian state, that state is the dealer's office, not the install site. The agent MUST send the pre-quote in this case.
  
  Send the pre-quote email if EITHER the END-USER installation site name OR state is missing or unclear:
  
  Pre-quote email template (ONLY if site info is missing):
  "Thank you for your enquiry on the TOMY [model] autoclave.
  Before we can prepare your quotation, could you please provide the following:
  - End-user site/company name: (where the autoclave will be installed at your customer's premises)
  - State: (Malaysian state where the install site is located)
  This is required as our engineer will need to perform the JKKP compulsory safety pressure test on site during installation together with the JKKP officer. The MOB (mobilization) cost varies by state, so we cannot prepare an accurate quotation without this information."
  
  WHEN IN DOUBT: Send the pre-quote. It is far better to ask one clarifying question than to send a quote with the wrong MOB cost or assume the dealer's address is the install site.

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
  | SV-INSTALLATION&COMMISSIONING | Installation & Commissioning | 450 |
  | T01-JKKP | JKKP Inspection | [calculate: 1,300 + MOB for state] |
  | T01-CAL-1-C0 | Pressure Gauge & Safety Valve (JKKP mandatory) | Inclusive |

  ### SX-700 MANDATORY ITEMS:
  | SKU | Description | Price (MYR) |
  | T01-SX-700 | SX-700 Autoclave 79L (2 baskets included FOC) | 35,000 |
  | F07-ACA-700B | Additional Standard Basket (3rd basket for full capacity) | 905 |
  | SV-WARRANTY-1 YEAR | 1 Year Warranty | Included |
  | SV-INSTALLATION&COMMISSIONING | Installation & Commissioning | 450 |
  | T01-JKKP | JKKP Inspection | [calculate: 1,300 + MOB for state] |
  | T01-CAL-1-C0 | Pressure Gauge & Safety Valve (JKKP mandatory) | Inclusive |

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
  | SV-EST TEST | For government sites (if applicable) | 150 |

  SX-700 accessories:
  | F07-ACA-700B | Additional Standard Basket | 905 |
  | F07-SBSS-345 | Basket Support Stand | 210 |
  | F07-ACA-700T | Long Basket for Waste | 1,300 |
  | T01-599907 | Printer Module (ships separately) | 9,400 |
  | SV-EST TEST | For government sites (if applicable) | 150 |

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

  MVE MODEL SEARCH: MVE model names in the pricelist use spaces around slashes (e.g. "SC 4 / 3 V", "SC 2 / 1 V"). When a dealer writes "SC4/3V" or "SC 4/3V", search using the key terms separated — e.g. search "SC 4 3 V" or just "SC 4" and then filter results. Do NOT mark as "Not Available" without trying multiple search terms.
  IMPORTANT: All of the following are part of the MVE Vapor Shipper Series (per official MVE catalogue ML-000050) — they are all LN2 dry vapor shippers, NOT separate product categories. The "CryoShipper" name is just MVE's brand name for some models. The full series includes: SC 2/1V, SC 4/2V, SC 4/3V, XC 30/12V, CryoShipper, CryoShipper XC, CryoShipper 2000, IATA CryoShipper, XC 65/5V, CT-50, CT-250. When a dealer asks for a "vapor shipper" OR "cryoshipper", consider the ENTIRE range — do not artificially limit to only CT-50/CT-250/XC.
  
  MVE DEWAR BUNDLING: When quoting MVE dewars, ALWAYS include the complete package — never quote just the bare dewar. The pricelist groups items by model: the main unit is listed first, followed by accessories in parenthesized model names.
  For RESEARCH DEWARS (RD-0.5, RD-1, RD-1W, RD-2, RD-3, RD-6): Lids are sold separately. ALWAYS include the matching lid/cork:
    - RD-0.5 (0.5L): dewar M02-13982242 + cork M02-13976344
    - RD-1 (1.0L standard): dewar M02-13982251 + cork M02-13976379
    - RD-1W (1.0L wide mouth): dewar M02-13982269 + cork M02-13976387
    - RD-2 (2.0L): dewar M02-13982277 + cork M02-13976387
    - RD-3 (3.0L): dewar M02-13982285 + stainless lid M02-21007715
    - RD-6 (6.0L): dewar M02-13982293 + stainless lid M02-21007715
  For SAMPLE STORAGE DEWARS (SC, XC, CryoSystem, Doble) when used as STATIONARY SAMPLE STORAGE (not for transport): Include the main unit. Also list available accessories (spare canister, cork/cover, hinged lid kit, roller base) that appear under the same model group in the pricelist, so the dealer can see the full package.
  For VAPOR SHIPPERS / CRYOSHIPPERS (SC 2/1V, SC 4/2V, SC 4/3V, XC 30/12V, XC 65/5V, CryoShipper, CryoShipper XC, CryoShipper 2000, IATA CryoShipper, CT-50, CT-250) — these are TRANSPORT units, NOT sample storage. CRITICAL ACCESSORY POLICY for new vapor shipper / cryoshipper purchases:
    DO NOT QUOTE the following spare/replacement parts unless the dealer EXPLICITLY asks for them or describes a maintenance/replacement scenario:
      - Spare Canister (e.g., M02-20045793 for SC 2/1V, M02-9710171 for SC 4/2V)
      - Spare Cork and Cover (e.g., M02-10507219 for SC 2/1V, M02-10507032 for SC 4/2V)
      - Spare absorbent / wicking material
      - Replacement neck tube
    Reasoning: These are MAINTENANCE/REPLACEMENT parts. A new vapor shipper / cryoshipper unit ships with one canister and one cork/cover already included. Quoting these as line items inflates the quote unnecessarily and confuses the customer into thinking they're required for the new purchase.
    DO QUOTE these accessories when relevant:
      - Data Logger options — see the dedicated "DATA LOGGER OPTIONS FOR VAPOR SHIPPERS" section below for which SKU to use based on model and dealer requirements (preinstalled SKUs preferred over base unit + separate logger kit)
      - Protective Shipping Container / Carton — when IATA-compliant shipping packaging is requested
      - Vial racks / sample storage configurations — when capacity/configuration is specified by dealer
    Important caveat about ISO 21973: When tender specs mention "ISO 21973, CE or equivalent", note that ISO 21973:2020 is a transport SERVICE PROVIDER standard (covers chain-of-custody, traceability, logistics processes — not equipment itself). MVE CryoShippers conform to MDD 93/42/EEC (CE marked under MDD) and are IATA DGR Special Provision A152 compliant for non-hazardous classification. The unit itself is NOT ISO 21973 certified — only logistics service providers can be. Do not claim ISO 21973 certification for MVE units.
  For LN2 SUPPLY DEWARS (Lab 4, Lab 10, Lab 20, Lab 30, Lab 50): Include the main unit. List available accessories that appear under the same model group in the pricelist (e.g. roller base, pouring spout, discharge device, transfer hose, phase separator, replaceable neck cork) so the dealer can see the full package. Do NOT quote canisters/racks for Lab series — these are LN2 supply tanks, not sample storage.
  NEVER say "lids sold separately" — instead, include the lid as a line item in the quotation table.
  MVE has NO minimum order quantity — dealers can order 1 unit of any MVE product. Do NOT add any MOQ notes to MVE quotations.

  ### VAPOR SHIPPER / CRYOSHIPPER PRE-QUOTE — SAMPLE FORMAT IS MANDATORY
  When a dealer asks for a "cryoshipper", "LN2 shipper", "dry vapor shipper", "vapor shipper for samples", or describes transport of cryopreserved biological materials, you MUST have BOTH (a) the sample format AND (b) a specific model name OR specific hold time requirement before quoting. Sample format alone is the single most important filter — without it, you cannot pick the right model. The MVE Vapor Shipper Series has 13+ different models in the FC-BIOS pricelist with hold times from 8 to 82 days and capacities from single vials to 4 blood bag cassettes. They are NOT interchangeable.

  CRITICAL ANTI-PATTERN — DO NOT DO THIS: Do NOT default to quoting CT-50 + CT-250 + CryoShipper XC as a generic "cryoshipper package" of three options. This is the most common failure mode. The CT-50 and CT-250 are SPECIALTY blood bag shippers — quoting them when sample format isn't known wastes the dealer's time on irrelevant options. The CryoShipper XC alone is also an incomplete answer — the SC 4/2V and SC 4/3V are usually better-fit for general purpose at lower cost. Always use the recommendation table below to pick models based on the dealer's stated requirements, NOT muscle memory.

  When to SEND the pre-quote (do NOT include prices or quote table — this is an information-gathering email):
  - "cryoshipper" / "vapor shipper" mentioned but NO sample format specified (regardless of whether hold time is given) → SEND pre-quote
  - Sample format is implied by generic terms like "cryopreserved samples", "biological materials", "biospecimens", "cells", "tissue" → SEND pre-quote (these are NOT specific enough — could be vials, bags, or straws)
  - Tender / RFQ language with vague specs like "LN2 dry vapor cryoshipper for biological transport" → SEND pre-quote
  - Dealer asks for "options" or "a few choices" without telling you the sample format → SEND pre-quote

  When to SKIP the pre-quote and quote directly (sample format must be EXPLICIT):
  - "25mL blood bag" / "small blood bag" / "PBMC bag" / "stem cell bag 25mL" → CT-50 (holds 2x 25mL bags)
  - "250mL blood bag" / "cord blood unit" / "large blood bag" → CT-250 (holds 2x 250mL bags) OR CryoShipper 2000 w/ Cassette Rack (holds 4 blood bag cassettes — bigger volume)
  - "cryovials" / "1.2mL vials" / "2mL vials" / "vials only" / "straws" → use recommendation table, pick by hold time + volume. Default for general "vials" requests: SC 4/2V (most common) or SC 4/3V (longer hold)
  - "mixed samples" / "general purpose" → SC 4/2V or SC 4/3V (standard general-purpose vapor shippers)
  - Specific model named by dealer (e.g., "SC 4/3V", "Cryoshipper XC", "CT-250") → quote that model directly
  - Sample format + specific hold time requirement combined → match against recommendation table

  Pre-quote template (do NOT include prices or the quote table):
  "Before we can recommend the most suitable cryoshipper / vapor shipper, could you please confirm:
  1. What is the sample format you will be transporting? (e.g., 25mL blood bags, 250mL blood bags / cord blood units, cryovials in 1.2mL or 2mL, straws, or mixed samples)
  2. What is the required holding time for transport? (Our models range from 8 days to 82 days static hold)
  3. Approximate sample volume / quantity per shipment
  4. Is the unit required for IATA-compliant international shipping? (We can supply with Protective Shipping Container / PPSC)
  5. Do you require an integrated temperature data logger for the transport?

  Once we have these details, we can recommend the best-fit model from our MVE Vapor Shipper range."

  Include the brochure links (below) in the pre-quote so the dealer can review the full series.

  ### VAPOR SHIPPER MODEL RECOMMENDATION TABLE (use this when matching dealer requirements to models)
  All models are LN2 dry vapor shippers, ≤-150°C, IATA DGR Special Provision A152 exempt (with PPSC where applicable), MDD 93/42/EEC compliant.
  Hold times are STATIC nominal — actual performance varies with conditions.

  | Model | Hold Time | Sample Capacity | Pricelist SKU (active) | Use case |
  |-------|-----------|-----------------|------------------------|----------|
  | SC 2/1V | 8 days | 88 straws bulk; small samples | M02-9922339 | Smallest, lowest cost, very short transport only — usually not enough hold for international |
  | SC 4/2V | 13 days | 440 straws / 95-102 vials | M02-9918479 | General purpose, mid-volume, mid-distance — most common choice |
  | SC 4/2V WITH PPSC | 13 days | 440 straws / 95-102 vials | M02-21134754 | SC 4/2V bundled with IATA shipping container |
  | SC 4/3V | 21 days | 210 straws / 40-48 vials | M02-10817330 | Longer hold time, slimmer canister (1.81" dia) — for international transport |
  | SC 4/3V WITH PPSC | 21 days | 210 straws / 40-48 vials | M02-21134753 | SC 4/3V bundled with IATA shipping container |
  | XC 30/12V | 82 days | 312 straws / 30-36 vials / 1 rack | M02-21244576 | Longest hold time — bulk/long-duration transport, larger 18L tank |
  | CryoShipper (10-day) | 10 days | Blood bag rack OR 5-2 square rack | M02-10508967 / M02-20925284 | Premium 10-day option with shipping container included |
  | CryoShipper XC (14-day) | 14 days | 966 vials bulk / 500 vials cane | M02-11015195 | Premium 14-day with high vial capacity (PPSC included) |
  | CryoShipper 2000 (15-day) | 15 days | 4 square racks / vial boxes | M02-11366673 | Premium high-volume, includes PPSC |
  | CryoShipper 2000 w/ Cassette Rack | 15 days | 4 blood bag cassette racks | M02-21839182 | High-volume blood bag transport (cassette-based) |
  | IATA CryoShipper | 14 days | Vials in secondary container | M02-10777411 | Premium pre-bundled with secondary container + PPSC for guaranteed IATA |
  | XC 65/5V | 40 days | 1x 5/2 vial box rack (100 vials/box) | M02-21559429 | Long-hold mid-volume vial transport (PPSC included) |
  | CT-50 | 10 days | 2x 25mL blood bags | M02-21007700 (bare) / M02-21156062 (w/PPSC) | Dedicated for 25mL bags only |
  | CT-250 | 10 days | 2x 250mL blood bags | M02-21000341 (bare) / M02-21092630 (w/PPSC) | Dedicated for 250mL bags (cord blood units) only |

  CRITICAL — LEGACY SKU EXCLUSION: The pricelist contains duplicate entries for SC 4/2V, SC 4/3V, SC 4/2V WITH PPSC, and SC 4/3V WITH PPSC with a "U" suffix in the SKU (e.g. M02-9918479U, M02-10817330U, M02-21134754U, M02-21134753U) labeled "(LEGACY)". DO NOT quote the "U"-suffix Legacy SKUs. Always quote the non-"U" versions (M02-9918479, M02-10817330, M02-21134754, M02-21134753) listed in the table above.

  ### NEXT-GEN SC 4/2V AND SC 4/3V — NOT YET AVAILABLE
  The MVE catalogue features Next-Generation SC 4/2V (19-day hold) and SC 4/3V (26-day hold) with improved durability. The FC-BIOS pricelist currently only has Next-Gen spare cork/covers (M02-21839652S, M02-21839651S) but NOT the main units. DO NOT recommend or quote the Next-Gen SC 4/2V or SC 4/3V main units — they are not yet available. If a dealer specifically asks for the Next-Gen versions, flag for human review and note that current standard SC 4/2V (13-day) and SC 4/3V (21-day) are available.

  ### DATA LOGGER OPTIONS FOR VAPOR SHIPPERS
  When the dealer requires temperature monitoring, integrated data logger, or clinical/GMP-compliant transport with temperature recording, the agent MUST offer the appropriate logger option. There are THREE generations of data logger options in the pricelist — pick based on the model:

  Option A — "Preinstalled Data Logger Kit" SKUs (PREFERRED when available — significantly cheaper than buying base unit + separate logger kit):
  - SC 4/2V with Data Logger preinstalled: M02-21553216S — RM 10,680 (vs M02-9918479 SC 4/2V RM 8,030 + M02-21544872S Data Logger Kit RM 8,410 = RM 16,440 separate. Saves RM 5,760.)
  - SC 4/3V with Data Logger preinstalled: M02-21553217S — RM 10,680 (vs M02-10817330 SC 4/3V RM 8,180 + M02-21544872S Data Logger Kit RM 8,410 = RM 16,590 separate. Saves RM 5,910.)
  - CryoShipper XC with Data Logger preinstalled: M02-21553211S — RM 10,840
  - CT-50 with Data Logger preinstalled: M02-21561771S — RM 13,490
  - CT-250 with Data Logger preinstalled: M02-21561770S — RM 13,610
  RULE: When the dealer wants SC 4/2V, SC 4/3V, CryoShipper XC, CT-50, or CT-250 WITH a data logger, ALWAYS quote the "Preinstalled Data Logger Kit" SKU instead of pairing the base unit with a separate logger kit. Explain in the notes: "The preinstalled data logger SKU is significantly more cost-effective than purchasing the base unit and data logger kit separately."

  Option B — SMARTTAG / CRYOBEACON (newer condition monitoring systems for SC 4/2V and SC 4/3V — offer as alternatives when dealer wants connectivity/tracking):
  - SMARTTAG SC 4/2V CMS: M02-21839077S — RM 5,820 (Cork w/ Datalogger & Probe + World Track 12 Months connectivity)
  - SMARTTAG SC 4/3V CMS: M02-21838826S — RM 5,820
  - CRYOBEACON SC 4/2V CMS: M02-21839078S — RM 3,560 (Cork w/ Datalogger & Probe + standard Connectivity 12 Months)
  - CRYOBEACON SC 4/3V CMS: M02-21838827S — RM 3,560
  When to offer: If the dealer mentions remote tracking, real-time connectivity, IoT, asset tracking, fleet monitoring, or chain-of-custody — these are condition monitoring systems (CMS) with embedded data loggers + connectivity. SMARTTAG includes broader "World Track" coverage; CRYOBEACON is the standard connectivity option. These ADD to a base SC 4/2V or SC 4/3V purchase (they are cork-with-logger assemblies that replace the standard cork). Do NOT quote these in place of Option A unless dealer specifically asks for connectivity/tracking.

  Option C — Standalone Data Logger Kit (M02-21544872S, RM 8,410) — ONLY quote when retrofitting an existing tank the dealer already owns. Do NOT pair this with a new SC 4/2V, SC 4/3V, CryoShipper XC, CT-50, or CT-250 purchase (Option A is cheaper).

  ### HOLD TIME PRESENTATION RULES — APPLIES TO ALL VAPOR SHIPPER QUOTES
  When quoting any vapor shipper / cryoshipper, the static holding time is a key selling point — dealers compare models on it carefully. Use the EXACT hold time from the recommendation table above for each quoted model.

  Format rules:
  - When quoting MULTIPLE models in the same quotation, present each model's hold time as a SEPARATE line in the Important Notes section. Format example: "Static holding time: SC 4/2V (13 days), CryoShipper XC (14 days), CT-250 (10 days)" — NOT vague phrases like "10+ days, varies by model".
  - When quoting a SINGLE model, state the exact hold time for that model only — do not reference other models' specs.
  - All static hold times are nominal — actual performance varies with atmospheric conditions, sample temperature, and usage. You may add this caveat once at the end of the specs.
  - NEVER copy hold times from the wrong model (e.g., do not quote SC 4/2V at "14 days" — that's the CryoShipper XC value; SC 4/2V is 13 days).

  Detailed specs for individual models (use ONLY when the dealer specifically asks for full technical specs / brochure-level detail for a particular model):
  - CT-50 (M02-21561771S): 2x 25mL blood bags, 5L LN2, 0.5 L/day evap, 10-day hold, 8/12kg empty/charged, IATA exempt, MDD compliant
  - CT-250 (M02-21561770S): 2x 250mL blood bags, 8L LN2, 0.8 L/day evap, 10-day hold, 11/17.5kg empty/charged, IATA exempt, MDD compliant
  - CryoShipper XC (M02-21553211S): 966 vials bulk or 500 vials caned, 10L LN2, 0.70 L/day evap, 14-day hold, 15/22.2kg empty/charged, IATA exempt, MDD compliant, 3-year vacuum warranty
  - SC 4/2V (M02-9918479): 440 straws bulk / 95-102 vials caned, 3.6L LN2, 0.26 L/day evap, 13-day hold, 4.5/7.7kg empty/charged, 2.75" neck. With PPSC (M02-21134754): IATA exempt
  - SC 4/3V (M02-10817330): 210 straws bulk / 40-48 vials caned, 4.3L LN2, 0.20 L/day evap, 21-day hold, 5.3/8.7kg empty/charged, 2.00" neck. With PPSC (M02-21134753): IATA exempt
  - XC 30/12V (M02-21244576): 312 straws bulk / 30-36 vials caned (1 rack), 18L LN2, 0.22 L/day evap, 82-day hold, 20/34kg empty/charged
  - XC 65/5V (M02-21559429): 1x 5/2 vial box rack (100 vials/box), 10L LN2, 0.79 L/day evap, 40-day hold, includes PPSC
  All MVE Vapor Shippers: Advanced QWick charge technology (2-hour charge time); IATA DGR Special Provision A152 exempt (with PPSC); MDD 93/42/EEC (CE) compliant; TWO Year Parts + THREE Year Vacuum warranty.

  ### CRYOSHIPPER BROCHURE LINKS
  Include the model-specific spec sheet when quoting CryoShippers:
  - CT-50 & CT-250 spec sheet: https://mvebio.com/wp-content/uploads/sites/4/2024/02/MVE-CryoShipper-CT-50-and-CT-250-Spec-Sheet.pdf
  - Blood Bag Shippers product page: https://mvebio.com/our-products/life-science-aluminum/mve-blood-bag-shippers/
  - Vapor Shipper Series (XC and others): https://mvebio.com/our-products/life-science-aluminum/mve-vapor-shipper-series/

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
  Do NOT use the air sampler link when quoting masticators or colony counters. Match the link to the product being quoted.`,

  HIMEDIA: `## HIMEDIA QUOTING — COMPLETE INSTRUCTIONS

  ## AGAR vs BROTH/MEDIUM DISAMBIGUATION (CRITICAL — applies to ALL HiMedia culture media)
  HiMedia descriptions in the pricelist are truncated at 40 characters, which makes "Agar" and "Broth/Medium" versions of similar products look almost identical. Before quoting any HiMedia culture media, you MUST match the dealer's EXACT wording for the product physical form (agar/plate vs broth/medium/fluid). This is the single most important disambiguation step for HiMedia.
  STEP 1 — Read the dealer's exact wording. Identify whether they asked for:
    AGAR/PLATE form: keywords "agar", "plate", "plates", "plated"
    BROTH/MEDIUM/FLUID form: keywords "broth", "medium", "fluid", "liquid medium"
    SEMI-SOLID/SLANT/STAB form: keywords "slant", "stab", "semi-solid", "soft agar"
  STEP 2 — When evaluating search results, READ EACH DESCRIPTION CAREFULLY for the form-type keyword:
    AGAR products contain "Agar" in the description (e.g., "Tryptone Soya Agar", "MacConkey Agar", "Sabouraud Dextrose Agar")
    BROTH/MEDIUM products contain "Broth", "Medium", "Fluid", or "Liquid" (e.g., "Tryptone Soya Broth", "Soyabean Casein Digest Medium", "Fluid Casein Digest Medium")
  STEP 3 — STRICT FILTERING: NEVER quote an Agar SKU when the dealer asked for Broth/Medium. NEVER quote a Broth/Medium SKU when the dealer asked for Agar/Plate. These are different physical products, not interchangeable. The dealer chose one form deliberately because their protocol/method requires it.
  COMMON HIMEDIA AGAR vs BROTH/MEDIUM PAIRS — keep these strictly separate:
    - Tryptone Soya: M290/MH290 (TSA, agar) vs M011 (TSB, broth)
    - Soyabean Casein Digest: M449/MV449 (SCDA agar w/ lecithin & polysorbate) vs M2115 (SCDM/SCDLP broth w/ 0.5% lecithin & 4% polysorbate, Twin Pack)
    - SCD with Lecithin/Polysorbate variants:
        M2115 = Soyabean Casein Digest MEDIUM/BROTH w/ 0.5% Soya Lecithin & 4% Polysorbate 80 (Twin Pack)
        M5297 = Soyabean Casein Digest AGAR (SCDA) w/ 0.5% Lecithin & 2% Polysorbate 80
        M449 = Tryptone Soya AGAR w/ Lecithin & Polysorbate 80 (Microbial Content Test Agar)
        M117 = Fluid Casein Digest Soya Lecithin MEDIUM (Twin Pack)
        MAP117 = Fluid Casein Digest-Soy-Lecithin Polysorbate 20 MEDIUM (Twin Pack)
        M1838 = Soyabean Casein Digest MEDIUM w/ Tween 80 and Lecithin
      When dealer asks "Soya Casein Digest Lecithin Polysorbate Broth" without specifying %, default to M2115 (SCDM/SCDLP Twin Pack — the standard SCDLP broth). NEVER quote M5297 or M449 for a "broth" request.
    - Sabouraud Dextrose: M063 (SDA, agar) vs M033 (SDB, broth)
    - Brain Heart Infusion: M211 (BHIA, agar) vs M210 (BHIB, broth)
    - MacConkey: M082 (MacConkey Agar) vs M081 (MacConkey Broth)
    - Nutrient: M001 (Nutrient Agar) vs M002 (Nutrient Broth)
  WHEN IN DOUBT: If the dealer's wording is ambiguous (e.g., they only say "Soya Casein Digest" without "agar" or "broth"), DO NOT guess. Ask the dealer to clarify whether they need the agar (solid) or broth/medium (liquid) form before quoting. Better to ask a one-line clarification than to quote the wrong product.

  ## HICYNTH (MCD- prefix) EXCLUSION RULE (CRITICAL)
  HiCynth is HiMedia's animal-origin-free (AOF) / plant-based variant range, identified by the "MCD-" prefix in the SKU (e.g., H05-MCD1651-500G is the HiCynth version of H05-M1651-500G HiCrome Bacillus Agar). NEVER quote any HiCynth (MCD-) SKU unless the dealer EXPLICITLY asks for one of: "HiCynth", "MCD-", "animal-origin-free", "AOF", "vegan", "plant-based", or "animal-free" media. When the dealer asks for a standard HiMedia product (e.g., "HiCrome Bacillus Agar"), quote ONLY the standard M-prefix SKU (M1651). Do NOT also offer the HiCynth/MCD- variant as an alternative, equivalent, or "for your reference" — this inflates the quote and creates confusion. The HiCynth range is a specialty product line for specific use cases; only customers who specifically need animal-origin-free media will ask for it. If you see MCD- SKUs appearing in your search results, FILTER THEM OUT unless the dealer's request explicitly mentions one of the trigger keywords above.

  ## M-PREFIX PRIORITY RULE (CRITICAL — applies to ALL HiMedia culture media)
  The M-prefix (e.g., M011, M322, M290) is HiMedia's main / default culture media line. Alternative prefixes that map to the same product family include GM- (granulated sterile), MV- (HiVeg / vegetable-origin), MH- (HiMedia Premium), and MCD- (HiCynth, already excluded above). The M-prefix is the standard formulation that dealers want by default; the others are specialty variants. RULES:
  (1) NAME-ONLY ENQUIRY: When the dealer mentions a product NAME without specifying a SKU (e.g., "Soyabean Casein Digest Medium", "MacConkey Broth", "Tryptone Soya Agar"), search for and quote the M-prefix SKU FIRST. Do NOT offer GM-/MV-/MH- variants as alternatives unless the dealer explicitly asks for granulated, HiVeg, or premium versions.
  (2) NON-M SKU SPECIFIED WITH MATCHING NAME: When the dealer specifies a non-M SKU (e.g., GM011, MV322, MH011) AND the product name they mention also matches an M-prefix equivalent, quote the M-prefix SKU FIRST and include their requested SKU as a clearly-labelled alternative. Example: dealer asks for "Soyabean Casein Digest Medium, H05-GM011-500G" → quote H05-M011-500G FIRST (M-prefix equivalent), then H05-GM011-500G as alternative. Mention in the Important Notes that M-prefix is the standard / default formulation and the GM- variant is a sterile granulated option.
  (3) NON-M SKU SPECIFIED, NO M EQUIVALENT: When the dealer specifies a non-M SKU that has NO M-prefix equivalent (verify by searching M+<number> in HIMEDIA_Microbiology), quote the exact SKU requested. Do not invent an M-prefix SKU that doesn't exist in the pricelist.
  (4) NAME/SKU MISMATCH: When dealer's stated product name does NOT match the SKU they provided (like the H05-M322-500G / "Soyabean Casein Digest Medium" case where M322 is actually "Tryptone Soya Broth w/o Dextrose"), quote BOTH: (a) the M-prefix SKU that matches the NAME (M011 / SCDM) FIRST, (b) the exact SKU the dealer typed (M322) as second item, AND flag the discrepancy clearly in Important Notes asking dealer to confirm. Always lead with the M-prefix product matching the name, not the one matching the typed SKU.
  (5) FINDING THE M-EQUIVALENT: To find the M-prefix equivalent of a GM-/MV-/MH- SKU, strip the leading letter(s) before "M" and search HIMEDIA_Microbiology for the result. Examples: GM011 → search M011; MV290 → search M290; MH011 → search M011 (note: MH and M can share the same number for the same product, MH being the premium grade). Always verify the M-prefix match by comparing descriptions — if descriptions differ significantly, do NOT substitute.

  ## MOLECULAR BIOLOGY KITS (HIMEDIA_Molecular_Biology tab)
  TEACHING KITS vs RESEARCH KITS: HiMedia has two types of kits:
  - HTBM series = "HiPer" Teaching Kits (for educational/student use only, small prep counts)
  - MB series = "HiPurA" Research-grade Purification Kits (for lab/research/commercial use)
  NEVER offer teaching kits (HTBM) to dealers unless they specifically ask for teaching/education kits. For DNA extraction, RNA extraction, protein purification etc., ALWAYS search for MB series (HiPurA) kits first. These are in the HIMEDIA_Molecular_Biology tab.
  Example: dealer asks for "genomic DNA extraction kit" → search for "HiPurA genomic DNA" or "MB504" or "MB505" or "MB506" — NOT HTBM teaching kits.
  GENERIC DNA EXTRACTION KIT ENQUIRY — CLARIFY FIRST (CRITICAL): When the dealer asks for "DNA extraction kit", "DNA purification kit", "DNA isolation kit", "DNA prep kit" or similar WITHOUT specifying a sample type, you MUST clarify with the dealer before quoting. Sample-type qualifiers that REMOVE the need to clarify: "bacterial", "fungal", "plant", "mammalian", "animal", "viral", "yeast", "soil", "blood", "tissue", "saliva", "swab", "FFPE", "stool", "food", "water", "environmental", "insect", "algal". If ANY of these qualifiers appears next to the DNA extraction request, quote the matching kit(s) directly — do NOT clarify. If NO qualifier appears, send a clarification reply.
  CLARIFICATION FLOW for generic DNA extraction kit enquiries:
  (1) Search the HIMEDIA_Molecular_Biology tab with keyword "HiPurA DNA" or "DNA Purification" to fetch the LIVE list of available kits from the pricelist.
  (2) Filter results to MB-series purification kits only (exclude HTBM teaching kits).
  (3) Group results by sample type (Bacterial / Fungal / Plant / Mammalian / Viral / Yeast / Soil / Blood / Tissue / etc.) and prep size (50 prep, 100 prep, 250 prep).
  (4) Reply with a clarification request listing the SKUs grouped by sample type. Use this template (use prose, NOT a quotation table — no prices in the clarification):
    "For the DNA Extraction Kit, HiMedia offers several HiPurA® kits tailored to different sample types. Kindly confirm which option(s) match your application so we can finalise the quotation:
    [Listed below by sample type as fetched from pricelist, e.g.:]
    - Bacterial Genomic DNA: MB505 (50 prep), MB506 (250 prep)
    - Fungal DNA: MB543 (50 prep)
    - Plant Genomic DNA: MB529 (50 prep)
    - Mammalian Genomic DNA: MB504 (50 prep)
    - Viral DNA/RNA: [list from pricelist]
    - [other sample types as found in pricelist]
    Please advise which kit(s) you require, and we will revert with pricing and availability."
  Do NOT include prices in the clarification reply. Do NOT include the standard quote table. The dealer's follow-up will name the specific kit(s), after which you quote them in the normal format.
  This applies ONLY to "DNA extraction kit"-type generic requests. For OTHER generic molecular biology kit requests (RNA, PCR, plasmid, protein purification, etc.), continue with the standard search-and-quote flow — do not clarify those unless the dealer explicitly asks for help choosing.

  ## PROTEIN ESTIMATION / PROTEIN ASSAY (CRITICAL — common dealer request)
  When dealer asks for "protein assay", "protein estimation", "protein quantitation", "protein quantification", "Bradford assay", "Bradford reagent", "Lowry assay", "Biuret test", "BCA assay", or similar, quote from HiMedia's Protein Estimation product range. These are all ML- and MBT- prefix products in the HIMEDIA_Molecular_Biology tab.
  AVAILABLE HIMEDIA PROTEIN ESTIMATION PRODUCTS (search these SKUs directly):
  - H05-ML178 = Bradford Kit for Protein Estimation (complete kit with reagent + standard + protocol) — THIS IS THE DEFAULT for generic "protein assay" requests
  - H05-ML106 = Bradford Reagent (1X, ready to use)
  - H05-ML202 = 5X Bradford Reagent (concentrate)
  - H05-ML059 = Folin's Reagent (for Lowry method)
  - H05-ML122 = Biuret Reagent (for Biuret method)
  - H05-MBT129 = Protein Standard 1 mg/mL (BSA standard for calibration curve)
  - H05-MBT206 = Protein Standard 2 mg/mL (BSA standard)
  MAPPING dealer's wording → SKU:
  - "Protein assay" / "Protein estimation" / generic request → H05-ML178 (Bradford Kit — default, most commonly used method)
  - "Bradford" → H05-ML178 (kit) OR H05-ML106 (reagent only, if dealer prefers à la carte)
  - "Lowry" → H05-ML059 (Folin's Reagent) + H05-MBT129 (standard) — note: Lowry method also needs alkaline copper reagent which the dealer typically prepares from sodium carbonate, copper sulfate, sodium potassium tartrate (all in HiMedia GRM range)
  - "Biuret" → H05-ML122 (Biuret Reagent)
  - "BCA" / "Bicinchoninic Acid Assay" → HiMedia does NOT carry BCA. State this and offer Bradford (ML178) or Biuret (ML122) as alternative. Ask if either is acceptable.
  - "BSA standard" / "Protein standard" → H05-MBT129 (1 mg/mL) or H05-MBT206 (2 mg/mL)
  CRITICAL — DO NOT confuse "Protein assay" with these unrelated products:
  - CCK023 = EZAssay TBARS Estimation Kit for LIPID peroxidation — NOT a protein assay. TBARS measures malondialdehyde (lipid oxidation byproduct), not protein.
  - MB083 (Bovine serum albumin Ultrapure) = a PROTEIN itself (for use AS a standard or carrier), NOT a protein assay
  - HiPurA MB-series = nucleic acid purification kits, NOT protein assays
  When the dealer's quote already includes Coomassie Brilliant Blue (which is the Bradford dye) AND BSA (Bradford standard), the "Protein assay" item they're asking for is almost certainly the Bradford reagent or Bradford kit — quote H05-ML178 (Bradford Kit) or H05-ML106 (Bradford Reagent).

  ## MALONDIALDEHYDE (MDA) MAPPING
  When dealer asks for "MDA", "malondialdehyde", or "MDA standard", quote H05-RM3776 (1,1,3,3-Tetramethoxypropane). Pure MDA is unstable and not commercially available — it's commercially supplied as its acetal precursor 1,1,3,3-Tetramethoxypropane, which hydrolyzes to MDA in situ. This is the industry-standard MDA source used in TBARS assays and lipid peroxidation studies. Do NOT mark MDA as "Not Available" — search HiMedia for "tetramethoxypropane" or "RM3776" to find it. Search the HIMEDIA_Microbiology tab (RM-series chemicals live there).

  ## FINE CHEMICALS, BIOCHEMICALS, REAGENTS (GRM/RM series)
  Fine chemicals, biochemicals, pharmaceutical excipients, reagent-grade chemicals (e.g., Tween 80, Methylparaben, Sodium Bicarbonate, Yeast Extract, EDTA, Ethanol, solvents, buffers) → HiMedia GRM/RM series → search HIMEDIA_Microbiology tab. These have H05-GRM or H05-RM prefix codes.
  PCT vs GRM RULE — CRITICAL:
  - PCT series (e.g., PCT1535) = Plant Cell/Tissue Culture grade chemicals. ONLY offer PCT when the dealer explicitly mentions plant tissue culture, plant growth media, Murashige & Skoog, MS medium, or plant culture applications.
  - For ALL OTHER chemical requests (general lab, microbiology, pharmaceutical, food testing) → offer GRM or RM series ONLY. NEVER offer PCT for general chemical requests.
  - Example: Dealer asks for "Sodium Bicarbonate 500g" → search "GRM253" or "GRM849" directly. NEVER H05-PCT1535-500G unless dealer mentions plant culture.
  - When searching for chemicals, if PCT results appear alongside GRM/RM results, ALWAYS choose GRM/RM. PCT is a last resort only for plant culture applications.
  TRYPTIC SOYA AGAR (TSA) NOTE: M290, MH290, GM290, GMH290, and M1968 are ALL forms of TSA/Tryptone Soya Agar/Soybean Casein Digest Agar. When dealer asks for TSA or Tryptic Soya Agar, search "290" to find all variants — MH290-500G is rank 1 stocking item (RM 251). Do NOT use M1968 unless specifically requested by code.
  PACK SIZE MATCHING — CRITICAL: Always match the pack size the dealer requested. If dealer asks for 500g, offer 500g. NEVER offer 5kg or 10kg unless the dealer specifically requests bulk or larger sizes.
  - Example: Dealer asks for "Yeast Extract 500g" → offer H05-RM027-500G (stocking, RM 218). NEVER RM027F-5KG. The correct SKU is RM027, NOT RMG027 — there is no "RMG027" in the pricelist.

  ## NOT FOR EXPORT
  Before quoting any HiMedia product, check if the SKU appears in the HIMEDIA_Not_For_Export tab. If found, do NOT quote it.

  ## CHROMOGENIC AGAR — DISAMBIGUATION (CRITICAL)
  HiCrome/chromogenic media have multiple formulations with VERY similar names but DIFFERENT catalogue codes and prices. When a dealer asks for a HiCrome product and your search returns multiple different M-codes (not just pack size variants), you MUST quote ALL of them and ask the dealer to confirm. NEVER pick just one.
  Key examples:
  - "HiCrome ECC" → could be M1293 (ECC Agar), M1294 (ECC Selective Agar Base), M2056 (ECC Selective Agar Base Modified) — different products, RM 1,382 vs RM 2,195 vs RM 3,054
  - "EC O157" → could be M1574A (EC O157:H7 Agar) or M1575A (EC O157:H7 Selective Agar Base) — different products
  - "ECC" and "EC O157" are DIFFERENT product categories — ECC = generic E.coli/Coliform detection, EC O157 = specific O157:H7 strain detection
  If a dealer writes "HiCrome ECC Selective Agar (EC O157:H7 Selective agar base, modified)", they may be confused about the product names. Quote ALL matches from both "ECC" and "O157" searches and let them confirm.

  ## COMMON PRODUCT NAME ABBREVIATIONS (HiMedia)
  - VRBA = Violet Red Bile Agar (M049). Do NOT confuse with HiDip PCA-VRBA (HD009) which is a dip slide — completely different product. When dealer asks for "VRBA", search for "Violet Red Bile" to find M049.
  - TSI = Triple Sugar Iron Agar (M021). Search for "Triple Sugar Iron" or "TSI".
  - BHI = Brain Heart Infusion Broth (M210). Search for "Brain Heart Infusion".
  - BPW = Buffered Peptone Water (M614). Search for "Buffered Peptone".
  - EMB = Eosin Methylene Blue Agar (M317). Search for "Eosin Methylene" or "Levine".
  - VP REAGENTS vs VP MEDIUM: "Voges-Proskauer (VP) reagents" = Barritt Reagent A (H05-R029-100ML, RM 56) + Barritt Reagent B (H05-R030-100ML, RM 25). These are the two reagents used for the VP test — quote BOTH as separate line items. Do NOT confuse with M070F (Voges Proskauer Medium) or M070S (MR-VP Medium) which are the growth media/broth, not the test reagents.

  ## ITEMS NOT FOUND — DECISION FLOW
  When a dealer requests a HiMedia product and you cannot find it, follow this EXACT sequence before saying "Not Available":
  
  STEP 1 — Search by BASE CODE (strip the size suffix):
  - Dealer asks for "M467-100G" → search "M467" NOT "M467-100G"
  - Dealer asks for "M1743-250G" → search "M1743" NOT "M1743-250G"
  - This returns ALL pack sizes: 100G, 250G, 500G, etc.
  
  STEP 2 — Pick the best match from results:
  - If requested size exists in the pricelist with a price → quote it. Use the NetSuite Item Code if available, otherwise use the Vendor Code with the correct brand prefix (e.g., HiMedia "GRM103-100G" → "H05-GRM103-100G", LP "176018" → "L03-176018")
  - Items in the pricelist WITH a price but WITHOUT a NetSuite Item Code are INDENT items — quote them with status "Indent" and the lead time from get_lead_time. These are orderable from the manufacturer, just not stocked in Malaysia.
  - If requested size does NOT exist in the pricelist at all → offer the next available size
  - Example: M467-100G not found → M467-500G exists → quote M467-500G with note "available in 500g only"
  - CRITICAL: If a size doesn't exist in the pricelist AT ALL (no row, no price), do NOT invent it. A missing size = offer the alternative size, not a phantom entry.
  
  STEP 3 — Try synonyms if still not found:
  - Try chemical synonyms (Tween 80 → "Polysorbate", "GRM159")
  - Try web_search("himedialabs.com [product name] SKU") to find the correct code
  
  STEP 4 — Only after ALL steps fail:
  - State: "We regret to inform you that [item] is not available for sale in Malaysia."
  - NEVER say "not available for export" unless the item appears in the HIMEDIA_Not_For_Export tab
  
  CRITICAL: NEVER mark a HiMedia product as "Not Available" just because the specific pack size wasn't found. M467-100G not found ≠ M467 not available. Always try the base code search first.
  CRITICAL: Before marking ANY HiMedia item as "Not Available", you MUST try web_search("himedialabs.com [product name] SKU") to find the correct HiMedia catalogue code. Only mark "Not Available" AFTER web search also fails to find a match. The dealer may use a common/generic name that doesn't match our pricelist description — web search on himedialabs.com will translate it to the correct SKU.

  ## SERIES PRIORITY RULE
  HiMedia has multiple series for the same media product. The series prefix determines the type:
  - M = Standard dehydrated media (cheapest, most common)
  - MH = Harmonised Media (EP/USP/BP harmonised formulation — commonly required for pharmaceutical/QC labs)
  - GM = Granulated media (more expensive than M)
  - MV = HiVeg (vegetable-based, more expensive)
  - GMH = Granulated Harmonised Media
  - CMS = Certified media
  - MM = Modified formulation
  - NOTE: Both GM and GMH series are granulated. When quoting both GM and GMH variants together, make clear that both are granulated — GMH is the granulated harmonised version. Do not describe only the GM as "Granulated" while omitting it from GMH, as this is misleading.
  
  SEARCH STRATEGY: When searching for a HiMedia product, use a SHORT keyword that will match ALL series at once. Do NOT include series prefix in the search — just search the product name.
  - Example: For "Kings Medium B Base" → search "King" (returns M1544, GM1544, MV1235 etc. all at once)
  - Example: For "Tryptone Soya Agar" → search "Tryptone Soya" or "290" (returns M290, MH290, GM290, GMH290 etc. all at once)
  - Example: For "Columbia Blood Agar" → search "Columbia Blood" (returns M144, GM144 etc.)
  - This avoids needing multiple search loops to find different series.
  
  When a dealer asks for a generic product without specifying a series:
  - FIRST: From the search results, check stock for ALL matching series in ONE check_stock_batch call. If ANY series is ex-stock, offer the ex-stock one regardless of series.
  - IF NONE are ex-stock (all indent): Always offer the M series first (e.g., M144 not GM144). M series is the standard and cheapest option. Also offer MH series if it exists (pharmaceutical labs often need it). Only offer GM/MV/CMS if the M series doesn't exist or dealer requests it.
  - CODE-ENFORCED FLAG: Each HiMedia search result row now includes a "_himedia_recommended_default" boolean flag and a "_himedia_variant_note" string. When multiple variants of the same product code exist (e.g., M929, GM929, MV929), the system has already determined which variant to recommend based on the M-series-priority rule + price comparison. You MUST quote the row where "_himedia_recommended_default" is true and NOT the rows where it is false. Trust the flag. The flag defaults to M-series for generic requests; the agent's only responsibility is to override the flag IF the dealer EXPLICITLY asked for a specific series (e.g., "MH for pharmaceutical use", "MV vegan", "GM granulated"). If the dealer did not explicitly ask, ALWAYS follow the flag.
  - If the dealer specifically asks for MH (Harmonised) by code, quote that specific product — do NOT substitute with M series.
  - If the dealer specifically asks for a GM or MV product by code, quote that specific product.
  - Do NOT do multiple separate searches for different series — get them all in one search, then pick the right one.`
};

function getBrandInstructions(brand) {
  const key = brand.toUpperCase();
  if (BRAND_INSTRUCTIONS[key]) {
    return BRAND_INSTRUCTIONS[key];
  }
  return `No detailed instructions found for brand "${brand}". Use the general rules in the system prompt.`;
}

module.exports = { getBrandInstructions };
