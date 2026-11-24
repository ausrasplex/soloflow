# Folio: planning spec (living draft)

Status: version 1.0 built and tested locally (Node.js and PostgreSQL); next is the Unraid package. Updated 2026-10-30.

## Stack and delivery
- As built: Next.js 15 (App Router), React 19, TypeScript, Prisma 6, PostgreSQL 16, decimal.js engine, pdf.js for reading and showing statements. Own session auth (hashed tokens in the database) with invite links and TOTP two-step. Background jobs (automatic backups, sending alerts) run inside the app every 15 minutes; no Redis. The screens are the reviewed mockups converted to React and wired to real data.
- Originally planned: Radix, Auth.js and a Redis job container. Dropped to keep a single container.
- Unraid-ready template, images on GHCR.
- Hosting: local only (LAN or VPN), for privacy. Not exposed to the internet.
- Process: mock up the design in chat, write the spec for the first ZIP in chat, then continue in Claude Code with build milestones. Building more screens may surface extra options, so the spec stays open until the mockup is complete.

## Screens in the prototype
- Loans list (home), Loan dashboard, Loan setup wizard.
- Accounts list, Account page, Add an account.
- Statements (import and review, statements list).
- Settings (Profile and appearance, Household, Layouts and lenders, Data and privacy), Statement layouts (list and layout editor).
- Every screen has a desktop board and a phone board.

## Writing style for the interface
- Headings use Title Case: page titles, section headings, drawer and dialog titles, collapsible section titles and wizard step names ("Account Details", "Income vs Expenses", "Spending by Category"). Short words stay lower case unless first or last (a, an, and, as, at, by, for, in, of, on, or, the, to, vs, with). Everything else (buttons, labels, captions, chips, menu items, body text) stays in sentence case.
- No redundant text: a label does not repeat what the screen already says (an Export button on the Lenders page says "Export", not "Export lender"). If a requested label looks redundant, check with the user before adding it.

## Navigation
- Add buttons: a round + button sits inline with the page heading on list pages (Loans, Accounts, Lenders, Brokers, Layouts, Statements). It has no text label; its accessible name says what it adds.
- Breadcrumbs: every back link (to Settings, Accounts, a list) is the same pill with a chevron. It always sits above the page heading, on list and edit pages alike.
- Profile: tap the avatar in the top right (on every screen). The profile page holds display name, email, appearance (theme and light or dark) and Log out. There is no appearance button in the header bar, to keep it uncluttered.
- Phone: bottom tab bar with Loans, Accounts, a raised round Add (+) button in the middle, Statements and Settings. Desktop: the same items in a sidebar, with Add as a filled pill.
- Scenarios is no longer a top-level item. Scenarios live inside each loan (builder and saved scenarios on the loan dashboard); a full Scenarios page per loan comes later.
- Layouts, Lenders and Brokers are not in the main nav: they are tabs inside Settings, since they are used rarely once set up.
- Add (+) menu: Add a loan, Add an account, Import a statement, Record a change (rate rise or new repayment amount). Under consideration: Add a transaction or note (manual entry such as a lump-sum offset deposit) and a context-aware menu (defaults to the loan or account being viewed).
- New scenario is not in the Add menu. It is specific to one loan, so it lives on that loan's Forecast tab (and its "New scenario" button), where it is clear which loan it belongs to. Open question: "Record a change" has the same problem and may need to move onto the loan too.
- Notifications: a bell button in the header (where the Appearance button used to be) opens a panel of important events, each marked read when opened, with a "Mark all read" button, an unread count on the bell, and an "all caught up" state. Events so far: rate review due, statement not imported, rate change to confirm, statement layout needs re-mapping. Each links to where it is dealt with.
- Loan page tabs: Overview (summary, stats, balance over time, upcoming), Scenarios (saved scenarios, a chart that updates as the sliders move, the result tiles, and the scenario builder), History (balance against the original schedule, interest rate on each split with a list of rate changes, interest and principal paid each year), Statements (statements list with filters, and the calendar), Details (splits, lender and broker). The page always opens on Overview unless a button sends you to a tab (for example a rate change notification opens Details). Tabs are a sticky row of pills that scrolls sideways on a phone. The tab bar and the Scenarios chart scroll with the page (nothing is sticky).
- Loan page heading: the lender's icon, large, on the left; to its right the loan name, the lender's name as muted text, and pills for the currency, the number of splits and the borrowers. In the Details tab the lender and broker avatars are the same size.
- The loan page heading has no buttons. It does not offer Add a loan or New scenario; it is about this loan only.
- Statement filters: split, status (reconciled or needs attention) and year, with a count ("Showing 3 of 6"), a Clear button and an empty message.
- Contacts for lenders and brokers (loan page cards, Contacts on the Loans list, and the card menus) are always in the order Phone, Email, Website. Missing ones are left out, never shown as disabled or as "No phone". The first one that exists is the main, coloured button. On the Loans list, Contacts shows a single round button for the first one that exists.
- Icons: Lucide (lucide-react in the build). The mockup uses the real Lucide shapes inline, 24px grid, 2px round strokes, in the current text colour.
- Hover (pointer devices only): filled primary buttons get a slight darkening overlay, outline buttons and pill buttons (including back pills) fill with the soft surface tint, destructive buttons fill with a faint red, navigation items get a faint tint, and loan cards lift slightly. Changes ease in over 0.15 seconds. The same rules apply on every page.
- Forms: clearing a text field leaves it empty (no default text comes back). Required fields are checked when saving. The household name has its own Save button, disabled until the name changes and is not empty, and the saved name shows in the household switcher at the top of every page.
- Destructive actions (delete a lender or broker, discard an import) sit in a red "Destructive" group at the bottom of an options (three-dot) menu where one exists, with a faint red hover. Every destructive action asks for confirmation first (an inline Cancel and red confirm button on the item). A lender cannot be deleted while loans or accounts use it, and a broker cannot be deleted while assigned to a loan; the message says what is using it. Destructive actions so far: delete lender, delete broker, discard an import, remove imported statements in the loan setup, remove a split in the loan setup, discard a loan being added.

## Look (based on a reference dashboard the user likes)
- Airy and soft: light page background, white cards with large radii (18 to 24px), generous spacing, Plus Jakarta Sans, tabular numbers for money.
- Hero card (dark panel) with coloured stat cards (no greeting on any page; a greeting may return with a future Home dashboard) in the theme's accent colours, used on the loans list, dashboard and accounts.
- Loans list: hero with total owing, first paid off and debt-free dates; filter pills (All, Joint, Just me); sort (balance or payoff date); one card per loan (balance, repaid, rate, repayment, payoff, borrower avatars, next payment, status chip); stacked chart of all loans together; note that you only see loans you are a borrower on.
- Loan dashboard: statistics row, balance-over-time chart with scenario pills, scenario result tiles, scenario sliders (offset balance, extra weekly repayment, rate change) that drive the chart live, splits as cards, expandable statements list, repayment calendar, upcoming list.
- Loan setup wizard: four steps (lender and borrowers, splits, offset and redraw, review and first statement import). The offset step has no balance to type: you tick every account that offsets the loan (none is fine, link later), their balances are pooled and come from imported statements, and each scenario chooses how to use them. Lender step also takes optional broker, loan account number and customer ID.
- Lender avatars (icon or initial) are circular everywhere, like broker avatars: loan and account cards, the loan page header and contacts, the Loans page contacts, the Lenders and Layouts tabs, and every lender picker. An uploaded icon keeps its white backing and padding inside the circle.
- Settings tabs (review round 1, built): Household, Notifications, Layouts, Lenders, Brokers (separate tabs, a trial), Data and privacy, and Server (Admin only). Details in "Settings (review round 1, built)" below.
- Also: Lenders (list and edit), Brokers (list and edit).

## Charts and scenario inputs
- Chart library for the real app: Recharts (React, SVG). The Design mockup cannot load libraries, so its charts are hand-drawn SVG made to look like Recharts output; build the real ones with Recharts components (ResponsiveContainer, AreaChart/LineChart/BarChart, XAxis, YAxis, CartesianGrid, Tooltip) and keep the same colour tokens.
- Every chart has labelled X and Y axes (axis titles, tick marks, tick labels) and a tooltip showing the exact date and values of each series at the hovered or tapped point (Recharts Tooltip with a cursor line and active dots).
- Charts: balance over time (actual, baseline, selected scenario), actual vs original schedule, interest rate per split (stepped), interest and principal per year (stacked bars; tooltip per year).
- Scenario sliders: offset balance from $0 up to the loan's remaining balance; extra repayment $0 to $1,000 a week; change in interest rate -3% to +3% (as far back as forward). Every slider has a paired number input for custom values; typed values are clamped to the slider range (offset cannot exceed the remaining balance), and an emptied input stays empty until a value is typed.

## Choosing from lists and Radix components
- Phones (under 860px) avoid native drop-downs (the picker pushes the page and is hard to style); desktop keeps drop-down lists because the screen is wide enough. Desktop drop-downs are themed (not the browser's native picker): a pill button showing the current choice with a chevron, opening a rounded menu in the surface colour with a check on the current option and the same hover background as other controls; clicking outside closes it. In the real app these are Radix Select (or DropdownMenu), styled with the theme tokens. On phones, the Statements heading has the count ("6 statements") beneath it and the Filters button on the right of the header (no separate filter row); the Statements filters are one Filters button (with a count badge when filters are on) that opens a bottom sheet titled "Filters" with a titled group per filter ("Split", "Status", "Year"), each a set of chips whose first option is "All" or "Any", plus Clear and a "Show N" button. Labels avoid repeating "statement", since the context already says it. Longer or described choices (such as a member's role) also open a bottom sheet with large rows, a check on the current choice, and Cancel; tapping outside closes it.
- Radix mapping for the real app: filter chips = Radix Primitives ToggleGroup (single type) or Themes SegmentedControl; bottom sheet = Radix Dialog styled to slide up from the bottom (or the vaul drawer, built on Radix Dialog), and a Radix Select or Popover on desktop; number inputs = Themes TextField; sliders = Themes Slider; menus = DropdownMenu; confirmations = AlertDialog; charts = Recharts with Radix Colors tokens; icons = lucide-react.
- Role descriptions in the sheet are draft wording: Owner manages members, invites and household settings; Editor changes household settings but not members; Viewer views household settings only.

## Overview chart versus Scenarios
- The Overview "Balance over time" chart shows only real data: the loan's actual balance, the linked offset account's actual balance (one line per linked offset account), a dashed projection to payoff using current repayments and rates with the offset held at its 3-month average, and a dotted "without offset" projection from today so the offset's effect is visible. Result tiles are positive notices: projected payoff, interest saved by the offset, and time saved by the offset (each compared with having no offset). No scenario pills or what-if lines.
- Scenarios (pills, sliders, comparison chart and result tiles) live only on the Scenarios tab. Every other page shows accurate loan information with no scenario values mixed in.

## Customisable hero cards
- The three cards at the top of the loan Overview each have a three-dot button. It opens a drawer (a side panel from the right on desktop, a bottom sheet on phones) listing what the card can show, each with its current value and a check on the current choice. Choosing something already shown on another card swaps the two, so no metric appears twice.
- Available metrics: loan balance, offset balance, projected payoff, amount repaid, interest paid, effective rate, weekly repayment, ahead of schedule, interest saved by offset. Defaults: loan balance, offset balance, projected payoff.
- Each user has their own set of hero cards. The choice is saved to the user's account on the server (a per-user preferences record, for example a JSON field on the user or a UserPreference table keyed by user and setting), not to the browser, so it carries across browsers and devices after sign-in. The mockup uses browser storage only as a stand-in. Whether the set is per loan or the same on every loan is still to decide. Each card keeps its accent colour.
- Progress bars only appear as partial fills where the metric has a real complete state: loan balance (share repaid), offset balance (share of the loan covered), projected payoff (share of the term elapsed) and amount repaid (share of the original loan). Every other metric (interest paid, effective rate, weekly repayment, ahead of schedule, interest saved by offset) shows a full solid bar.
- The drawer is titled with the card number ("Card 01").
- Real app: Radix Dialog styled as a side drawer / bottom sheet.

## Overview stat row
- Under the hero banner, a row of static information cards: effective rate, weekly repayment, payments in advance, and a countdown to the next payment. The balance-in-two-years sparkline was removed.
- Payments in advance: dollars paid beyond the required repayments, with the number of repayments it covers. Read from the statement where the lender shows it; otherwise calculated as total paid minus total required. Add a payments-in-advance field to the statement data model (draft).
- Next payment countdown: days until the next due date, worked out from the loan's repayment frequency and day (weekly, fortnightly or monthly), with the date shown below. Shows "Today" on the due date.
- "Ahead of schedule" (hero banner and card option) is different: the original schedule's expected balance minus the actual balance, which also reflects offset savings and rate changes.

## Printing and saving a scenario
- The Scenarios tab has "Save as PDF" and "Print" buttons under the result summary. Both produce a one-page printout of the chosen scenario: loan name, date, the inputs (offset, extra repayment, rate change), the comparison chart, and the result cards. Pills, sliders and the rest of the app are hidden when printing.
- Mockup: both buttons open the browser print window (choose Save as PDF as the destination). Real app: a print stylesheet for Print, and a server-rendered PDF download for Save as PDF so it works the same on every device. Saving the scenario into the app as a named, reopenable scenario was considered and not chosen for now.

## Loan changes and refinancing
- The loan page header has a three-dot Loan actions menu (group "Changes"): Record a change, Refinance. (Archive loan joins it later, in a red Destructive group with a confirm.)
- Record a change opens a drawer (side panel on desktop, bottom sheet on phones). Step 1 picks the type; step 2 is its form, always with an "Effective from" date:
  - Rate change: split, new rate.
  - Repayment change: new amount, frequency (weekly, fortnightly, monthly).
  - Top-up: split, amount borrowed.
  - Term change: the new end date.
  - Fixed or variable switch: split, switch to fixed (rate and fixed-until date) or variable.
  - Restructure splits: an amount per split that must add up to the loan balance (shown in red when it doesn't); "Add a split" comes later.
  - Saved changes are dated events: they show in the History tab's change list (tag "Recorded") and projections use them from their date.
- Refinance is a two-step drawer that copies the current loan and changes only what differs. (1) Pay out this loan: payout date and amount. (2) New loan: fixed rows, each starting as a copy of the current loan, with a Change button that opens a small nested drawer for that row only: Lender (lender chips plus the "+" Add a lender drawer), Loan name, Amount borrowed (starts as the payout amount), Term, Borrowers (checkboxes, at least one), Offset account (accounts or "No offset"), Broker (brokers, "No broker", or the "+" Add a broker drawer: name, company, phone, email). Changed rows show a "Changed" tag. Step 2 is also the review: the "what happens" note and the Refinance button sit at its foot. Splits, rates and repayments are set up on the new loan afterwards.
- After refinancing, the old loan shows a "Refinanced" pill and a banner ("Refinanced on <date> to <lender>. This loan is now read-only.") with Undo and "Set up the new loan". The old loan moves to archived loans, keeps its statements and history, and is linked to the new loan so History can show one continuous line. "Ahead of schedule" and projections on the new loan use the new loan's terms.
- Later: when an imported statement shows a payout or a large new-funds entry, raise a notification suggesting Record a change (top-up) or Refinance.

## Loan page review round 1 (built)
- Header: the Loan actions button is a round three-dot icon button on every screen size. Menu groups: Loan (Edit loan details), Changes (Record a change, Refinance), Destructive (Archive loan, red, with an inline confirm). The currency pill was removed; show currency only when a household uses more than one.
- Edit loan details drawer: loan name, lender (required: every saved lender is listed, the loan's current lender is selected by default and labelled "Current lender", and choosing another simply moves the selection. Loans store the lender by id, not name, so renaming a lender never breaks the link, and the loan's own lender is always in the list; no "+" here, because moving to a lender that is not saved yet means a refinance), borrowers (at least one required).
- Read-only loans (archived or refinanced): status pill plus an "active" date range pill (for example "Jan 2023 – 26 Oct 2026"), a banner with Unarchive or Undo, no Loan actions or split menus, and no Scenarios tab.
- Nothing on the page is static: "You're N months ahead of schedule" is worked out from the same figures as the Ahead of schedule card; due dates, interest posting dates and the calendar's today come from the current date.
- Banner button is "Import a statement".
- Stat row: Effective rate (with an info button opening a popover that explains the sum), Payments in advance, next repayment ("$413" · "Due Thu 29 Oct · in 3 days"), and interest accrued since the last posting ("Interest so far · posts 10 Nov").
- Popovers (Radix Popover in the real app) carry extra explanations without taking space: effective rate, and why a statement needs attention.
- Overview chart: range toggle (All, 5 years, 1 year) that rescales both axes; a "Today" label; the offset line continues as a dashed flat line (its 3-month average) to the projected payoff.
- Statements tab calendar: days with events are buttons; tapping one shows that day's events under the calendar. Review this as its own step later.
- Upcoming list: "Next 5 months" removed.
- Scenarios: preset pills (Current, Offset $150k, Extra $100 a week, Rates +2%) fill the sliders; there is one editable scenario, and a pill is highlighted only while the sliders match it. Added repayment frequency (weekly, fortnightly, monthly, showing the per-period amount) and a one-off lump sum (amount and date). The result card reads "Interest saved" (or "Extra interest" when it costs more).
- History: the change list moved into its own "Changes" section. "Balance against schedule" adds the offset balance on a right-hand axis (Recharts second YAxis).
- Statements: rows that need attention have an info button with the reason; the desktop header has an Import button.
- Details: each split has a three-dot menu: Edit split (name, account number; rates and amounts change only through Record a change), Record a change (pre-filled with the split), and a red Remove split. Removing opens a confirmation dialog that needs a reason (Paid off, Merged into another split, Added by mistake, Other with a note). A Borrowers section lists borrowers (read-only; borrowers are changed through Actions › Edit details, the one place loan details are edited). The Details tab is otherwise read-only, except each split's own three-dot menu, kept because those actions belong to one split (revisit later if a better pattern appears).
- Soft deletes: removing an item (splits now; later statements, recorded changes, borrowers, scenarios) never deletes data. Store deletedAt, deletedBy and the reason, hide it from views and calculations, and list it under "Removed …" with Restore. Hard deletion only through an Admin purge, if ever.
- Empty state (new loan with no statements, its own artboard): welcome banner, hero cards from the loan setup or "—" with "After your first statement", projections only on the chart with a note, an empty History card with Import a statement, and "No statements yet" on Statements.
- Charts on phones: press and drag across a chart to move the tooltip (pointer events with touch-action pan-y, so vertical scrolling still works); desktop keeps hover.

## Loan page review round 2 (built)
- Export statements: an Export button in the Statements header on desktop, and an "Export statements" button inside the phone Filters sheet. It opens a sheet: Which (Shown, with the count, or All), Include (Original files as a ZIP, CSV summary with one row per statement, Include removed), and Download. Each expanded statement also has "Download original". The app keeps every original imported file so exports can always return them; removed (soft-deleted) statements are left out unless "Include removed" is ticked.
- Add while choosing: a round green "+" button after a set of chips opens a nested drawer on top of the current one (Radix Dialog nesting, or vaul's nested drawer) to add the missing item, then selects it and returns with progress intact. First use: "Add a lender" (name required and unique, phone, email, website; icon and logo later on the Lenders page) from Refinance › New loan. The same drawer is reused wherever a lender can be picked; brokers and accounts follow the same pattern later. On desktop the nested drawer is inset from the right edge to show it is one level deep; on phones it stacks as a second bottom sheet.
- Pickers inside drawers (lenders, brokers, borrowers, offset accounts) are one item per line: a round icon or initials avatar on the left, the name with a short detail line, and a check on the right for single choice. Multi-choice lists (borrowers) show a tick box at the far right instead, empty until ticked. "None" options (No broker, No offset) use a dashed empty avatar. The "+" add button sits at the right of the drawer heading, and the drawer's main button (Done, Save, Add) sits in a footer pinned to the bottom. Every drawer, sheet and dialog has a close button at the far right of its heading: a round, outlined, neutral "X" (round like every icon button in the theme, but unlike the filled yellow "+"), which closes without saving; the main button still saves.
- Date fields use a themed date picker, not the browser's native one: a field button showing the date and a calendar icon, opening an inline calendar with month arrows, weekday row, the selected day filled with the primary colour, today ringed, and Today and Close buttons (react-day-picker inside a Radix Popover in the real app). Used for every date field (payout date, Effective from, Loan now ends, Fixed until, lump sum Paid on). The Statements tab calendar is different: it is a guide to events, not a picker, and keeps its own look.
- Trial: an "add" colour token for Add buttons, now the third hero card colour (a3, yellow in the default theme) as the background with the hero dark blue for the icon, so it follows the chosen theme. Used only on the Loan page for now; decide after the trial whether it applies app-wide. (An earlier green version was replaced.)

## Filters and selection (round 3)
- Lists with filters (Loans, Accounts, the loan's Statements tab, and the Statements page with Show: All, Loans, Accounts) show a short summary on the left (for example "3 loans · by balance") and a "Filters" button with a count badge on the right, on every screen size. The button opens a drawer (side panel on desktop, bottom sheet on phones) with titled groups of chips, Clear, and "Show N". Loans: Show (All, Joint, Just me) and Sort by (Balance, Payoff date). Accounts: Show (All, Offset accounts, Not an offset). Statements: Split, Status, Year. This replaces the desktop drop-downs and the phone-only Filters button for Statements.
- Statements can be selected, on the loan's Statements tab and on the main Statements page alike: a tick box on each row and a "Select all" box above the list (with "N selected"). Export is disabled until at least one statement is selected, and exports only the selection (original files ZIP and/or CSV summary, optionally including removed ones).
- Buttons and tabs carry a Lucide icon before their label: Call (phone), Email (mail), Website (globe); loan tabs Overview (layout-dashboard), Scenarios (sliders-horizontal), History (history), Statements (file-text), Details (info); Settings tabs Household (users), Layouts, lenders and brokers (landmark), Data and privacy (shield); Reveal/Hide (eye), Copy (copy), Share (share-2).
- Icons: Export uses an arrow up (out of the tray), Import an arrow down (into the tray), everywhere. On phones the Statements header buttons (Export, Import, Filters) are icon-only round buttons, with the filter count badge on the Filters icon's corner.
- Hover effects attach to classes (or Radix variants), never to matching inline style text, because rendered style attributes are reformatted and such selectors silently stop matching.
- Every page always reserves room for the scrollbar (scrollbar-gutter: stable), so moving between short and long pages never shifts the layout sideways.
- The Archive confirmation's Archive button uses the destructive style (red outline and text, faint red hover), with centred text, matching other destructive confirms.

## Add a loan review round 1 (built)
- Header: "Add a loan" with a round close (X) button; if anything was entered it asks inline "Discard this loan?" (Keep editing / red Discard). The subtitle was removed.
- Form fields start empty with grey hint text. Required fields are checked when you press Continue, with a red message under each one; Continue is never greyed out.
- Step 1: Lender and Broker open picker drawers like the rest of the app (one item per line, round yellow + to add a new lender or broker in a nested drawer, the new one is selected). The line under Lender comes from the chosen lender: currency, day-count basis and whether a statement layout is saved. Start date uses the themed date picker. Original amount takes numbers only and formats as $290,000 when you leave the field. New fields: Loan term (years, shows the end date) and "Interest charged on day" (optional; blank means it is read from the first statement).
- Borrowers: the person adding the loan is always a borrower (locked row with a lock icon); other household members are ticked on or off.
- Step 2 Splits: round yellow + opens a split drawer: name, account suffix, variable or fixed (with Fixed until date), amount at start (optional), balance today, interest rate, repayment, how often, day (weekday or day of month) and interest only. Each split card has round Edit and red Remove buttons; Remove asks inline. At least one split is required.
- Split check: when every split has an amount at start, a calculated line compares their total with the original loan amount. A mismatch shows an amber warning with the difference but does not block, since fees or a top-up can explain it.
- Step 3: the offset order question only shows with two or more variable splits; its default is "Work it out from my statements". Offset accounts already linked to another loan are greyed out with "Offset for <loan>". With no variable splits, a note says the offset won't reduce interest until a fixed split rolls to variable.
- Step 4: every summary row has a round pencil button that jumps to its step. Import is optional: "Skip for now" (to trial in the first build) finishes without a statement and the finished screen points to the loan page's empty state. Import result chips are calculated per split from the lender's saved layout (Layout matched / Reconciled / Interest matches, or New layout with a Mark up layout button).
- Desktop step list: you can only jump to steps already reached, and only when the steps before are complete.
- Round 2: the interest day hint reads "Leave blank to read it from your first statement." Split cards also have a round Duplicate button that opens the split drawer prefilled from that split (new name and suffix; balances left blank). The first split's amount at start is prefilled with the original loan amount, and a single split with no amount at start counts as the whole loan in the split check. Choosing a lender with no saved statement layout shows an amber note on step 1 that the first statement will need marking up. The finished screen keeps "Open the loan".

## Loans list review round 1 (built)
- Header: the Add button stays a round icon-only button. The "Hi, Alex!" greeting was removed from the loan page and later from the Loans list too. The Loans hero now opens with "Across your loans" and "$583,919 owing on 3 loans.", matching the Accounts hero ("Across your accounts"). If a Home dashboard is built later, a greeting could go there.
- Hero cards: each card's three-dot button opens a drawer titled "Card 01/02/03" to choose what it shows: Total owing, Owing after offsets, First paid off, Debt-free, Offset balance, Repayments a month, Interest this year. Picking a metric already on another card swaps the two. Saved per user (server-side in the real app). The caption sits above the progress bar, which is pinned to the bottom of the card so bars line up across cards whatever the caption length; metrics without a completion state show a full bar. No "after offsets" figure in the banner text.
- Loan cards: the status chip sits on its own line below the balance (as on Accounts cards). A loan with several splits shows "2 splits" in place of the rate (label "Splits"); open the loan for rates. "Next" (next repayment date) and the status chip are calculated from the repayment schedule and loan data: a fixed term ending within 12 months, otherwise "$X ahead of schedule" (good) or "$X behind schedule" (warning colours) against the amortisation schedule, otherwise "On schedule".
- Contacts: renamed from Quick contacts and moved below the loan cards.
- All loans together chart: one line per loan with a light see-through fill (so small loans stay visible), a dashed total line, axis titles (Year or Month, Balance), All / 5 years / 1 year range toggle, hover and press-and-drag tooltip listing each loan and the total.
- Archived loans: a collapsed section at the bottom listing paid-off, archived and refinanced loans; each row shows the loan name, the lender on the line below, then the active dates, with a status chip; each opens read-only. The count beside the heading is calculated, and the section is hidden when there are none.
- Offset figures on the hero cards (Owing after offsets, Offset balance) sum the accounts linked as offsets to the loans shown; the caption names the account, or the number of linked accounts.
- Chart lines are a slightly darker mix of each loan's card colour, for readability on light backgrounds.
- Empty state (its own artboard, "Loans, first run"): "Add your first loan" with a short explanation and a drawn arrow anchored to the header + button (so it lines up on every screen size) pointing up at it; the + gets a soft pulsing ring in the add colour (a static ring with reduced motion). No second Add button. Hero, filters, cards, chart and archived section are hidden.
- Households stay separate: the Loans list shows only the selected household. There is no combined "All households" view.

## Design system (as built in the mockup)

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
| add, addInk | a3 with hero text | Add ("+") buttons (trial: Loan page and drawers) |
| Lender icon tile | always #ffffff with a 1px line border and 18% padding | Uploaded lender icons, so logos made for paper read well in every theme |

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
- Avatars and lender icons are circles (36px in lists, 44px in cards, 48px on Loans cards, 72px in the loan header).

### Elevation and motion
- Flat by default: no button shadows. Shadows only for floating layers: menus and popovers 0 12px 32px rgba(0,0,0,.18); drawers 0 ±12px 40px rgba(0,0,0,.28); dialogs 0 24px 60px rgba(0,0,0,.3); the main navigation "+" is the one raised button (0 6px 16px rgba(0,0,0,.22)).
- Backdrops: rgba(0,0,0,.45) behind drawers and dialogs; nested drawers .35.
- Motion: colour and background changes 0.15s linear on hover; loan and account cards lift 2px on hover; the account card arrow slides 4px; bottom sheets slide up and side drawers slide in over 0.2s ease-out. Hover effects only on devices that can hover.

### Layout
- Top bar: sticky, the page background colour at about 72% with a backdrop blur, and a 1px line-colour underline that is always shown. No shadow on scroll.
- Footer on every page: "Folio © v1.0.0" in small muted text, centred, above a 1px line. It replaces the old "Sample data" notes.
- Breakpoint 860px. Desktop: 224px sidebar navigation (logo/Home link, Add first, Loans, Accounts, Statements, Settings, Log out at the bottom), content max width 1100px, two columns on the loan page. Phone: bottom tab bar with a raised round Add in the middle, single column, icon-only header buttons.
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
- Hero stat cards (the coloured cards inside a hero banner on Loans, Accounts, an account and the loan page) are always square (1:1), at least 176px wide. Where a card has a progress bar, the caption sits above it and the bar is pinned to the bottom edge, so bars line up across cards.
- Every lender or broker shown as a contact links to its page: the Contacts section on Loans, and the Lender and Broker card on the loan page. The icon and name area is the link (hover background and a sliding chevron); the call button beside it still calls. Links use Lenders.dc.html#<id> and Brokers.dc.html#<id>, which open that lender or broker directly.
- Card grids that can be filtered or have cards added or removed (loans, accounts) keep three columns on desktop even when there are fewer cards, so cards never stretch wider. Fixed panel pairs (Account Details and Bank Details) stay two equal columns. Phones show one column.
- Drawer footers sit flush with the bottom edge of the drawer (no gap under the sticky Save button).
- Page titles are the page name only ("Loans", "Accounts"), matching the navigation.
- The page title row is always 44px tall (the height of the round action button), including pages without a button such as Settings and Profile, so titles don't shift when moving between pages.
- Anything clickable shows it: cards that open something lift slightly (2px) on hover, and their chevron slides right; this applies to loan cards, account cards and Spending by Category cards (which also get an inset outline on hover).
- The filter row says "Showing all loans" / "Showing all accounts" when nothing is filtered out, and "Showing 2 of 4 accounts" when filters hide some (no count when showing all, since the subtitle already has it).
- Rounded list rows (archived loans, closed accounts) each have a full 1px border, never a top border only. In a rounded panel of rows separated by lines, the first row has no top line.
- Estimated figures carry a small "Est." tag after their title (interest saved, interest this year).
- Every destructive action has an inline confirmation and red styling; nothing is hard-deleted (soft delete with Restore).
- Forms: emptied fields stay empty; required fields disable the main button and show a short red hint.
- Nothing on screen is static sample text: dates, countdowns and "ahead of schedule" are calculated.
- Details tabs are read-only; editing happens in one place (Actions › Edit details), except item menus such as each split's.

## Brand
- Name: **Folio**. Tagline from the brand board: "Your financial picture, in full."
- Logo: a stylised "F" of three leaf-shaped strokes (lilac #b8a5fa, peach #fddcb4, lime #e8fb4f), always in these brand colours whatever the app theme. In the app it sits on a dark #2b2849 rounded tile (32px in the sidebar with the word "Folio", 40px on phones), which keeps the lime readable on light themes. App icon: the mark on a #2b2849 rounded square.
- The app keeps its own fonts (Plus Jakarta Sans); the brand board's Playfair Display / Inter are not used.
- Mark source (the user's final artwork, viewBox 0 0 572.216 649.217). In the app tiles the corner radius matches the app icon (about a third of the tile: 10.5px on the 32px tile, 13px on the 40px tile) and the mark fills about 53% of the tile width. The app icon is the user's boxed file (1081 square, radius 353, #2b2849).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 572.216 649.217" role="img" aria-label="Folio">
  <title>Folio</title>
  <path fill="#b8a5fa" d="M572.216 0 C560.88 58.068 540.627 102.088 496.7 142.883 C351.76 277.487 179.777 143.437 48.423 277.681 C32.362 294.095 6.037 323.378 2.138 346.212 C1.966 344.658 -22.589 177.057 99.192 69.24 C191.291 -12.298 281.316 2.867 394.064 2.725 C453.786 2.649 512.611 1.057 572.216 0 Z"/>
  <path fill="#fddcb4" d="M460.872 250.454 C451.759 297.135 435.478 332.522 400.166 365.317 C283.65 473.524 145.394 365.762 39.799 473.68 C26.888 486.875 5.725 510.415 2.591 528.771 C2.453 527.522 -17.287 392.789 80.612 306.116 C154.65 240.568 227.02 252.759 317.658 252.645 C365.668 252.584 412.957 251.304 460.872 250.454 Z"/>
  <path fill="#e8fb4f" d="M236.562 454.024 C228.75 544.394 181.748 617.37 90.065 639.177 C60.67 646.168 30.667 645.539 0.872 649.217 C4.484 566.748 52.822 493.51 133.466 468.867 C166.758 458.694 202.108 457.18 236.562 454.024 Z"/>
</svg>
```

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
- Possible later: more themes, a "match my device" mode, per-household default theme.

## Access model
- Users and households are many-to-many. A user can host their own household and be a member of others.
- Household roles govern household settings only (name, invites, membership, shared layouts, lenders and brokers). They do NOT grant access to loans or accounts. Roles in the drop-down on each member row: Owner (manages the household, can change roles; a household can have several owners and always needs at least one owner or admin), Editor (changes household settings), Viewer (read only).
- Admin is not a household role. It is a server-wide account type, set once per person, and sits above Owner. Admins handle server settings: backing up all households, restoring all households after a failure or corruption, and other advanced server settings. Admins do NOT get access to other households' loans or accounts (that still comes only from being linked).
- Shared records never reveal private ones. Lenders, brokers and statement layouts are shared across the household, but anything they show about loans and accounts is limited to the ones you are linked to: lender cards, the lender page and their totals list only your loans and accounts, with no hint that anything else uses the lender (a lender used only by others shows "None of your loans or accounts"). When a delete is blocked by something you can't see, the message names only what you can see and adds one line with no names or counts: "It's also used by loans or accounts you can't see. Ask the people on them, or a household owner, to move them first." A vaguer "can't be deleted right now" message is not used. Only an existing Admin can make someone an Admin; the first account created on the server is the Admin, and at least one Admin must always remain. In the member list an Admin row shows an Admin badge and a three-dot menu of admin actions instead of the role drop-down. The menu is a placeholder for now (Contact: Message; Support: Report a bug); real actions come later.
- Invites: single-use links that expire after 7 days; sign-up needs a valid invite.
- Access is per loan. Only linked borrowers can see a loan, its statements, scenarios and alerts. Joint loans: every borrower has full access. No ownership splits, no per-person views.
- A loan cannot be created without at least one borrower.
- Borrower linking on import: names on the statement are matched to household members and the importer is asked to confirm ("Link the statement to them?"). Declined or unmatched: the importer selects borrowers manually (at least one required).
- Accounts follow the same rule: visible only to the users linked to the account (at least one person required).

## Accounts
Everyday and savings accounts the user adds so the app can use real balances and behaviour in forecasts.

Decisions:
- Account type is Everyday or Savings, matching how banks label them. Everyday accounts are regular income and spending accounts; Savings accounts are for saving money. There is no separate activity setting: category cards and behaviour projections follow the type. The offset link is a separate setting: the forecast treats an account as an offset because of the link, never because of its type (example: an Everyday account used as savings but classed as an offset account by the bank).
- An account offsets at most one loan, but a loan can have several offset accounts; their balances are pooled. In Add a loan, accounts already linked to another loan are greyed out ("Offset for <loan>"); the link is changed from the account's Edit details.
- Interest saved (estimate): for an offset account, the 3-month average balance (capped at the linked loan's variable split balance) x the linked loan's variable rate x days since 1 Jan / 365. A loan that is fixed earns no saving until the fixed rate ends, and the card says so. Statements replace the estimate once they show the offset benefit.
- Bank details: optional BSB and account number on any account, masked by default, tap to reveal, copy, and Share (phone share sheet or copy, as plain text: name, BSB, account number). Stored encrypted at rest, local only, never part of a shared scenario view.
- Offset sample figures on the loan dashboard come from the linked offset account (Everyday Account, $82,400). Typed offset amounts exist only inside scenarios (an "if" scenario). Offset use in forecasts is chosen per scenario: current balance, average of the last 3 months, or a typed amount. Baseline default: 3-month average once statements exist, otherwise the typed amount.

Screens:
- Accounts list (review round 1, built): hero text plus three customisable cards like the Loans list (three-dot button opens a "Card 0N" drawer; options: In offset accounts, Everything else, Offset average 3 months, All accounts, Money in last month, Money out last month, Interest saved this year; picking one already shown swaps them; saved per user; caption above the progress bar). Filters drawer: Show (All, Offset accounts, Not an offset), Type (Everyday, Savings), Lender, Sort by (Balance, Name). Cards show lender and type, balance, the offset chip on its own line under the balance, account-holder avatars and the latest statement date; bank details are only on the account page. A collapsed "Closed Accounts" section (name, lender, dates, Closed chip, Restore with an inline confirm) is hidden when empty. First-run board "Accounts, first run": "Add your first account" with the arrow to the pulsing + button.
- Account page (review round 1, built): read-only. A round three-dot Actions menu holds Edit details (drawer: name, lender picker with +, type, offset link picker, account holders with you locked, BSB, account number, name on the account) and Close account (red; inline confirm; warns in red when the balance is not $0; soft delete to Closed Accounts with Restore; blocked while the account offsets a loan, naming the loan). The heading shows the lender icon beside the account name. Hero: current balance, 3-month average, and Interest saved this year (offset accounts) or Change over 3 months (others). No separate lender card: the lender name under the heading links to that lender on the Lenders page, and the Actions menu has a group named after the lender with Call, Email and Website (missing ones left out). Account details card (type, offset link, linked loan rate, lender, holders). Bank details with Reveal, Copy, Share. Spending by category names last month ("September, $2,555 in total"). Transaction dates are calculated (Today, Yesterday, then weekday and date). Balance and Income vs expenses charts have axis titles, a 3 / 6 / 12 month toggle and a hover or press-and-drag tooltip (balance and 3-month average; money in, money out and net).
- Add an account (review round 1, built): the same stepped layout as Add a loan (step list on desktop, step bar on phones, round close X with "Discard this account?", fields start empty, required fields checked on Continue, Continue never greyed out, steps reachable only once the earlier ones are complete).
  - Step 1 The Basics: two columns on desktop: account name (required) and lender (picker drawer with + and the layout note) on the first line, type Everyday or Savings (required) and opened on (optional, date picker) on the second; one column on phones; then account holders one per line like Add a loan's borrowers (you locked).
  - Step 2 Offset and Bank Details (all optional): offset link picker drawer (Not an offset, or a loan with its rate note, e.g. "Fixed at 5.89% until 9 Jun 2027, no saving until then"; "An account can offset one loan. A loan can pool several offset accounts."), BSB (checked for 6 digits, formatted 000-000), account number, name on the account.
  - Step 3 Review and Import: summary rows with pencil buttons, then the first-statement import box with Skip for now. When skipped, an optional "Balance today" field is used for offset estimates until the first statement arrives.
  - Finished: "<name> Is Ready", who can see it, and buttons with icons: Open the account (card), Import a statement (upload, only when skipped) and Add another account (plus). Add a loan's finished screen uses the same pattern (house icon for Open the loan, plus for Add another loan).

First release (simple):
- Add accounts, link one as the offset for a loan, import statements with the same parser.
- Offset balance history from statements feeding the per-scenario offset choice.
- Monthly income vs expenses summary per account.
- Spending category totals (Groceries, Food and dining, Fuel, Household, ...) with shortcuts to transactions, if the transactions list is in scope; otherwise these come with the full transactions history.

Later (complex):
- Editable categories, recurring bills and income detection.
- Behaviour-based offset projection as a clearly labelled "based on your habits" scenario (not the default baseline).
- Low-balance alerts.

## Statements and import
Statements page (review round 1, built):
- Subtitle is a calculated summary ("22 statements · 2 need attention · 1 missing"). Future idea: replace it with a hero banner (needs attention, reconciled, missing).
- Import: the round button in the title row (pulses on first run). On desktop a dashed drop zone ("Drop PDF or CSV statements here, or click to choose", with the privacy line) is also a drag-and-drop target and is clickable; it is hidden on phones.
- Review per file (nothing saved until confirmed): file name and period, Layout matched / not recognised, checks with icons (opening + money in − money out = closing; running balance agrees on all rows; duplicates skipped; for loans, interest recomputed and offset benefit), a "Goes to" picker drawer (one per line) to correct the matched loan split or account, the "names match … link them?" question with a three-column people grid on desktop (one column on phones), and for loans the rate-change confirm. A file with an unrecognised layout offers Map this layout or Skip. The result message is calculated ("Imported 1 statement into Bills Account (September 2026): 14 transactions added, 2 duplicates skipped.").
- List (trial): grouped by loan split or account in collapsible cards. Groups with something to fix move to the top. Each group shows how many statements it has, its last statement date, "next due about …" (from that source's statement cycle), and a summary chip (Up to date, 1 needs attention, 1 missing). Groups with something to fix start open.
- Statement cycles are per loan or account (for example six-monthly home loan statements ending 11 Feb and 11 Aug, monthly account statements, quarterly savings). A "Missing" placeholder row appears only when a statement that source should have produced is more than a week overdue; before that it shows as "Expected". Missing rows have an Import button that opens the review with that account already chosen.
- Statuses (calculated, with an action where useful): Reconciled (loan, all checks pass), Imported (account), Needs attention (e.g. "Interest differs by $0.42"; the row itself opens the statement, so there is no separate Review button), Needs layout (Map layout), Missing (Import), Expected.
- Periods and dates are calculated from today; a period that crosses a year shows both years ("12 Aug 2025 to 11 Feb 2026").
- Filters drawer: Show (All, Loans, Accounts), Status, Loan or account, Year, Sort by (newest or oldest first). The filter row says "Showing all statements" or "Showing 3 of 22 statements".
- No page numbers: each group shows its latest 5 statements with a "Show 7 older" button that expands it in place (and "Show fewer"). A "Per group" setting in the Filters drawer (5, 10, All; default 5) changes the limit. Select all only selects the statements on screen.
- Selection: tick statements (or Select all) to Export or Delete. Delete is red with an inline confirm and is a soft delete: a deleted statement's transactions come out of balances and forecasts until it is restored from the collapsed "Deleted Statements" section (Restore asks first).
- First-run board "Statements, first run".

Statement page (read-only, opened from a statement row on Statements, or from "Open statement" in an expanded statement on a loan's Statements tab):
- Heading: the period as the title, the loan split or account as a link to that loan or account page (not to a statements list), lender, format and page count, status chip, and an Actions menu (Download original, Re-import with a different layout, Delete statement).
- Banners: Needs attention explains the difference and offers "Mark as reviewed", which asks for an optional note ("Bank confirmed rounding") and then shows "Reviewed <date> by <name>: <note>" in Statement Details (Folio keeps the statement's figure); Needs layout offers Map layout and shows no figures.
- Hero: closing balance with the opening + interest − repayments line, and three square cards (loans: interest charged, repayments, interest rate with the number of changes; accounts: money in, money out, change).
- Checks panel and Statement Details panel (period, goes to, layout and version, imported date and by whom; for loan statements that print them: repayment, payments in advance, term remaining, forecasted term).
- Two tabs under the hero: Details and Original.
- Details: Checks and Statement Details panels, then Transactions with filter chips (loans: All, Repayments, Interest, Rate changes; accounts: All, Money in, Money out), each row with date, description, amount and running balance. Pressing a transaction opens the Original tab on the page it came from with that line highlighted.
- Original: the stored original file in a built-in viewer, never sent anywhere. PDFs show page thumbnails (desktop), previous/next page, zoom (75–150%) and Download; CSVs show the original rows as a table. In the real app PDFs render with a PDF library (e.g. pdf.js) so highlights can be drawn from the positions the saved layout recorded.
- The sample uses the structure and figures of a real six-monthly home loan statement the user supplied (names, account numbers and the bank removed).

## Statement parser and layouts
- v1: digital PDFs and CSV only. No OCR. Fully local and private.
- Layout editor: the user opens a sample statement, taps sections and labels them. Required sections: statement period, account number, opening balance, closing balance, transactions table, and the date, description, amount and balance columns. Optional: ignore regions such as the page footer. All required sections must be labelled and the totals check must pass (opening + transactions = closing, running balance row by row) before the layout can be saved, then it is saved for a lender.
- Layouts are saved per lender and shared across the whole instance (positions, labels and anchor text only, never figures). Layouts are versioned and locked once used by an import. A fingerprint auto-matches future statements; when the bank changes the format the layout shows "Needs re-mapping". JSON import and export.
- Multi-page tables: map the first page and a continuation page, start/end anchors, ignore regions for headers and footers, drop repeated header rows, tag "carried forward" rows as balance markers, join wrapped lines.
- Layouts page (review round 1, built): reached from Settings. Title row "Layouts" (back buttons also say "Layouts") with a ⋮ menu (Import from JSON, Export all as JSON) and the round + (Map a new layout). Subtitle is calculated ("5 layouts · 1 needs re-mapping"). Cards are grouped by lender (a trial); each group heading links to that lender's page. Each card: file icon, name, calculated meta ("PDF · Version 2 · used by 17 statements · last matched 10 Oct"), status chip (In use, Needs re-mapping, Not used yet), a note, and a ⋮ menu (Open, New version or Re-map, Export, Delete). Re-map lives only in the ⋮ menu on cards, not as a button on the card. Cards lift 2px on hover like loan and account cards. Cards in a row stretch to the same height; the note can run to several lines and sits at the bottom of each card.
- Deleting a layout: blocked while any statement was read with it (names the loans or accounts it read, visible ones only, following the access rules); otherwise an inline red confirm, then soft delete into a Deleted Layouts section with Restore (asks first). Layouts stay shared across the whole server.
- Layout page (read-only, edit via ⋮): heading, status chip, re-map banner when a statement failed to match (names the statement), Sample Page viewer (page and zoom controls) with each mapped section outlined and labelled on the page, or for CSV the header row with the role of each column; Sections It Reads; Version History (current version plus read-only older versions with date and who made them); Used By (statement counts per loan or account, linking to Statements).
- Layout editor (stepped like Add a loan; desktop step list, phone step bar, round X with "Discard this layout?" when anything was entered): 1 Sample Statement (choose a PDF or CSV, lender picker drawer with + to add a lender, statement type Loan or Account); 2 Mark the Sections (PDF: pick a section from the list, then drag a box around it on the real page; each section shows Required or Optional and its page, a Suggest button places a likely box, mapped sections can be cleared; loan statements need period, opening, interest, credits, closing, the transactions table and its date, description, debit, credit and balance columns, with account number, payments in advance, offset benefit and rate optional; account statements use total debits instead of interest. CSV: a picker per column (Date, Description, Amount, Debit, Credit, Balance, Ignore), a date format choice and a "How Folio reads it" preview); 3 Check and Save (name, then the checks: opening + interest − credits = closing, running balance row by row, dates read in the chosen format; any failed check blocks saving).
- Re-map and New version open the editor at step 2 with the previous version's boxes already placed on the new sample; saving creates the next version, the older one stays read-only for statements already read with it, and a failed statement is read again.
- First-run board: no layouts yet, an explainer card and the arrow to the pulsing + button.
- Matching older statements to older versions: every version of a layout keeps its own fingerprint, and an import is checked against every version of every layout, not only the current one. A version reads statements in its format, from its date until the next version. An older statement in an older format matches the older version automatically, and the statement keeps that version for good.
- Import review, Layout row (built in the Statements mockup): each file shows "Layout: <name> · version n" with "Matched automatically · statements <first> to <last>". Tapping it opens a Layout drawer listing that lender's layouts and every version (current marked, the matched one tagged Matched, each with its format and the statement range it covers). Choosing another version re-reads the file; if it does not fit, the chip says "Layout does not fit", the checks fail, a banner offers "Use version n", and Import stays disabled until the file uses a layout that fits or is skipped. The mockup's review has three files: the latest Bills Account statement, an older Split 01 statement from 2023 (matched to Home loan statement version 1, added to the split's history without changing forecasts), and a CSV with no layout.
- No version fits: "Map a layout for this statement" opens the editor with the file loaded. When the statement is older than the current version, saving adds an earlier version (placed by date range) instead of a new current version, so new imports still try the current version first.
- Version History on the layout page: each row has the version title with its date and creator beside it ("Version 1   12 Jan 2023 · Alex"), the range of statements it read below ("Statements Feb 2024 to Feb 2026"), and a Current or Read-only chip.
- Full screen: the PDF viewer on the statement page (Original tab), the Sample Page viewer on a layout page and the Mark the Sections designer each have a round Full screen button (maximize icon; minimize icon and "Exit full screen" when on). Full screen fills the window with the toolbar and page. In the real app Esc also exits (the mockup can't listen for keys). Leaving the page or step exits full screen.
- The Settings card linking here is titled "Layouts".
- Layout designer boxes: every marked box is semi-transparent in the highlight colour; the box under the pointer, the section being marked and the section hovered in the Sections list show solid. The layout page viewer uses the same boxes.
- Sections list in the designer is a slide-in drawer (right on desktop, bottom sheet on phones, above full screen), opened from a "Marking" button in the toolbar that shows the current section, its page and how many required sections are done. Picking a section closes the drawer so the page is free to draw on; Suggest and clear stay in the drawer. The page now takes the full width of the step. The statement page's Layout detail names the exact layout and version it was read with.
- Sample layout observations (Bank of Melbourne, a Westpac brand; likely reusable for Westpac, St.George, BankSA): summary fields sit below labels in a grid (anchor on label text); dates appear as dd/mm/yyyy and "dd Mon yyyy"; the transaction date is split into day-month and year columns; rate-change lines carry the balance on a wrapped line below; the opening row has a sub-line with the rate; duplicate rate-change lines occur and must be tolerated; each split has its own statement (account suffix 01, 02).

## Lenders and brokers
Lenders (Settings > Layouts, lenders and brokers > Lenders):
- Fields: name, currency and day-count basis (belong to the lender, no conversion, locked once a loan uses them), website, phone, email, notes (opening hours, hardship team).
- Two separate images: an icon (small square, shown beside the lender on loan cards, account cards, lists and the dashboard header chip, so a loan shows who it is with at a glance) and a logo (wide, shown in the loan page's lender card and exported summaries). Both optional; without an icon the lender's initial is shown. Images are resized on upload and stored on the server.
- Contact details are visible on the loans list (Contacts section with a call button), the loan dashboard (Lender and broker card with Call, Website, Email), the account page's Actions menu, and the lender cards and lender page.
- Lenders page (review round 1, built): subtitle is the count ("2 lenders"). Cards sit in two wider columns on desktop (an exception to the three-column rule, kept by choice even though the cards no longer list loans and accounts). Each card: icon, name and a totals line ("$565,499 owing · $106,850 in accounts"), and a footer (the Loans and Accounts lists were removed from the cards; they live on the lender page) with "2 layouts · last matched 10 Oct" (links to Layouts) and round contact buttons (Phone, Email, Website; the first one filled). All figures are calculated from the loans and accounts. The header opens the lender page; the three-dot menu has Open, Edit details, Export and Delete. First-run board "Lenders, first run".
- Lender page: read-only. Heading with icon, name and currency/day count; hero with what you owe this lender (and your loan and account counts); Contact panel (phone, email, website rows with round buttons; notes); Layouts panel (title "Layouts" with an Open button top right that opens the Layouts page; each layout is a bordered row with its format, version, use count and status chip that opens that layout's own page); Loans and Accounts lists (loans list includes archived loans at the bottom with an "Archived" chip). Actions menu: Edit details (opens the edit form; Save returns to the lender page), Export, Delete. Linked from an account's lender name (Lenders.dc.html#<lender id>).
- Deleting lenders and brokers (soft delete): blocked only while an active loan or an account uses it (an inline message names the ones you can see, plus the hidden-use line). If only archived loans use it, delete is allowed after a confirm that names them ("First home loan (archived) keeps showing its details as they were. You can restore it from Deleted Lenders."). Archived loans then show the snapshot name with a "Deleted" tag, as plain text with no contact buttons. A collapsed "Deleted Lenders" / "Deleted Brokers" section at the bottom of each page lists them (deleted date, which archived loans keep them) with Restore and an inline confirm; restoring relinks those archived loans.
- Deleting a lender in use is blocked with an inline message naming the loans and accounts you can see that use it ("Example Bank is used by Sample Home Loan, Investment Property and 3 accounts. Move them first.").
- "Export" on a lender downloads one JSON file with the lender's details, icon, logo and all of its statement layouts; it can be imported on another server. A lender in use cannot be deleted.

Brokers (Settings > Brokers):
- Brokers page (review round 1, built), same pattern as Lenders: subtitle is the count; two-column cards; each card has the broker's initials, name and "$247,499 across 1 loan", the rate review chip and last-asked date (when tracked), and a footer (no Loans list on the card, matching the lender cards; the loans, including archived ones with an "Archived" chip, are on the broker page) with company and licence plus round contact buttons. The header opens a read-only broker page (hero with what you owe on their loans; Contact panel with phone, email, website, office and licence; Rate Reviews panel with last asked, next due, reminder and "I asked today"; Loans list). Actions menu: Open, Edit details (Save returns to the broker page), Share, Delete. Delete is blocked inline while the broker is on any of your loans, naming them, plus the hidden-use line when loans you can't see use them. First-run board "Brokers, first run".
- A list with name (required), company, credit licence number, office address, phone, email, website (if applicable) and notes. Each broker card has Call, Email, Website and Share (plain text via the phone share sheet).
- Rate reviews (optional per broker): "This broker does rate reviews for me", the date you last asked, and a reminder cadence (3, 6 or 12 months; 6 by default). The app shows the next due date and a chip ("Rate review due in 8 days") on the broker card, the loan dashboard and the loans list Contacts section (when due within 30 days). "I asked today" resets the date. Brokers without rate reviews show no date.
- Considered but not added: preferred contact method, an assistant or second contact, a log of past conversations.
- A broker is assigned to loans from the broker page (checkboxes) or when setting up a loan (optional "Broker" choice, default none). A loan has at most one broker; assigning a loan to a broker removes it from any other.
- A loan with a broker shows the broker's card with one-tap Call, Email and Website on the loan dashboard and in the loans list Contacts section. A loan without one shows "No broker on this loan" with an Add link.

## Profile (review round 1, built)
- Photo: optional; the avatar itself is the button (a small camera badge on its corner, darker on hover) and opens the file picker to add or change the photo; a Remove button appears once there is one; resized and stored on the server; initials are the fallback everywhere avatars show.
- Display name with its own Save button (disabled until changed).
- Email: always an input showing the current address, with a "Send link" button that is disabled until the address is changed (no Change or Cancel buttons). Sending checks the address and emails a verification link to it; the sign-in email stays the same until the link is opened (expires in 24 hours), with Resend and Cancel change while pending.
- Appearance: theme and Light/Dark as before ("Match my device" stays a later idea).
- Your Households: each household you belong to, your role (Owner, Editor, Viewer), member count and owner count, a Current tag, and Leave (red, inline confirm). The only owner of a household can't leave until someone else is made an owner.
- Security: Password (last changed date; Change password drawer with current, new (12+ characters) and confirm, and "Sign out of other devices" ticked by default); Two-step verification (recommended, optional: set up by scanning a code or typing the key into an authenticator app, then confirming a 6-digit code; 8 single-use recovery codes to download or copy; Turn off needs a current code); Signed-in devices (this device tagged, Sign out for each other device, Sign out of all other devices); Log out (red outline, this device only).
- Future: an Admin setting to require two-step verification for everyone on the server.

## Settings (review round 1, built)
- Household tab:
  - A notice at the top names the household you are in ("You are in Sample household"); switching households stays in the header menu only.
  - Household card: name with its own Save.
  - Members: avatar, name, a note that only says what that person shares with you (for example "Shares Sample Home Loan and Everyday Account with you · joined Mar 2023", or "Nothing shared with you"), never how many loans they have, plus a role chip and a ⋮ menu. Your own row's menu opens your Profile or Leave this household (in Profile). Other rows: Change role (a drawer listing Owner, Editor and Viewer one per line with descriptions) and Remove from household (red inline confirm; their loans and accounts are untouched; blocked for the last owner with "Make someone else an owner first"). Removed members go to a Removed Members section with Restore (asks first, restores their old role).
  - Invite Someone: choose the role the person joins as (Owner, Editor, Viewer), create a one-time link (7 days, your network only), copy, share or scan its QR code. Waiting invites are listed with role, made and expiry dates and a Revoke button (red confirm).
  - Delete Household: a red-outlined card for owners. Blocked while the household has loans or accounts; it names the ones you can see and adds the hidden-use line ("It's also used by loans or accounts you can't see..."). Once empty, it asks you to type the household name.
- Notifications tab (each person sets their own):
  - What to Tell You: statement missing (after 3, 7 or 14 days), rate review due (on the day, 1 week before, 2 weeks before), rate change to confirm, repayments behind, layout needs re-mapping, and for the admin, no backup for 30 days.
  - Where to Send Them: In Folio (the bell, always on) plus connectable services: Discord (webhook or bot), Telegram (bot), ntfy, Gotify, Home Assistant (notify service) and a generic webhook (JSON, optional signing secret) for other bots. Each opens a drawer with the fields it needs, how-to text, Include amounts (off by default: messages say what happened without amounts or account details), Send test message, Connect/Save and Disconnect (red confirm). Discord and Telegram are marked as outside your network; if the admin turns outside services off, they show "Turned off by the server admin".
- Layouts, Lenders and Brokers tabs (trial): each tab IS that page, not a link to it. The tab shows the full page content under the tab row: its heading with the round + and ⋮ menu, cards, filters, Deleted section and first-run state. Opening a lender, broker or layout opens its page inside the tab, with a back button to the list; the layout editor also runs inside the tab (Full screen for more room). The separate pages and their "Settings" back pill are gone.
- Links elsewhere land in the right tab: lender and broker links on loan, account and Loans pages, layout links from Statements, Add a loan and Add an account, the bell alerts (rate review opens the broker, re-mapping opens that layout) and the links between lenders and layouts all open Settings on the matching tab, with the item already open when there is one.
- Data and privacy tab: Export My Data (only the loans and accounts you're linked to, listed; CSV or JSON; optionally the original statement files); Privacy card checked from the server (server address, reachable from, alerts leaving your network and whether they include amounts, account numbers encrypted), with Check again and when it was last checked; Your Sign-In card linking to Profile.
- Server tab (Admin only, with a notice saying so):
  - Backups: status chip and last backup worked out from the schedule; automatic backups on or off, daily at 2:00am or weekly on Sunday, keep the last 7, 14 or 30, the folder on the server, when the next one runs, a 30-day reminder, recent backups with download, Back up now. Full backups include every household, so they are Admin only.
  - Restore: choose a .folio file, see what it contains (file, made, households, people, loans and accounts, statements), then a red warning that it replaces everything for every household and signs everyone out; type RESTORE to enable the button.
  - Storage: a bar and list for statement files, database, backups and free disk space.
  - Sign-Up and Security: new accounts invite only or closed; allow alerts to outside services; "Require two-step verification for everyone" shown as planned for later.
  - About Folio: version, Check for updates.
- The "Folio © v1.0.0" footer on every page links to the Server tab (shown to the admin only in the real app).
- Brokers can have a photo: the broker edit page has a Photo card (upload, change, remove; cropped to a centred square). It shows round on broker cards, the broker page, the Add a loan broker picker, the loan page contacts and the Loans page contacts; without one, initials show.

## Settings and data
- Lenders: see Lenders and brokers.
- Backups: one file with the database and statement files; download and restore; show "No backup yet" until one is made (scheduled backups to be decided).
- Privacy status: "Local only"; statements read on the server; bank details encrypted at rest.
- Signed-in devices with "Sign out other devices".

## Data model (draft)
- Instance: Lender (name, currency, day-count basis), StatementLayout (lender, name, kind PDF/CSV, version, fingerprint, mappings, status: in use / needs re-map).
- Household: User (theme, mode, display name), Household, Membership (role), Invite (token, expiry, single use).
- Lender also holds: website, phone, email, notes, icon image, logo image.
- Broker: name, company, credit licence number, office address, phone, email, website, notes, rate review settings (on/off, last review date, cadence in months). A loan has an optional broker.
- Loan also holds optional lender account number and customer ID (encrypted at rest, masked by default with Reveal and Copy on the loan page, never part of a shared scenario view).
- Loan snapshots: when a loan is archived, paid off or refinanced, it stores a copy of its lender and broker details at that moment (lenderSnapshot and brokerSnapshot: name, company, phone, email, website, licence) alongside the lender and broker ids. Archived loans always show who they were with, even after the lender is renamed or the broker is deleted.
- Loan: lender, nickname, start date, original amount, borrowers (at least one), optional broker, offset allocation order, optional redraw, posting day.
- LoanSplit: fixed or variable, fixed-term expiry, repayment settings, P&I or interest-only.
- RateChange (split, effective date, rate), RepaymentChange (split, effective date, amount).
- Account: lender, name, type (Everyday or Savings), optional BSB and account number (encrypted), linked users (at least one), optional offsetLoan (one loan at most). The loan's offset pool is the sum of the accounts linked to it.
- AccountStatement and AccountTransaction (date, amount, running balance, category, dedupe hash).
- Statement (split or account, layout version, period, original file, reconciliation status), LedgerEntry (date, type, amount, running balance, dedupe hash).
- Scenario (loan, inputs including offset mode), AlertRule. (ShareLink deferred.)
- Money is exact decimal.

## Calculation engine (draft)
Verified against a six-month sample statement: all 6 interest postings reproduced to the cent, closing balance reconciled.

Daily loop, per split:
1. Apply any rate change effective that day.
2. Apply that day's repayments, deposits, redraws and fees.
3. Allocate the offset pool across eligible splits.
4. Accrue interest: (end-of-day balance - allocated offset) x rate / day-count. The end-of-day balance includes that day's repayment but excludes interest posted that day. Keep daily amounts unrounded.
5. On the posting date, round the accrued total once (half up, to the cent) and add it to the balance.

Rules observed on the sample statement:
- Posting day is the 10th of each month. The accrual window runs from the day after the previous posting through the posting date inclusive.
- Day-count is 365. Interest only compounds after posting.
- Repayments are weekly (Thursday); the amount changed with rate rises, so repayment changes are first-class events.
- To verify: the weekly amount appears to be the monthly minimum divided by 4, rounded up.
- The bank states a forecast term; the baseline projection should land near it at current repayments (a test).

Offset:
- One pool per loan, applied only to variable splits. Fixed splits get none until they roll to variable on their expiry date.
- Allocation is capped at each split's balance, and leftover spills to the next split.
- Allocation order chosen at loan setup: work it out from my statements (default; assumes highest rate first until a statement shows the offset benefit), highest rate first, manual, or pro-rata. Only asked when the loan has two or more variable splits. The import review compares each order against a statement's reported offset benefit.

Redraw (optional per loan): available redraw is tracked from the statement's "payments in advance".

Forecast:
- Starts from the latest ledger state. Offset amount comes from the scenario's offset mode (flat in the projection). Repayments continue at the current amount unless a scenario changes them.
- Ends when the balance reaches zero. Maximum horizon 50 years.
- Scenario inputs: offset amount, extra repayments (recurring or one-off), lump sums, rate changes and stress tests, repayment frequency change, refinance (with fees).
- Outputs: payoff date, total interest, time and money saved against baseline, charts, and ahead-of-schedule.

Statement check: recompute interest from the daily ledger and flag differences over a $0.01 tolerance.

## Sharing (deferred)
To be discussed later; not part of v1 scope until decided. Ideas so far, none committed:
- Temporary expiring links, one loan per link, showing projections only as a frozen redacted snapshot, with disclosure levels (full, rounded, outcomes only), never including lender, account numbers, borrower names, bank details or statements.
- Because hosting is local only, links would work only on the LAN or VPN unless `/share/*` were exposed separately.

## Open questions
- Can borrowers grant read-only access to non-borrowers? (Possibly moot while sharing is deferred.)
- Resolved: the household switcher filters the Loans list (households are never combined); archived loans have their own collapsed section; the all-loans chart stays.
- Add menu: manual transaction or note entry, and a context-aware menu?
- Are spending categories and the transactions list in the first release, or only with the full transactions history?
- Scheduled backups, and a lender editor screen.
- Statement viewer, loan and account detail editing, and the full Scenarios page are not yet designed.

## To do (come back to)
- Home dashboard (future screen): a household overview above the Loans list; the greeting would move there.
- Editing splits: designed (see Loan page review round 1). Still to do: "Add a split".
- Server settings for Admins (not yet mocked up): back up all households, restore all households, other advanced server settings. Decide the backup format, schedule and where files are stored, then design the screens.
- Decide the real actions in the Admin member menu (contact, report a bug and others).
- Keep checking new labels for redundant text.
- Questions to ask after the review (collected while changing the mockup):
  - Statements: should the import Discard get the same faint red hover as lender Delete?
  - Lenders: should the currency (AUD) also be a pill? Should removing a lender icon or logo ask for confirmation, or is it enough that nothing is saved until Save?
  - Text fields currently apply their change when you click out of them. Should they update as you type?
  - Hover: some controls are styled one by one (category tiles, colour theme swatches) and do not yet share the common hover rules.
  - Lender icon box is white in every theme. Revisit only if a lender setting for the box colour is wanted.
  - Household roles: decide whether Admins or Owners can change other members' roles, and how a member is removed from a household (not designed yet).
- Loan actions to design (menu on the loan, red Destructive group where it applies, inline confirmation, and a message saying what is affected when an action is blocked):
  - Archive loan: designed (red Destructive group, inline confirm, Unarchive).
  - Delete a statement.
  - Remove a split: designed (modal with a reason, soft delete, Restore).
  - Remove a recorded change (for example a rate change or repayment change).
  - Remove a borrower from a loan (a loan always needs at least one borrower, so the last one cannot be removed).
  - Delete a scenario.
  - Unlinking an offset account is reversible, so it is not treated as destructive.
- Still undesigned from earlier stages: statement viewer, transactions list, full Scenarios page, alerts, loan and account detail editing (splits, rate and repayment changes), scheduled backups, whether spending categories and transactions are in the first release, add menu extras (manual transaction or note, context-aware menu), borrower read-only access, app name and logo, the spec ZIP and Claude Code milestones.

## Future features (suggestions)
- All loans together chart: clicking a loan's line or legend entry opens that loan.
- Add a loan, start from a statement: import a statement first and Folio fills in the lender, account number, splits, rates and balances, leaving you to check them and add borrowers.

## Review process
- Each mockup is reviewed thoroughly before moving to the next: Claude suggests additions, changes and removals as a numbered list, the user answers each item, the agreed list is built in one go, then the page is reviewed again.
- Change rings (pink outlines on changed parts of a screen) are paused for now. If wanted again: ring the specific parts that changed each round and remove the previous round's rings.

## Remaining stages
Done: all mockups reviewed and built as a working app, tested locally. Next: a Docker image and Unraid template, then the transactions list and the full scenarios page.

## Build notes (version 1.0, local)
- Every figure on screen is worked out from the database. Actions go through one endpoint (`/api/act`) and each one checks access itself.
- Statement import: each uploaded file is stored as pending, read, and matched against every version of every layout (best score wins). The person can pick another version; the file is read again with it. Nothing is saved until confirmed. Duplicate periods are refused, duplicate transactions skipped, new rates become rate changes to confirm. Interest is re-worked from daily balances for loans without an offset.
- A statement that looks like a lender's layout but does not fit marks that layout "Needs re-mapping". The note records only the date, never the file name, because layouts are shared across households.
- Layout editor: the sample statement is the real PDF, drawn with pdf.js, with boxes on top. "Suggest" copies the box from another layout of the same lender and kind. Step 3 reads the sample on the server with the boxes and shows the real checks; saving needs them to pass. Each save of an existing layout makes a new version.
- The layout page draws its boxes on the newest statement you can see that was read with it, otherwise on a blank page. A layout cannot be deleted while any statement on the server was read with it; the blocked message names only statements you can see plus the standard hidden-use line.
- Changing the sign-in email asks for the password and changes it straight away (there is no mail server).
- Recovery codes are shown once, when two-step is turned on or new codes are made (making new codes needs a current code and replaces the old ones). Two-step can be turned off with a code or a recovery code.
- The privacy check looks up the address the page was opened on: private addresses read as "This network only", the 100.64/10 range as "Your VPN", anything else as "A public address".
- Backups are one gzipped JSON file with every table and statement file. Encrypted fields stay encrypted, so a restore needs the same SOLOFLOW_SECRET. Restore replaces everything and signs everyone out.
- Alerts go to each person's connected services once each; secrets are encrypted; Discord and Telegram are skipped when the admin turns off outside services.
