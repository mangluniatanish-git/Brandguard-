# Evaluation Testset Ground-Truth Labels

This document lists every sample in `testset.json` and its expected labels for manual inspection.

**Total Samples**: 40 (16 clean samples, 24 samples with planted compliance violations).

---

### Sample 1: `sample-01`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Say farewell to chemical-filled moisturizers and nourish your barrier with botanical precision."
- **Expected Labels / Findings** (1):
  1. **Category**: `tone` | **Rule ID**: `TONE-01` | **Target Quote**: "chemical-filled"

### Sample 2: `sample-02`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Our restorative serum is formulated with 2% encapsulated bakuchiol to gently soothe sensitive skin."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 3: `sample-03`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Experience our miracle broth infused with cold-pressed rosehip seed oil from certified organic cooperatives."
- **Expected Labels / Findings** (1):
  1. **Category**: `terminology` | **Rule ID**: `TERM-02` | **Target Quote**: "miracle broth"

### Sample 4: `sample-04`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Clinically proven to cure cystic acne and eradicate blemishes completely."
- **Expected Labels / Findings** (1):
  1. **Category**: `claim` | **Rule ID**: `CLAIM-03` | **Target Quote**: "cure cystic acne"

### Sample 5: `sample-05`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Bottles are molded with 70% post-consumer recycled flint glass for mindful packaging."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 6: `sample-06`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Achieve flawless radiant skin in just one night with our overnight oil treatment."
- **Expected Labels / Findings** (1):
  1. **Category**: `claim` | **Rule ID**: `CLM-05` | **Target Quote**: "in just one night"

### Sample 7: `sample-07`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Our formula is 100% eco-friendly and guarantees zero carbon impact."
- **Expected Labels / Findings** (2):
  1. **Category**: `terminology` | **Rule ID**: `TERM-08` | **Target Quote**: "100% eco-friendly"
  2. **Category**: `terminology` | **Rule ID**: `TERM-08` | **Target Quote**: "zero impact"

### Sample 8: `sample-08`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Non-comedogenic and dermatologically tested for sensitive barrier support."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 9: `sample-09`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Our patented Bio-Fermented Botanical Complex delivers lasting cellular hydration."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 10: `sample-10`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Erase 10 years of wrinkles within 48 hours using our youth potion."
- **Expected Labels / Findings** (2):
  1. **Category**: `tone` | **Rule ID**: `TONE-09` | **Target Quote**: "erase 10 years of wrinkles"
  2. **Category**: `claim` | **Rule ID**: `CLM-05` | **Target Quote**: "within 48 hours"

### Sample 11: `sample-11`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Leaping Bunny certified cruelty-free with no animal testing at any stage of development."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 12: `sample-12`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Obsessed with this glow! Check the link in my bio for special discounts. #dewy #skincare #natural #sp"
- **Expected Labels / Findings** (1):
  1. **Category**: `disclosure` | **Rule ID**: `DISC-04` | **Target Quote**: "#sp"

### Sample 13: `sample-13`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "#Ad | Paid partnership with Verdant Skin. Visibly calms redness and supports moisture barrier."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 14: `sample-14`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Voted the No.1 best serum in the world by beauty editors everywhere."
- **Expected Labels / Findings** (1):
  1. **Category**: `terminology` | **Rule ID**: `TERM-02` | **Target Quote**: "No.1"

### Sample 15: `sample-15`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "94% of clinical trial participants reported improved barrier hydration within 14 days."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 16: `sample-16`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Our formula gives you 99% wrinkle elimination in 3 days."
- **Expected Labels / Findings** (2):
  1. **Category**: `claim` | **Rule ID**: `CLM-05` | **Target Quote**: "99%"
  2. **Category**: `claim` | **Rule ID**: `CLM-05` | **Target Quote**: "in 3 days"

### Sample 17: `sample-17`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Discover our pure youth elixir with 100% all-natural botanical oils."
- **Expected Labels / Findings** (1):
  1. **Category**: `claim` | **Rule ID**: `CLM-10` | **Target Quote**: "100% all-natural"

### Sample 18: `sample-18`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Ethically harvested cold-pressed rosehip seed oil from certified organic cooperatives in Patagonia."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 19: `sample-19`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Free from synthetic fragrance, phthalates, parabens, and artificial coal-tar dyes."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 20: `sample-20`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Guaranteed to heal eczema and soothe dermatitis instantly."
- **Expected Labels / Findings** (1):
  1. **Category**: `claim` | **Rule ID**: `CLAIM-03` | **Target Quote**: "heal eczema"

### Sample 21: `sample-21`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Manufactured in an ISO 22716 Good Manufacturing Practice certified facility."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 22: `sample-22`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Keep your daily routine clean and toxic-free with our gentle foaming wash."
- **Expected Labels / Findings** (1):
  1. **Category**: `tone` | **Rule ID**: `TONE-01` | **Target Quote**: "toxic-free"

### Sample 23: `sample-23`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Love this new oil! So nourishing on winter skin. #collab #skincare"
- **Expected Labels / Findings** (1):
  1. **Category**: `disclosure` | **Rule ID**: `DISC-04` | **Target Quote**: "#collab"

### Sample 24: `sample-24`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "#Ad Loving this daily soothing moisturizer formulated with dermatologically tested botanical extracts."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 25: `sample-25`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Here is our product packaging: ![](amber_bottle.png)"
- **Expected Labels / Findings** (1):
  1. **Category**: `accessibility` | **Rule ID**: `ACC-06` | **Target Quote**: "![](amber_bottle.png)"

### Sample 26: `sample-26`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Here is our product packaging: ![Verdant Skin Amber Glass Bottle](amber_bottle.png)"
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 27: `sample-27`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Sweeps away dead cells with zero impact on the environment."
- **Expected Labels / Findings** (1):
  1. **Category**: `terminology` | **Rule ID**: `TERM-08` | **Target Quote**: "zero impact"

### Sample 28: `sample-28`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "This serum will cure acne in 7 days without drying."
- **Expected Labels / Findings** (2):
  1. **Category**: `claim` | **Rule ID**: `CLAIM-03` | **Target Quote**: "cure acne"
  2. **Category**: `claim` | **Rule ID**: `CLM-05` | **Target Quote**: "in 7 days"

### Sample 29: `sample-29`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Formulated with Bio-Fermented Botanical Complex and plant-derived Bakuchiol."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 30: `sample-30`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Say no to chemical-filled products and switch to our 100% all-natural cream."
- **Expected Labels / Findings** (2):
  1. **Category**: `tone` | **Rule ID**: `TONE-01` | **Target Quote**: "chemical-filled"
  2. **Category**: `claim` | **Rule ID**: `CLM-10` | **Target Quote**: "100% all-natural"

### Sample 31: `sample-31`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Calms surface redness and supports skin barrier longevity through mindful hydration."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 32: `sample-32`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Ranked #1 miracle formula for curing redness and blemishes."
- **Expected Labels / Findings** (1):
  1. **Category**: `terminology` | **Rule ID**: `TERM-02` | **Target Quote**: "#1"

### Sample 33: `sample-33`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Tested by independent clinical dermatologists on 52 participants with barrier-compromised skin."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 34: `sample-34`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Look at this product shot: <img src="tonic.jpg" alt="">"
- **Expected Labels / Findings** (1):
  1. **Category**: `accessibility` | **Rule ID**: `ACC-06` | **Target Quote**: "<img src="tonic.jpg" alt="">"

### Sample 35: `sample-35`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Infused with 85% natural moisture enhancers not found anywhere else."
- **Expected Labels / Findings** (1):
  1. **Category**: `claim` | **Rule ID**: `CLM-05` | **Target Quote**: "85%"

### Sample 36: `sample-36`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "So gentle that it permanently eliminates cystic acne for good."
- **Expected Labels / Findings** (1):
  1. **Category**: `claim` | **Rule ID**: `CLAIM-03` | **Target Quote**: "eliminates cystic acne"

### Sample 37: `sample-37`

- **Ground-Truth Classification**: ✅ Clean Copy (Zero Violations Expected)
- **Content Text**:
  > "Follow with broad-spectrum SPF 30+ daytime protection when using exfoliant actives."
- **Expected Labels / Findings** (0):
  - *None (Clean sample)*

### Sample 38: `sample-38`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Erase 10 years of wrinkles overnight with our miraculous barrier elixir."
- **Expected Labels / Findings** (1):
  1. **Category**: `tone` | **Rule ID**: `TONE-09` | **Target Quote**: "erase 10 years of wrinkles"

### Sample 39: `sample-39`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Check out my partner discount code for 20% off! #partner #skincare"
- **Expected Labels / Findings** (1):
  1. **Category**: `disclosure` | **Rule ID**: `DISC-04` | **Target Quote**: "#partner"

### Sample 40: `sample-40`

- **Ground-Truth Classification**: ⚠️ Violation Present
- **Content Text**:
  > "Clinically proven to cure eczema in just 48 hours with 100% eco-friendly ingredients."
- **Expected Labels / Findings** (3):
  1. **Category**: `claim` | **Rule ID**: `CLAIM-03` | **Target Quote**: "cure eczema"
  2. **Category**: `claim` | **Rule ID**: `CLM-05` | **Target Quote**: "in just 48 hours"
  3. **Category**: `terminology` | **Rule ID**: `TERM-08` | **Target Quote**: "100% eco-friendly"

