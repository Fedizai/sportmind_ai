# SportMind — compliance and risk review

Written 2026-09-07 against the code in this repository. **I am not a lawyer and
this is not legal advice.** The pages I added are careful, standard-practice
drafts written against what the app actually does; the items in §1 are business
decisions a lawyer and an accountant should look at before you take more money.

Anything marked **BLOCKER** must be resolved before this site is relied on.

---

## 1. Risks that no code change fixes

### 1.1 Trading as an unregistered individual — **BLOCKER**

You told me you take card payments from users in Europe and bank transfers in
Tunisia, and that you are not registered as a business. That combination is the
single largest exposure here, and it is larger than anything on the site itself:

- **Payment providers.** Every card acquirer (Stripe, Paddle, PayPal Business,
  Lemon Squeezy) requires an identified, and usually registered, seller. Taking
  card money outside that framework risks the account being frozen with the
  balance held, which in practice means your users' money is stuck and you owe
  them refunds you cannot pay.
- **Tax.** Selling a digital service to EU consumers puts you inside the EU VAT
  regime from the first euro — there is no small-seller threshold for
  cross-border B2C digital services. The usual route is the non-Union OSS
  scheme, registering in one member state and filing quarterly.
- **Consumer law.** An EU consumer contracting with an unidentified counterparty
  keeps every one of their rights and loses none of their remedies. You carry
  all of the obligations with none of the protection a company gives you: an
  individual trader's liability is personal and unlimited.

**Do first:** register the business in Tunisia, then choose a payment provider
and complete its onboarding, then register for EU VAT (OSS) if you sell into the
EU. Until then, I would not take card payments from EU users at all.

### 1.2 No postal address is published — **accepted risk, decided**

The operators have decided not to publish a postal address, and that decision is
recorded here rather than argued with again. What it means, so it is not a
surprise later:

- The EU e-commerce directive art. 5 and French LCEN art. 6-III both require a
  site accessible to the public to give a **geographic address**, not only an
  email. An email alone does not satisfy either. In France, failing the LCEN
  identification duty is a criminal offence for the publisher.
- The realistic exposure is not a raid: it is that the obligation is the
  cheapest thing to be caught on if someone is already unhappy — a user in a
  refund dispute, a competitor, a regulator following up on something else.
- A **payment provider will require one anyway** during onboarding, and so will
  business registration. This is deferred, not avoided.

The pages state the position plainly — that SportMind is run by two private
individuals who are not registered as a business and that no postal address is
published, with the email given as the written-contact route — rather than
leaving a blank. **No address has been invented**, which was the alternative and
would have been a false statement about real people on the one page whose job is
to identify them truthfully.

If the position changes, a domiciliation service, a PO box, or the registered
office once the company exists all resolve it; fill `address` in
`studio/src/lib/legal/business.ts` and every page updates.

### 1.3 Tunisia is not an "adequate" country for EU data — **BLOCKER**

Your users' data is stored in the EU (`europe-west4`), which is good. But you are
in Tunisia, and Tunisia is not on the European Commission's adequacy list. Your
own access to that data from Tunisia is therefore a transfer outside the EEA and
needs a legal instrument — in practice the Commission's standard contractual
clauses plus a transfer impact assessment.

The privacy policy I wrote says transfers rely on SCCs. **Right now that
sentence is a promise, not a fact.** Either put the SCCs in place, or tell me and
I will reword the page to describe what is actually true.

### 1.4 Tunisian data-protection law — **BLOCKER**

Loi organique n° 2004-63 requires a **prior declaration** to the INPDP for
processing personal data, and **prior authorisation** — a higher bar — for
health data. SportMind processes health data as its core function. As far as I
can tell from the repository, neither has been filed.

### 1.5 You are two joint controllers, with nothing in writing between you

Fedy Zayen and Khaled Attia both decide why and how this data is processed, which
makes you **joint controllers** under GDPR art. 26. That article requires an
arrangement between you setting out who does what — in particular who answers
access and deletion requests, who talks to a regulator, and who tells users if
there is a breach. The essence of it has to be available to users; the privacy
policy now carries a paragraph saying you answer jointly and that either of you
can act on a request, which is the simplest honest arrangement and the one I
have written the pages against.

Two things follow from it:

- **Put it in writing between yourselves**, even one page. Without it, art. 26
  is unsatisfied and, more practically, neither of you knows who is on the hook
  for a 30-day deadline.
- **Neither of you is behind a company.** Joint controllers who are natural
  persons are personally liable, and in practice jointly and severally — a user
  or a regulator can pursue either of you for the whole of it. This is another
  reason §1.1 matters.

### 1.6 No data processing agreement on file

Google will act as your processor for Firebase, but only under the Cloud Data
Processing Addendum, which has to be accepted in the console. Check it is, and
keep a copy. Without it you have no art. 28 contract with your main processor.

### 1.7 AI that gives training and nutrition advice

The AI can produce a dangerous plan — an extreme deficit, a load progression
that injures someone, a nutrition target unsafe for a particular person. I have
added the disclaimers, and disclaimers help, but they do not cure advice that
causes harm. Two things worth doing:

- Put hard floors and ceilings on generated calorie targets and load jumps in
  code, so the model cannot emit an unsafe number even if it wants to.
- Consider excluding anyone who reports pregnancy, an eating disorder or a
  cardiac condition from automated nutrition planning entirely.

---

## 2. What I changed in this pass

| Area | Before | After |
|---|---|---|
| Privacy policy | none | `/privacy`, written against the actual collections, processors and retention |
| Terms | none | `/terms`, including the not-a-medical-device position |
| Cookie policy | none | `/cookies`, listing every stored key by name |
| Refunds | none | `/refunds`, with the EU 14-day withdrawal right |
| Legal notice | none | `/legal-notice` — required of individuals too, not only companies |
| Health-data consent | none | separate, un-ticked, explicit box at sign-up; recorded with a timestamp and policy version |
| Withdrawing it | impossible | a switch in Settings, because art. 7(3) requires it to be as easy as giving it |
| Minimum age | 13 | 16, in both the sign-up schema and onboarding |
| Video embeds | loaded YouTube/Vimeo on sight | click-to-load gate; `youtube-nocookie.com` and Vimeo `dnt=1` |
| `<html lang>` | always `en` | follows the reader's language |
| Skip link | none | first tab stop on every page |
| Nav contrast | 2.68:1 and 3.21:1 | 8.2:1 and 9.3:1 |
| Sign-up button | "Proceed to Payment" | "Create my account" — there is no payment step |
| Footer | logo and links | publisher, address, contact, five legal links, medical disclaimer |

## 3. Cookie consent

**This section changed when analytics was added.** The earlier version said
there was no measurement and therefore no banner; both halves of that are now
false, and the cookie policy was rewritten with them.

Google Analytics is now loaded, and it is the only non-essential thing on the
site. The banner exists because of it, and it satisfies the three rules that
actually get enforced:

- **Refusing is exactly as easy as accepting** — same row, same size, same
  weight, one click each. A prominent "accept" beside a muted "manage
  preferences" is the pattern regulators fine.
- **Nothing loads before a choice.** Verified rather than assumed: with no
  choice recorded there is no `gtag`, no `dataLayer` and no request to
  googletagmanager; both appear only after "Accept" is pressed. A script that
  loads and then waits has already stored its identifier.
- **Withdrawal is one click**, on `/cookies`, and it switches collection off in
  place rather than only on the next visit.

Everything else in browser storage is the sign-in session or a preference the
user set, which is exempt as strictly necessary and deliberately gets no
checkbox. The YouTube and Vimeo embeds keep their own click-to-load gate.

Two things worth knowing:

- **Google Analytics and EU data transfers.** GA sends data to Google, and
  several EU regulators have found GA deployments unlawful on transfer grounds.
  Turn on IP anonymisation and shorten data retention in the GA console, and
  consider whether a cookieless analytics tool (Plausible, Umami, Fathom) would
  serve you better — those need no banner at all, which would let you remove it.
- **The measurement ID `G-PZ1VMK9D1K`** ships in the client bundle. That is
  normal and not a secret; it identifies the property, it does not grant access
  to it.

## 4. Accessibility

Fixed: the `lang` attribute, the missing skip link, the nav contrast failures,
one unlabelled button on the coach lineup pitch, and the misleading sign-up
button. The legal pages are built with one `h1`, then `h2`s with no skipped
levels, real `<th scope="col">` on every table, and a 72-character measure.

Checked and already fine: **every `<img>` in the codebase has an `alt`** (8 of 8),
and the two other buttons my scan flagged turned out to have visible text labels.

Still open, in rough priority order:

- The bottom-nav labels are **9px**. That is below what most people can read
  comfortably, contrast notwithstanding. 11px would be better.
- I did not audit every form in the app for label association and focus order —
  I checked sign-up and settings. The dashboard forms deserve a pass.
- No automated accessibility test runs in CI. `@axe-core/playwright` on the
  public pages would catch regressions cheaply.

## 5. Content and images

- **No fake reviews or testimonials.** I looked; there are none, and the copy
  makes no numeric or superlative claims I could not support.
- Removed three unused copy strings from a deleted pricing section, one of which
  was "Most chosen" — social proof with nothing behind it.
- **Unsplash** photographs are used under the Unsplash Licence, which permits
  commercial use without attribution. Recorded in the legal notice.
- The 3D hero is generated in code; the body models derive from CC0 MakeHuman
  assets. Both recorded.
- `placehold.co` placeholder images are still referenced in eleven places. They
  are third-party requests that leak your users' IP addresses to a service you
  have no agreement with. Replace them with local assets.

## 6. Other things I noticed

- **`firestore.rules` is not deployed by App Hosting rollouts.** Pushing to
  `main` never updates it. If the rules in the console are behind the ones in
  this repo, your access control is not what you think it is. Verify, and deploy
  rules deliberately with `firebase deploy --only firestore:rules`.
- **Coaches can see their athletes' health data.** That is the point of the
  product, and the privacy policy now says so — but athletes should be able to
  see exactly who their coach is and leave a team.
- **IP geolocation** goes to `ipwho.is` and `geojs.io`, neither of which you have
  a contract with. Disclosed in the policy. Consider using the region Firebase
  already knows instead.
- **Business details.** Names and contact email are filled in. The postal
  address is deliberately absent (§1.2) and the matricule fiscal / VAT number
  are `null` until registration, at which point the pages will print them
  instead of "non immatriculé à ce jour". All of it lives in one file:
  `studio/src/lib/legal/business.ts`.
