# Manifesto Draft Review

**Date:** 2026-04-30
**Scope:** Four AI-drafted manifestos in `content/candidates/` (welfare-expansion, market-reform, regional-identity, reformist-outsider), reviewed against a five-point checklist.
**Provenance:** AI self-review of AI-drafted content. **This is not a substitute for the cross-archetype human review described in CANDIDATE_CONTENT_BRIEF.md L98–104.** It surfaces specific flags an author can act on; it does not replace the two-reader political-balance check (L101) or the symmetry CI test (L102).
**Status:** Drafts remain `[DRAFT — NOT NEUTRAL UNTIL HUMAN-REVISED]`. Findings below should be addressed before the symmetry CI test runs.

---

## Item 1: Vague-band sophistication parity

**FLAG: Reformist-outsider's vague commitments are structurally more sophisticated than the other three archetypes'.** This violates the CANDIDATE_CONTENT_BRIEF.md anti-pattern §1 ("Do not write a 'vague' commitment that is structurally weaker than another archetype's vague commitment").

Specific instances in `content/candidates/reformist-outsider/manifesto.md` lines 132–155:

| # | Text | Rhetorical device |
|---|---|---|
| 19 | "Justice for women, faster than today; slower than tomorrow is too late." | antithetical parallelism + temporal wordplay |
| 20 | "Make corruption a question of who got caught, not who got away." | chiasmus + antithesis |
| 23 | "Welfare for those who need it, not for those who arranged it." | chiasmus |
| 18 | "Healthcare without bribes; queues without favouritism." | parallel ellipsis |
| 21 | "Schools that work for the children, not for the system." | inversion |
| 24 | "Every legitimate Bhabanipur voter on the roll; every illegitimate inclusion off it." | parallel-symmetry / chiasmus |

Compare against the rhetorical floor of the other three:

- Welfare-expansion #22: *"Stand with the farmer who feeds Bengal."* — declarative, no device
- Welfare-expansion #23: *"Leave no family in Bhabanipur behind."* — declarative
- Market-reform #22: *"Move people, goods, and ideas through Bhabanipur faster."* — tricolon, simple
- Regional-identity #23: *"No genuine Bengali voter shall be erased."* — declarative

**Action:** rewrite reformist-outsider lines 17–24 to match the declarative-only register the other three use. Strip the chiasmus. Specifically rewrite #19, #20, #21, #23, #24.

---

## Item 2: Dual-issue mapping risks

Commitments the Phase 4 classifier could plausibly route to two different `issueId`s. Listed by descending risk severity.

| # | Commitment (paraphrased) | Tagged | Could also map to |
|---|---|---|---|
| RO-#1 | Publish all 18,000+ state-government job vacancies on a citizen portal | `employment` | `corruption` (transparency) |
| RO-#2 | Hospital pricing/wait-time/SLA dashboard | `healthcare` | `corruption` (transparency) |
| RO-#5 | SSC/TET merit lists + answer-script access | `education` | `corruption` (recruitment-irregularity context) |
| RO-#6 | KMC public-works tracker | `infrastructure` | `corruption` |
| RO-#7 | 100% biometric verification of welfare beneficiaries | `welfare` | `corruption` (anti-leakage) |
| RO-#8 | SIR Audit Cell with case-by-case review | `citizenship_identity` | `corruption` (electoral-integrity audit) |
| WE-#1 | Recruit 12,000 paramedical and ASHA-supervisor positions | `employment` | `healthcare` (ASHA workers are health-frontline) |
| WE-#5 | Hire 4,500 primary-school teachers via SSC | `education` | `employment` (job creation) + `corruption` (SSC reform context) |
| RI-#1 | 70% Group C/D reservation for state-board-educated candidates | `employment` | `citizenship_identity` (Bengali-domicile preference is identity-coded in your taxonomy) |
| RI-#4 | Restore Bengali-medium primary instruction in 240 schools | `education` | `citizenship_identity` |
| MR-#4 | 6,000 industry-aligned BBA/B.Tech seats via PPP | `education` | `employment` |
| MR-#7 | 60% DBT conversion with biometric authentication | `welfare` | `corruption` (anti-leakage framing) |

The reformist-outsider has a structural problem: 6 of 8 highly-specific commitments are dual-codable as `corruption` because the archetype's voice *is* transparency-coded. This will likely surface as classifier disagreement during Phase 4 testing and may distort the deterministic "What's Missing" detection.

**Action:** consider adding a tie-breaker rule to the classification prompt (e.g., *"when a commitment names both a target service area and a transparency mechanism, prefer the service-area issue ID"*), or accept that reformist-outsider's commitments will skew toward `corruption` in classification and account for that in the symmetry-test interpretation.

---

## Item 3: Bhabanipur boundary references

Bhabanipur Vidhan Sabha (AC #159) per Delimitation 2008 covers KMC wards **70, 71, 72, 73, 74, 77** (six wards). Areas: Bhabanipur proper, Padmapukur, Bakulbagan, Chakraberia, Kalighat (ward 73). Adjacent ACs: Rashbehari, Tollygunge, Kolkata Port, Ballygunge.

### Out-of-constituency references — flag

| File | # | Reference | Issue |
|---|---|---|---|
| welfare-expansion | #3 | "Bhabanipur, Alipore, and Kalighat thanas" | **Alipore** is in Tollygunge AC, not Bhabanipur. Kalighat is plausibly Bhabanipur (ward 73). |
| market-reform | #8 | "Bhabanipur and Alipore commercial buildings" rooftop solar | Alipore is in Tollygunge AC. |
| market-reform | #14 | "Harish Mukherjee Road and Asutosh Mukherjee Road corridors" drainage | OK for Harish Mukherjee; Asutosh Mukherjee Road straddles Bhabanipur/Rashbehari ACs. |
| market-reform | #6 | "Bhabanipur–Tollygunge metro rail extension" | Tollygunge is a separate AC; metro extension framing positions it as Bhabanipur's project. |
| market-reform | #32 | "Bhabanipur–Howrah corridor" — 35 electric buses | Howrah is **across the Hooghly in Howrah district**. No standard Bhabanipur–Howrah bus corridor exists. **Likely error.** |
| regional-identity | #3 | "Bhabanipur, Tollygunge, and Alipore divisions" — women constables | Tollygunge and Alipore are separate ACs. |
| regional-identity | #6 | "Hooghly between Bhabanipur and Princep Ghat" — 14km riverfront | **Princep Ghat is in central Kolkata** (near Maidan), several constituencies north of Bhabanipur. |
| regional-identity | #8 | "East Kolkata Wetlands fringe" — 1.5 lakh trees | **East Kolkata Wetlands** are east of Kolkata in Bhangar / Bidhannagar / Sonarpur ACs, **not Bhabanipur**. |
| reformist-outsider | #3 | "Bhabanipur, Alipore, Howrah, and Tollygunge sub-divisions" — 4 fast-track courts | 3 of 4 are separate ACs. |

### Factual error — flag

| File | # | Reference | Issue |
|---|---|---|---|
| welfare-expansion | #8 | "5 wards of Bhabanipur" | Bhabanipur AC has **6 wards** (70, 71, 72, 73, 74, 77), not 5. |
| reformist-outsider | #6, #8 | "5 Bhabanipur wards" (twice) | Same — should be 6 wards. |

### Uncertain — verify

| File | Reference | Note |
|---|---|---|
| welfare-expansion | "Bhabanipur Sub-divisional Hospital" | Uncertain whether a hospital with this exact name exists. Likely fictional; verify against actual SDH naming for South Kolkata. |
| All four | "South Kolkata" framing | South Kolkata is a parliamentary constituency containing multiple ACs including Bhabanipur — fine as a regional/admin reference, but ambiguous when used as a constituency target. |
| regional-identity | "Adi Ganga corridor" | Adi Ganga passes through Bhabanipur (Padmapukur side) but extends through Tollygunge and Behala. Multi-AC; framing as Bhabanipur-only is misleading. |

---

## Item 4: Resemblance to real campaign material

**FLAG 1: Welfare-expansion candidate's policy frame is TMC-coded.** Anuradha's specific commitments expand Lakshmir Bhandar (₹1,000→₹1,500, named explicitly with the AITC's flagship-scheme nomenclature), Kanyashree, Swasthya Sathi, Khadya Sathi. All four are TMC-introduced schemes. A West Bengal viewer will read this candidate as a TMC continuity candidate — recognizability risk per CANDIDATE_CONTENT_BRIEF.md L92. No language is lifted verbatim, but the policy fingerprint maps cleanly onto AITC.

**FLAG 2: Party name "Swachh Shasan Manch" is BJP-coded.** "Swachh" carries strong association with the central government's "Swachh Bharat Abhiyan." The reformist-outsider candidate's anti-corruption framing combined with this party name will read as a BJP-aligned state offshoot to many viewers. Recognizability risk.

**FLAG 3: Regional-identity's Matua-documentation framing is currently politically contested.** The Matua community is in active contestation between TMC and BJP over CAA implementation. Debarghya's framing — "contesting irregular SIR-linked deletions" + "Matua-community applicants" — aligns with the current TMC critique posture. Will read as TMC-leaning, despite the regional-identity archetype framing.

**FLAG 4: Specific number "71 days to 21 days" (market-reform #1)** — fabricated, but the rhetorical move "reduce X bureaucratic time from N to N/3" is a recurring trope in BJP economic-reform rhetoric in WB. Conceptual proximity, not verbatim.

**FLAG 5: "70% reservation for state-board-educated candidates" (regional-identity #1)** — conceptually echoes both the Karnataka job-quota debates and the early Shiv Sena "sons of soil" agenda. Not verbatim, but the policy concept itself is recognizable.

**No verbatim slogan matches detected.** No "Maa Mati Manush", no "Khela hobe", no "Ek vote Ek note", no "Sabka Saath Sabka Vikas".

---

## Item 5: Voice-based archetype identifiability

**Yes.** All four archetypes are immediately identifiable from voice alone, without front-matter. Tells per archetype:

### Welfare-expansion (Anuradha)
- **Lexical:** "dignity", "Bhandar", "transfer", "subsidy", "no family is pushed into debt", "leave no family behind", "stand with the farmer"
- **Scheme fingerprint:** Lakshmir Bhandar (named with rupee figures), Kanyashree, Swasthya Sathi expansion, Khadya Sathi, mid-day meal supplement
- **Stance:** protective, redistribution-first, fiscal-stimulus orientation
- **Single most diagnostic sentence:** *"Raise Lakshmir Bhandar monthly transfer from ₹1,000 to ₹1,500"* — only welfare-expansion would lead with a direct cash-transfer increase

### Market-reform (Rohit)
- **Lexical:** "single-window", "PPP", "DBT", "biometric authentication", "leakage", "competitive", "industry-aligned", "growth"
- **Scheme fingerprint:** Industrial Approvals Single-Window Reform, e-procurement portal, electric buses, rooftop solar PPP
- **Stance:** technocratic, process-simplification, ease-of-doing-business
- **Single most diagnostic sentence:** *"Reduce the average factory-establishment regulatory approval time from 71 days to 21 days"*

### Regional-identity (Debarghya)
- **Lexical:** "Bengali-medium", "Bengali-fluent", "Tagore", "soil", "rooted", "in our own language", "Matua"
- **Scheme fingerprint:** Bengali-medium primary restoration, Cultural-Industries Promotion Cell, state-board reservation, Citizenship Documentation Assistance Cells
- **Stance:** identity-rooted, federalism-emphasized, language-protectionist
- **Single most diagnostic sentence:** *"Reserve 70 percent of state-government Group C and D vacancies … for candidates educated through Class 12 in Bengali-medium or state-board institutions"*

### Reformist-outsider (Ananya)
- **Lexical:** "tracker", "audit", "dashboard", "publicly accessible", "Lokayukta", "merit list", "answer-key challenges", "transparency"
- **Scheme fingerprint:** SSC transparency portal, Asset Disclosure Bill, KMC public-works tracker, SIR Audit Cell, Citizen Audit Council
- **Stance:** process-led, audit-first, anti-incumbent
- **Single most diagnostic sentence:** *"Pass a Bhabanipur-Constituency Asset Disclosure and Lokayukta Strengthening Bill within the first legislative session"*

**Implication:** the calibration-band structure is parallel (8/8/8/11 per candidate), but the rhetorical sophistication *within* the vague band is not (see Item 1). The symmetry CI test will catch this only in aggregate score distribution; the **content-level** parity that CANDIDATE_CONTENT_BRIEF.md L88 requires has to be enforced manually during the human review pass and is not enforceable from voice diagnostics alone.

---

## Required actions before lifting the DRAFT flag

Distilled from the five items above, in priority order:

1. **Rewrite reformist-outsider lines 17–24** to drop chiastic and antithetical structures. Match the declarative-only register of the other three archetypes' vague bands. (Item 1.)
2. **Fix all out-of-constituency references** — replace Alipore, Tollygunge, Howrah, Princep Ghat, East Kolkata Wetlands with Bhabanipur-AC-bounded alternatives, OR reframe the commitment as a state-level / sub-divisional initiative without claiming the area is part of Bhabanipur. (Item 3.)
3. **Correct the ward count from 5 to 6** in three places (welfare-expansion #8, reformist-outsider #6 and #8). (Item 3.)
4. **Reconsider party name "Swachh Shasan Manch"** — too BJP-coded. Pick a less recognizably-aligned fictional name. (Item 4.)
5. **Reconsider welfare-expansion's reliance on naming TMC-flagship schemes** (Lakshmir Bhandar, Kanyashree, Swasthya Sathi, Khadya Sathi) — either spread these scheme references across multiple archetypes (so all four candidates engage with them, not just welfare-expansion), or substitute neutrally-named state schemes. (Item 4.)
6. **Verify or replace "Bhabanipur Sub-divisional Hospital"** — confirm whether a hospital with this exact name exists in the constituency. (Item 3.)
7. **Decide on classifier tie-breaker rule for reformist-outsider commitments** — six of eight specific commitments are dual-codable as `corruption`. Either add a service-area-preference rule to the classification prompt or accept the skew when reading symmetry-test output. (Item 2.)
8. **Re-examine Matua-community framing in regional-identity #7** — current wording aligns with TMC's critique posture on SIR; soften or rebalance to neutral procedural framing. (Item 4.)
9. **Run the cross-archetype human review pass** prescribed by CANDIDATE_CONTENT_BRIEF.md L98–104 — read all four straight through, show to two readers on opposite sides of WB political opinion, only run the symmetry CI test after both have responded.

After items 1–8 are addressed, item 9 (human review) becomes the gate to lifting the DRAFT flag and running the symmetry harness.
