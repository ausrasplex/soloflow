# SoloFlow: Planning Spec (living draft)

Status: milestone 1 (fork of Folio 1.0.0, accounts and statements only) built. Updated 2026-11-25.
The product brief and the decisions behind it are in the claude.ai Project ("sole-trader-app-brief.md" and
"claude/soloflow-decisions-and-milestone-1.md").

## What It Is
Self-hosted bookkeeping for Australian sole traders. Upload bank and card statements (PDF or CSV); transactions are
categorised (milestone 2), each period is reconciled, GST and BAS figures are worked out, and a PDF report and a CSV
export are made for the sole trader or their accountant.

## Stack and Delivery
- Next.js 15 (App Router), React 19, TypeScript, Prisma 6, PostgreSQL 16, decimal.js, pdf.js for reading and showing
  statements. Own session auth (hashed tokens) with invite links and TOTP two-step. Background jobs (automatic backups,
  alerts) run inside the app; no Redis. One container.
- Hosting: local only (LAN or VPN), for privacy.

## Structure
- `src/app/(auth)`: signed-out pages (setup, sign-in, two-step, join, sign-out).
- `src/app/(app)`: signed-in pages. `layout.tsx` loads the person's data once (`AppData`, from `/api/state`) and draws
  the shared frame (`AppShell`: side navigation or bottom bar, top bar with the business switcher, alerts and avatar,
  footer). Each page folder holds its `page.tsx` and its screen (for example `accounts/Accounts.jsx`). Screens draw
  only their own content.
- Reused Folio screens are class components (`DCBase` in `src/lib/dc.js`) with their logic in `renderVals`. Changes go
  through `/api/act` (`src/lib/server/actions/*`), and each action checks access itself. Themes are in `src/lib/theme.js`.
- New data-heavy screens (transaction review, BAS, reports) load their own data per page, server-side and paged,
  rather than through the full `/api/state`.
- New screens from mockups: `python3 tools/convert.py Name` (add the board to SCREENS first). It strips the board's
  frame and writes the screen beside a new `page.tsx`.

## Data Model
- Business (was Household): name, ABN, GST registered, GST reporting period (quarterly or monthly). People belong to
  one or more businesses through Membership (Owner, Editor, Viewer); invites join a business.
- Bank (was Lender): a bank or credit union shared in the business, with contact details. Statement layouts are matched
  by the bank's name.
- Account: a business Transaction, Savings or Credit card account at a bank, with its holders.
- Statement and Txn: imported from a PDF or CSV through a saved layout. Layout kinds: `account` (a balance held; money
  in adds to it) and `card` (a balance owed; spending adds to it). Credit card accounts take card layouts.
- Removed from Folio: loans, splits, rate and repayment changes, loan events, scenarios, brokers, offset links, the
  interest engine.
- Coming in milestone 2: categories, rules, splits of a transaction, GST treatment per transaction, receipts.

## Access Model
- Users and businesses are many-to-many, so a bookkeeper or partner can help more than one sole trader.
- Who sees an account comes from the business role, with a switch per person on each account (`src/lib/server/access.ts`):
  owners always see every account (locked on); editors see accounts unless switched off; viewers see only accounts
  switched on for them. Only owners change the switches, on the account page (Who Can See It) or when adding an account.
  A switch that matches the role's default is not stored, so changing someone's role still applies.
- Admin is a server-wide account type (the first person on the server) for backups, restore and server settings. It
  does not grant access to other people's accounts.
- Shared records (banks, layouts) never reveal anything about accounts you cannot see.

## Writing Style for the Interface
- Headings use Title Case: page titles, section headings, drawer and dialog titles, collapsible section titles and wizard step names ("Account Details", "Income vs Expenses", "Spending by Category"). Short words stay lower case unless first or last (a, an, and, as, at, by, for, in, of, on, or, the, to, vs, with). Everything else (buttons, labels, captions, chips, menu items, body text) stays in sentence case.
- No redundant text: a label does not repeat what the screen already says (an Export button on the Banks page says "Export", not "Export bank"). If a requested label looks redundant, check with the user before adding it.

- Australian English. Headings in Title Case, everything else in sentence case.
- Everything on screen is worked out from data, never static sample text.
- Destructive actions confirm first, use red styling, are soft-deleted and offer Restore.
- Right-side drawers on desktop, bottom sheets on phones.

## Brand
- Name: **SoloFlow**, with the same look and feel as Folio. The mark and app icon are Folio's for now; a new mark in
  the same style comes in step 7 (brand and polish).

## Design System (carried over from Folio)

### Colour tokens
Every component reads CSS variables; themes only swap the values. Five themes, each with light and dark: Lilac (default), Ocean, Forest, Sunset, Graphite. The choice and mode are saved per user.

| Token | Use | Lilac light | Lilac dark | Ocean light | Ocean dark | Forest light | Forest dark | Sunset light | Sunset dark | Graphite light | Graphite dark |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bg | Page background | #f1f1f4 | #14122a | #eef3f7 | #0d1a26 | #f1f3ee | #101a14 | #f7f1ee | #1b1113 | #f2f2f2 | #121212 |
| surface | Cards, drawers, menus | #ffffff | #1f1d3a | #ffffff | #14273a | #ffffff | #17261c | #ffffff | #2a1b1e | #ffffff | #1c1c1c |
| surface2 | Raised fills: inputs, hover, option rows | #f7f7fa | #28254a | #f5f8fb | #1b3350 | #f6f8f3 | #1f3427 | #fbf6f3 | #382529 | #f7f7f7 | #262626 |
| ink | Main text | #1f1c3b | #f1f0fb | #12263a | #e9f2fa | #1d2b22 | #e8f3ea | #3a1f1a | #fbeee9 | #1a1a1a | #eeeeee |
| muted | Secondary text, labels | #6b6985 | #a9a7c2 | #5a6b7d | #9db3c7 | #5f6f64 | #a1b8a8 | #7a6560 | #c4a9a2 | #666666 | #a0a0a0 |
| line | Dividers, thin borders | #ececf2 | #302d52 | #e1e9f0 | #223b54 | #e4e9e0 | #264232 | #f0e4de | #4a3236 | #e8e8e8 | #2e2e2e |
| hero | Hero banner background; dark blue in Lilac | #2b2849 | #34306a | #12324d | #1d4a73 | #23402f | #24523a | #4a2330 | #6b2d3e | #222222 | #2f2f2f |
| heroInk | Text on hero | #ffffff | #ffffff | #ffffff | #ffffff | #ffffff | #ffffff | #ffffff | #ffffff | #ffffff | #ffffff |
| heroMuted | Secondary text on hero | #c9c6e6 | #cfcbf0 | #b9cfe3 | #c3dcf0 | #bcd3c3 | #c4dccb | #e8c9cc | #f0cfd2 | #bdbdbd | #c9c9c9 |
| primary | Primary buttons, selected chips/tabs | #2b2849 | #b8a5fa | #12324d | #9fd0f5 | #23402f | #bfe3b4 | #4a2330 | #ffb8a3 | #222222 | #e5e5e5 |
| primaryInk | Text on primary | #ffffff | #1f1c3b | #ffffff | #0f2336 | #ffffff | #162419 | #ffffff | #3a1f1a | #ffffff | #1a1a1a |
| a1 | Accent 1 (card 01, split 01, avatars) | #b8a5fa | #b8a5fa | #9fd0f5 | #9fd0f5 | #bfe3b4 | #bfe3b4 | #ffb8a3 | #ffb8a3 | #d9d9e0 | #d9d9e0 |
| a2 | Accent 2 (card 02, offset line, split 02) | #fddcb4 | #fddcb4 | #bfe9e0 | #bfe9e0 | #f3dcb2 | #f3dcb2 | #ffe0a3 | #ffe0a3 | #e6e0d4 | #e6e0d4 |
| a3 | Accent 3 (card 03, Add button) | #e8fb4f | #e8fb4f | #ffe9a8 | #ffe9a8 | #d8ef9e | #d8ef9e | #f5c6ec | #f5c6ec | #cfe0d8 | #cfe0d8 |
| onA | Text on accent cards | #1f1c3b | #1f1c3b | #0f2336 | #0f2336 | #162419 | #162419 | #3a1f1a | #3a1f1a | #1a1a1a | #1a1a1a |
| onAMuted | Secondary text on accent cards | #3b3760 | #3b3760 | #2e4a63 | #2e4a63 | #34503f | #34503f | #5c3a35 | #5c3a35 | #3a3a3a | #3a3a3a |
| sel | Focus rings, selected outlines, checks, scenario line | #7b5cf5 | #b8a5fa | #1f7ae0 | #6db6ff | #2f8f5b | #7fd6a0 | #d9482b | #ff8f70 | #4a5fc1 | #8fa2ff |
| base | Baseline/projection lines and today marker | #a3a1b8 | #6d6a8f | #9aa9b8 | #5d7389 | #9aab9f | #5f7a69 | #b3a19b | #8c7570 | #aaaaaa | #666666 |
| hist | Actual balance line | #2b2849 | #f1f0fb | #12324d | #e9f2fa | #23402f | #e8f3ea | #4a2330 | #fbeee9 | #222222 | #eeeeee |

Derived tokens (computed, not stored per theme):
| Token | Value | Use |
|---|---|---|
| t1, t2, t3 | a1/a2/a3 mixed 26% into surface | Soft tinted tiles, notes, "Changed" and status tags |
| outline | ink at 20% | Outlined buttons, inputs, chips, axis lines |
| trackA | onA at 18% | Progress-bar track on accent cards |
| navOn | a1 30% into surface | Selected nav item on phones |
| selSoft | sel at 16% | Chart areas, gap shading |
| danger | light #c9352f, dark #ff8f8f | Destructive text, outlines, solid destructive buttons |
| dangerSoft | danger at 14% | Destructive hover background |
| add, addInk | a3 with hero text | Add ("+") buttons in drawers |
| Bank icon tile | always #ffffff with a 1px line border and 18% padding | Uploaded bank icons, so logos made for paper read well in every theme |

Contrast: text meets 4.5:1 on its background (3:1 for 24px and larger); colours that must be told apart also differ in lightness.

### Typography
- Font: Plus Jakarta Sans (Google Fonts), weights 400, 500, 600, 700; fallback system-ui, sans-serif. Money and dates use tabular figures (font-variant-numeric: tabular-nums).
- Scale: page title (h1) 26px/700, letter-spacing -0.02em; section title (h2) 18px/700; hero headline 26px/700; big figures 28px/700 (stat cards), 24px/700 (hero cards), 20px/700 (result tiles, split balances); body 14px/500–600; list titles 15px/700; labels and secondary text 12–13px/500–600 in muted; chart text 11px (scales to look the same on phones); tags 11–12px/700.
- Inputs use 16px text so phones do not zoom on focus.
- Title Case for headings, sentence case for everything else; no redundant words (labels never repeat what the heading or group already says); one-line card captions use a centred dot (for example "Payments in advance · 6w").

### Spacing, size and shape
- Spacing steps: 4, 6, 8, 10, 12, 14, 16, 20, 22, 24, 32px. Page padding 32px desktop, 16px phone; gap between page sections 20px; inside cards 14–16px.
- Touch targets at least 44×44px (drawer header icon buttons 40px, with hit area kept by spacing); inputs 48px tall.
- Corner radius: page cards 24px; hero cards 18px; inner tiles and option rows 16px; inputs 12px; menus 16–20px; tags, chips, pills and buttons fully rounded (999px); every icon-only button is a circle.
- Avatars and bank icons are circles (36px in lists, 44px in cards, 48px on account cards).

### Elevation and motion
- Flat by default: no button shadows. Shadows only for floating layers: menus and popovers 0 12px 32px rgba(0,0,0,.18); drawers 0 ±12px 40px rgba(0,0,0,.28); dialogs 0 24px 60px rgba(0,0,0,.3); the main navigation "+" is the one raised button (0 6px 16px rgba(0,0,0,.22)).
- Backdrops: rgba(0,0,0,.45) behind drawers and dialogs; nested drawers .35.
- Motion: colour and background changes 0.15s linear on hover; cards lift 2px on hover; the account card arrow slides 4px; bottom sheets slide up and side drawers slide in over 0.2s ease-out. Hover effects only on devices that can hover.

### Layout
- Top bar: sticky, the page background colour at about 72% with a backdrop blur, and a 1px line-colour underline that is always shown. No shadow on scroll.
- Footer on every page: "SoloFlow © v0.1.0" in small muted text, centred, above a 1px line. It replaces the old "Sample data" notes.
- Breakpoint 860px. Desktop: 224px sidebar navigation (logo/Home link, Add first, Dashboard, Accounts, Statements, Settings, Log out at the bottom), content max width 1100px. Phone: bottom tab bar with a raised round Add in the middle, single column, icon-only header buttons.
- Every page reserves scrollbar space so layouts do not shift between pages.

### Components (Radix in the real app)
- Buttons: primary (filled primary), secondary (outlined), destructive (red outline; solid red only for the final confirm in a dialog), Add (round, add colour), icon buttons (round 40–44px). Buttons and tabs carry a Lucide icon before the label (see Icons).
- Chips and pills: fully rounded; selected = primary fill, unselected = outline on surface.
- Drawers: side panel from the right on desktop (380px), bottom sheet on phones; heading with a round exit "X" at the far right (and a "+" just left of it when adding is possible); main button in a footer pinned to the bottom; nested drawers stack on top.
- Dialogs (confirmations): centred card, title with exit "X", explanation, required reason where data is removed, Cancel plus the destructive action.
- Menus: three-dot round button opening grouped items (group labels; a red Destructive group last).
- Pickers in drawers: one item per line with avatar or icon, name and detail line, check on the right (single choice) or tick box on the far right (multi choice).
- Date picker: themed calendar popover, never the browser's own.
- Filters: a Filters button (icon only on phones, with a count badge) opening a drawer of titled chip groups with Clear and "Show N".
- Popovers for explanations (info "i" button).
- Charts: Recharts, with axis titles, gridlines, a hover/drag tooltip, and theme colours (hist actual, base projection, a2 offset, sel scenario).
- Toasts: short confirmation at the bottom centre, about 2 seconds.

### Interaction rules
- Outline buttons placed on a tinted panel (surface2) get a white fill and a darker hover (and darker border), so the hover is visible; the standard surface2 hover would disappear into the panel.
- Filters button: when filters are on, a round 22px badge (always a circle, so nothing shifts) sits on its top-right corner. On devices with a mouse it shows the count and turns red with an X on hover or keyboard focus; on phones and other touch devices it always shows the red X. Pressing it clears all filters. The badge is its own button next to the Filters button (aria-label "Clear all filters").
- The sidebar (with the Add menu) stacks above page content on desktop, so its menu is never covered by checkboxes or cards.
- Side-by-side panels in a fixed pair (e.g. Checks and Statement Details) stretch to the same height.
- Hero stat cards (the coloured cards inside a hero banner on Accounts and an account page) are always square (1:1), at least 176px wide. Where a card has a progress bar, the caption sits above it and the bar is pinned to the bottom edge, so bars line up across cards.
- Every bank shown as a contact links to its page in Settings > Banks. The icon and name area is the link (hover background and a sliding chevron); the call button beside it still calls.
- Card grids that can be filtered or have cards added or removed (accounts) keep three columns on desktop even when there are fewer cards, so cards never stretch wider. Fixed panel pairs (Account Details and Bank Details) stay two equal columns. Phones show one column.
- Drawer footers sit flush with the bottom edge of the drawer (no gap under the sticky Save button).
- Page titles are the page name only ("Dashboard", "Accounts"), matching the navigation.
- The page title row is always 44px tall (the height of the round action button), including pages without a button such as Settings and Profile, so titles don't shift when moving between pages.
- Anything clickable shows it: cards that open something lift slightly (2px) on hover, and their chevron slides right; this applies to account cards and Spending by Category cards (which also get an inset outline on hover).
- The filter row says "Showing all accounts" when nothing is filtered out, and "Showing 2 of 4 accounts" when filters hide some (no count when showing all, since the subtitle already has it).
- Rounded list rows (closed accounts) each have a full 1px border, never a top border only. In a rounded panel of rows separated by lines, the first row has no top line.
- Estimated figures carry a small "Est." tag after their title (interest saved, interest this year).
- Every destructive action has an inline confirmation and red styling; nothing is hard-deleted (soft delete with Restore).
- Forms: emptied fields stay empty; required fields disable the main button and show a short red hint.
- Nothing on screen is static sample text: dates, countdowns and "ahead of schedule" are calculated.
- Details tabs are read-only; editing happens in one place (Actions › Edit details), except item menus such as each split's.

## Mobile first (the user expects to use it mostly on a phone)
- Sidebar becomes a bottom tab bar under 860px. Touch targets are at least 44px. Inputs are 48px tall with 16px text, so phones don't zoom on focus.
- All cards are full width (minus the page gutter) on phones; no card may shrink to its content. Hero stat cards and scenario pills scroll sideways, splits are cards (no wide tables), and the wizard shows a compact step bar.
- Chart text scales up on small screens so it stays readable.

## Theming
- Themes are named sets of colour tokens. Every component reads tokens (CSS variables); no hard-coded colours in components or charts. Adding a theme means adding one token set, nothing else.
- Each theme has a light and a dark version. The user picks a theme and a mode from Appearance on the Profile page (the avatar in the top right). The choice is saved to the user's profile and applies on every screen.
- Starting set of five themes: Lilac (default), Ocean, Forest, Sunset, Graphite.
- Core tokens per theme and mode: bg, surface, surface2, ink, muted, line, hero, heroInk, heroMuted, primary, primaryInk, a1, a2, a3 (accent colours), onA and onAMuted (text on accent cards), sel (selected line), base (baseline and gridline grey), hist (history line).
- Derived tokens, computed from the core ones: tints of the accents mixed into the surface (t1, t2, t3), outline, accent-card progress track, active-nav background, soft chart fill.
- Contrast rule: text must reach 4.5:1 against its background in every theme and mode.
- Reference values (Lilac light): bg #f1f1f4, surface #ffffff, ink #1f1c3b, hero and primary #2b2849, a1 #b8a5fa, a2 #fddcb4, a3 #e8fb4f, sel #7b5cf5. Lilac dark: bg #14122a, surface #1f1d3a, ink #f1f0fb, hero #34306a, primary #b8a5fa. The full token sets are in the mockup file.
- Possible later: more themes, a "match my device" mode, per-business default theme.

