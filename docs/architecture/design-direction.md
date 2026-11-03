# Design direction (web app)

The brand tokens (palette, Poppins + Inter, Lucide, radii, spacing) come from the Brand & Design
System PDF and are not up for debate. This note records the choices made _inside_ those limits, and why.

## What the product is

A digital stamp card. People collect stamps at the businesses they visit. The most characteristic
object in that world is the paper punch card, so the interface is built around one.

## The one memorable thing

**The stamp card, and the stamp being pressed.** It appears where it carries meaning:

- Sign-up: each of the four slots is a real step (about you, verify by, code, member). A slot is inked
  when its step is done. The last slot, "Member", is the first reward and is the only amber thing on
  the page (the brand reserves amber for reward moments).
- Landing page: a labelled sample card.

Stamps are pressed only after the server confirms the step (the spec forbids success animation before
the backend commits). With `prefers-reduced-motion`, they simply appear.

Everything around the card stays quiet: no card grid, no gradients, no decorative icons.

## Choices made on purpose

| Area | Decision | Reason |
| --- | --- | --- |
| Layout | Split screen: emerald panel with the card on the left, plain form on the page background on the right. On phones the panel collapses into a compact band with the card as a progress strip. | The card doubles as the progress indicator, so there is no separate stepper. |
| Forms | Fields sit directly on the page background, left-aligned, one 400px column. No wrapping card. | Avoids the stack-of-identical-rounded-cards look. |
| Radii | Not uniform: inputs 8, buttons 10, ticket 14, stamp slots circular. | Matches the brand ranges and keeps hierarchy visible. |
| Ticket | Perforated side notches (CSS mask) and one soft shadow. | It is the only raised object on the screen. |
| Ink | Emerald 800 ink with a turbulence displacement filter and a slight random tilt per slot. | Hand-stamped, not stickers. |
| Type | Poppins for headings, buttons, navigation. Inter for everything else; tabular numerals for codes and balances. Sentence case throughout; no tracked caps, no eyebrow labels. | Brand fonts used with restraint. |
| Copy | Plain verbs, sentence case. A button names what it does ("Send code", "Create account"), and the same word is used again in the confirmation. Errors say what went wrong and what to do; they never apologise. | |
| Mascot | Only in the empty state of the member home. The logo mark appears in the header. | Brand: friendly in the customer app, restrained elsewhere. |

## Accessibility deviations from the brand sheet

Every foreground/background pairing was checked against WCAG 2.2 AA. Four of the sheet's own
combinations fail, so the app does the following:

| Brand pairing | Ratio | What the app does |
| --- | --- | --- |
| White text on Emerald 600 `#10B981` | 2.54 | Primary buttons use **Emerald 800** `#0B6B4F` (6.50). Emerald 600 is kept for focus rings on light surfaces and large graphics only. |
| Gray 500 `#6B7280` text on Gray 100 | 4.39 | Secondary text on the page background uses **Gray 700** (9.37). Gray 500 is used on white only (4.83). |
| Gray 300 `#D1D5DB` as an input border | 1.47 (needs 3:1) | Input borders use **Gray 500** (4.83). Gray 300 stays for purely decorative dividers. |
| Error `#DC2626` text on Gray 100 | 4.39 | Error text uses **`#B91C1C`** (`--bunus-error-text`). The brand red stays for icons and borders. |

Also: amber stamps carry a dark glyph (Gray 900 on Amber 400 is 10.63), and a stamp's state is always
repeated in text and shape, never colour alone.

## Placeholders to replace before launch

- `BunusMark.vue` and `public/favicon.svg` are a hand-built SVG of the supplied logo, so the app has
  a real vector mark. The brand sheet asks for a precise master; swap these when it exists. The
  original raster is kept in `docs/brand/`.
- UI copy is English and lives in `src/copy.ts`, ready for an Indonesian translation (the primary
  market).
