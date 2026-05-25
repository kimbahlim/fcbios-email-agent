# FC-BIOS Email Quotation Agent — Handover Document

_Last handover update: May 2026. This document is the single reference for anyone taking over maintenance of the agent. Read it fully before making changes._

---

## 1. What this system is

An automated email agent that reads dealer pricing enquiries sent to `dealer_support@fcbios.com.my`, searches FC-BIOS pricelists, applies pricing rules, and drafts a professional quotation reply as a Gmail draft for a human to review and send.

A human always reviews before anything is sent. The agent only ever creates **drafts**.

---

## 2. The four systems that make up "the project"

The work is spread across four places. Only some of it lives in Claude. Understand all four before touching anything.

| System | What it holds | Access needed |
|---|---|---|
| **GitHub** (`kimbahlim/fcbios-email-agent`) | The actual agent code. The source of truth. | Collaborator / write access |
| **Railway** (project `ideal-intuition`) | Hosting. Auto-deploys from GitHub `main`. Live logs. | Project member access |
| **Google Sheet** (master pricelist) | All prices, stock, lead times, markup table. Read live by the agent. | Editor access |
| **Claude Project** | A *workspace* for diagnosing and editing the agent. Does NOT hold the agent itself. | Your own Claude account |

Key mental model: **Claude does not "hold" the agent.** The agent's brain is the code in GitHub (`systemPrompt.js`, `brandInstructions.js`). Claude is just an assistant that clones the repo each session to help you read output, diagnose issues, and push fixes. A fresh Claude with repo access has the full agent immediately.

---

## 3. Architecture / data flow

```
Dealer email → Gmail inbox (dealer_support@fcbios.com.my)
   → Zapier (2-step Zap: Gmail trigger → Webhook POST)
   → Railway server (Node.js, src/index.js receives webhook)
   → Claude agent (src/agent.js, tool-calling loop)
        ├─ searches Google Sheets pricelists (src/googleSheets.js)
        ├─ checks stock (NetSuite-synced Stock tab)
        ├─ fetches markup % (MASTER_INDEX tab)
        └─ applies FC-BIOS rules (src/systemPrompt.js + src/brandInstructions.js)
   → Gmail draft created (src/gmail.js), threaded with original email
   → Human reviews draft → sends
```

- **Anthropic model in use:** `claude-sonnet-4-20250514`
- **Cost targets:** single-item RM 1.50–2.00; multi-item under RM 4.00. Ideal single-item flow = 4 tool loops (search → stock batch → lead time → draft).

---

## 4. Repo structure

```
fcbios-email-agent/
├── src/
│   ├── index.js            (452 lines) Express server + Zapier webhook endpoint, email filtering, retry logic
│   ├── agent.js            (623 lines) Claude tool-calling loop; tool definitions & handlers
│   ├── systemPrompt.js     (951 lines) MAIN prompt — all quotation rules, pricing logic, frequent-brand rules
│   ├── brandInstructions.js(647 lines) On-demand rules for rare brands (TOMY, GYROZEN, MVE, IUL)
│   ├── brandDetect.js      (86 lines)  Brand detection from enquiry text
│   ├── googleSheets.js     (1097 lines)Sheets API client: search, stock, lead time, markup, rotor recommend
│   └── gmail.js            (551 lines) Gmail API, draft creation, label swap, magic-byte image detection
├── tests/
│   └── test-pack-parser.js
├── package.json            Dependencies (@anthropic-ai/sdk, express)
├── railway.toml            Railway deploy config (NIXPACKS, restart on failure)
└── README.md
```

---

## 5. The deploy workflow (FOLLOW THIS EXACTLY)

The standard cycle. Railway auto-deploys from GitHub `main` in ~1–2 minutes after push.

```
1. Clone:   git clone https://github.com/kimbahlim/fcbios-email-agent.git
2. Edit:    make changes to the relevant src/*.js file
3. CHECK:   node -c <file>   ← run on EVERY modified .js file. Non-negotiable.
4. Stage:   git add <files>
5. Commit:  git commit -m "clear description of what changed and why"
6. Push:    git push origin main
7. Wait:    Railway auto-deploys in ~1–2 min. Check Railway logs to confirm.
```

**The `node -c` syntax check on every modified file is mandatory.** A syntax error pushed to `main` crashes the Railway deploy and takes the agent offline. This has been the single most important discipline in this project.

Git commits must use:
- `user.email = kimberley_lim@fcbios.com.my` (update to the new owner's email)
- `user.name = Kim Lim` (update to the new owner's name)

---

## 6. Credentials inventory (LOCATIONS ONLY — never commit secret values)

All live as **environment variables in Railway** (Service → Variables). Never hardcode them; never commit them.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API (console.anthropic.com) |
| `GOOGLE_SHEETS_API_KEY` | Read pricelist sheet |
| `GOOGLE_SPREADSHEET_ID` | Master pricelist ID |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` | Gmail OAuth for draft creation |
| `GMAIL_USER_EMAIL` | dealer_support@fcbios.com.my |
| `WEBHOOK_SECRET` | Validates incoming Zapier webhooks |
| `PORT` | 3000 |

Master Google Sheet ID: `1EtFSEQvnnOx8sDyCJtvjuAlnTZbxRlbg8leG947wXD4`

### ⚠️ REQUIRED FIRST ACTIONS FOR THE NEW OWNER

1. **Rotate the GitHub Personal Access Token.** The previous PAT was stored in plaintext in a project doc and must be considered compromised. Revoke it at GitHub → Settings → Developer settings → Personal access tokens. Generate a NEW token under the new owner's own GitHub account so access is traceable to them.
2. **Make the GitHub repo PRIVATE.** It has been public. A repo with business pricing logic and SKU structure should not be public.
3. **Confirm Railway, Google Sheet, and Anthropic console access** are granted to the new owner, and remove the departing owner's access once confirmed.
4. **Update git identity** (`user.email`, `user.name`) to the new owner.

---

## 7. Pricing model — the single source of truth principle

This is the most important design principle. **Get it wrong and you reintroduce bugs that took weeks to fix.**

- **Prices** live ONLY in the Google Sheet pricelist tabs. Never hardcode a price in the prompt or brand instructions.
- **Markup %** lives ONLY in the `MASTER_INDEX` tab. The agent calls `get_price_increase(brand)` to fetch the live markup for each brand in a quote. Never hardcode a markup.
- `MASTER_INDEX` columns: `Tab Name | Brand | PL Year | Increase % | Currency | Notes`
- Example: pricelist shows RM 100, `get_price_increase` returns "3%" → quoted price = RM 100 × 1.03 = RM 103.

**Why this matters:** historically the brand instructions hardcoded prices (e.g. GYROZEN), which then drifted out of sync with the pricelist tab and produced wrong quotes. All hardcoded prices have since been removed in favour of live reads. **Do not reintroduce hardcoded prices.** If you find any, remove them.

Hardcoded exceptions that DO override MASTER_INDEX (tied to SKU prefix, not brand):
- `F07-` prefix (FC-BIOS local manufacture): always 0% markup, prices already final 2026.

**CRITICAL email rule:** Never expose pricing internals to dealers. The dealer sees only the final price number — never the markup %, the PL year, or phrases like "3% increase applied" or "2026 pricing". Violating this leaks pricing strategy.

---

## 8. Brand rules summary

**Frequent brands** (rules in `systemPrompt.js`): HiMedia, TARSONS, NASCO, LogTag, DispoZ, LP, etc.
**Rare brands** (rules in `brandInstructions.js`, loaded on demand via `get_brand_instructions(brand)`): TOMY, GYROZEN, MVE, IUL. This split keeps the base prompt small and saves cost on quotes that don't involve the rare brands.

Selected key rules (not exhaustive — read the code for the full set):
- **Brand priorities:** Consumables → DispoZ first, LP backup. Biological/chemical indicators → UGAIYA first, Mesa Labs backup. Rapid food safety → Prognosis first, Neogen backup.
- **LogTag / MinMax:** always add calibration option.
- **NASCO:** case pricing only; check dealer tier via `get_nasco_dealer_tier`; never mention tiers/amounts in the email.
- **TARSONS:** check ex-stock first; non-ex-stock lead time 3–4 months.
- **TOMY:** must ask for site name + state before quoting (JKKP requirement); prices already 2026 (0%).
- **GYROZEN:** Mini 6, Mini, and 1524 INCLUDE rotors; all other models sold WITHOUT rotor (quote rotor separately via `recommend_rotor`). Do NOT offer the Mini 6-RC variant. Do NOT over-quote — match models to the dealer's stated need. Prices read live from pricelist tab + `get_price_increase`.
- **MVE:** brand instruction block kept whole while volume is low.
- **MDA compliance disclaimer:** mandatory in Important Notes, exact wording — do not rephrase.

---

## 9. Agent tools (defined in src/agent.js)

`search_brand`, `search_brand_batch`, `check_stock`, `check_stock_batch`, `get_nasco_dealer_tier`, `get_lead_time`, `get_price_increase`, `list_brands`, `draft_email`, `get_brand_instructions`, `recommend_rotor`, `fetch_fcbios_product_url`, plus `web_search`.

**Batch tools (`search_brand_batch`, `check_stock_batch`) are mandatory for multi-item enquiries** to control the tool-loop count and cost.

---

## 10. Key learnings & gotchas (hard-won — don't relearn these the hard way)

- **Code fixes beat prompt-only rules for critical logic** (stock matching, retry, normalization). Sonnet sometimes ignores prompt-only rules for these; enforce them in code.
- **Exact-match before substring match, everywhere.** Prevents false-positive stock matches. This is critical in `googleSheets.js`.
- **Single source of truth for prices/markup** (see Section 7). Never hardcode.
- **`node -c` on every modified file before pushing** (see Section 5). Prevents Railway crashes.
- **Sheet data is cached** (per-tab TTL in `googleSheets.js`). Price edits in the sheet take effect within the cache window, not instantly.
- **Output Excel files for pricelist updates must exactly mirror the master tab format** — single tab, no summaries, no extra highlights, no header renaming, matching column widths and freeze panes — so they paste straight into Google Sheets.
- **Messy forwarded emails** with many MIME parts cause high loop counts; watch cost.
- **MIME type mismatch** (declared PNG, actual JPEG) breaks the Vision API; magic-byte detection is implemented in `gmail.js`.
- **`processedMessages` is in-memory** and resets on every Railway redeploy — stuck/failed emails may reprocess after a deploy.
- **Don't over-quote equipment.** Match the number of models to the dealer's stated need; send clarifying questions for vague requests.

---

## 11. How the new owner sets up their own Claude Project

Claude's memory and Projects are per-account and cannot be transferred between users. The new owner creates their own:

1. Create a new Claude Project (e.g. "FC-BIOS Email Agent").
2. Upload these files as Project knowledge: this `HANDOVER.md`, the agent documentation, the architecture HTML, and the current master pricelist export.
3. Paste the Project Instructions block (Section 12) into the Project's custom instructions.
4. In the first chat, have Claude clone the repo using the NEW PAT and confirm it can read `src/systemPrompt.js`.

From there, the new Claude can assist with the same edit → check → commit → push workflow.

---

## 12. Project Instructions block (paste into the new Claude Project settings)

```
This project maintains the FC-BIOS Email Quotation Agent — a Node.js agent that
reads dealer pricing enquiries, searches Google Sheets pricelists, applies FC-BIOS
pricing rules, and drafts Gmail quotation replies. Hosted on Railway (project
ideal-intuition), auto-deploying from GitHub kimbahlim/fcbios-email-agent (main branch).

MY ROLE: I review real agent output, diagnose rule gaps, and push code fixes. I prefer
code-level fixes over prompt-only rules for critical logic (stock matching, retry,
normalization), because Sonnet can ignore prompt-only rules for these.

DEPLOY WORKFLOW (always follow): clone repo → edit src/*.js → run `node -c` on EVERY
modified .js file → git add → git commit → git push origin main → Railway auto-deploys
in ~1-2 min. The node -c syntax check is mandatory; a syntax error crashes the deploy.
Git identity: user.email and user.name set to the current owner.

PRICING PRINCIPLE (critical): prices live ONLY in the Google Sheet pricelist tabs;
markup % lives ONLY in the MASTER_INDEX tab (fetched via get_price_increase). NEVER
hardcode prices or markup in the prompt or brand instructions. Never expose pricing
internals (markup %, PL year, "price increase") to dealers in the email.

KEY FILES: src/systemPrompt.js (main rules), src/brandInstructions.js (on-demand rules
for TOMY/GYROZEN/MVE/IUL), src/googleSheets.js (search/stock/markup/rotor),
src/agent.js (tools), src/gmail.js (drafts), src/index.js (server/webhook).

When I paste agent output or usage logs, help me diagnose issues, propose a code fix,
and prepare the commit. When I paste pricelist updates, produce paste-ready Excel that
mirrors the master tab format exactly. Calculate costs in RM when I share usage logs.
```

---

## 13. Open / pending items (as of handover)

_Update this list as items are closed._

1. Add Rogosa & Sharpe Broth rows + 3 new Rogosa rows to EPL (HIMEDIA_Microbiology tab).
2. Add MVE Cryoshipper Qwick 10/100 (M02-14138772) to MVE pricelist tab.
3. Monitor TOMY/GYROZEN/MVE/IUL after the brand-instruction split.
4. Non-dealer enquiry policy unresolved.
5. Paste GOSSELIN product data.
6. **GitHub repo still PUBLIC — switch to private (see Section 6).**
7. Pending MVE brand manager reply on Next-Gen SC 4/2V and SC 4/3V main units (not in pricelist; agent told NOT to recommend).
8. MVE legacy "U"-suffix duplicate rows — currently excluded via prompt rule; cleaner fix is to remove from the MVE pricelist tab.
9. HiMedia RPM Plates tab — no 2026 dealer pricing source yet (entire tab unpriced); chase HiMedia.
10. 104 HiMedia MB items show #N/A in HiMedia's own dealer sheet — confirm if active/discontinued.
11. "Mini 6-RC = reverse spin" claim was unverified; the variant is now suppressed in quotes. Verify with Gyrozen if you ever want to reinstate it.
12. Micropipette enquiries (Gilson/Eppendorf devices): TARSONS has no micropipette *devices* in the pricelist (only tips/aids/racks). Decide on a standard response.

---

## 14. Quick reference

- **Repo:** https://github.com/kimbahlim/fcbios-email-agent (make private)
- **Railway project:** ideal-intuition
- **Master Sheet ID:** 1EtFSEQvnnOx8sDyCJtvjuAlnTZbxRlbg8leG947wXD4
- **Model:** claude-sonnet-4-20250514
- **Agent inbox:** dealer_support@fcbios.com.my
