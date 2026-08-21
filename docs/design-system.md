# Design system

## Direction

The product should feel like a calm public-information utility: independent, factual, spacious,
mobile-first, and built around verification. It does not imitate a government portal, corrections
system, marketing landing page, or generic dashboard.

Wayfinder is the approved Phase 2 working direction, not final production UX. It gives the county
task the strongest visual hierarchy, makes evidence and freshness understandable before personal
records, and converts cleanly from a desktop roster to mobile labeled records. Evidence Ledger and
Clear Field remain compact design-lab explorations, not alternate production themes.

## Design checkpoint

The development-only design lab presents the same content specimen in three directions so comparison
is based on usability rather than different content:

- **Wayfinder — approved working direction.** A strong reading path, compact county identity,
  conspicuous but restrained freshness panel, durable action hierarchy, and clear mobile scanning.
  It best supports “where am I, what does this source cover, how fresh is it, and what should I do
  next?”
- **Evidence Ledger.** More documentary and rule-driven, with dense alignment and explicit evidence
  labels. It makes provenance prominent but costs vertical rhythm and feels more administrative on
  small screens.
- **Clear Field.** Airier and quieter, with generous separation and minimal borders. It reduces
  visual load but makes source status and record grouping less immediate in high-stress use.

Each specimen includes a header, county identity block, source/freshness status, desktop roster row,
mobile roster card, primary and secondary buttons, informational/warning/error alerts, contact
details, and footer. Capture one desktop and one mobile Playwright screenshot per direction or a
clearly separated composite at each viewport.

The lab is private development infrastructure. Its route is registered only under an explicit
non-production development condition, has no sitemap or internal production link, and must be
unreachable in production—not merely hidden by CSS or robots rules.

## Visual principles

1. **Status before volume.** Source scope, last success, and warnings precede roster results and
   active count.
2. **Structure through rhythm.** Space, typography, and borders establish hierarchy; cards are used
   only when a bounded object benefits from them.
3. **Neutral about people.** Roster presentation resembles careful records, not mugshots, incident
   feeds, or arrest entertainment.
4. **Independent identity.** No seals, shields, badges, flags, stars, bars, emergency palettes,
   agency photography, or institutional mimicry.
5. **One clear next action.** Primary emphasis is reserved for the current task. Secondary and link
   treatments remain plainly interactive without competing.
6. **Meaning survives color and viewport.** Text labels, DOM order, borders, and semantics preserve
   every relationship in monochrome, high contrast, and mobile reflow.

## Token architecture

Components consume semantic CSS custom properties rather than raw values. Primitive tokens describe
the palette and scale; semantic tokens describe roles such as canvas, text, action, focus, current,
warning, and danger; component tokens are used only when a reusable component needs a stable local
decision.

Token changes require contrast, forced-colors, reduced-motion, screenshot, and component-state
review. Raw colors may appear in token definitions and data-visualization tests, not scattered
through component styles.

### Color

Wayfinder’s primary tokens are:

| Token role    | Value     | Use                                                                                  |
| ------------- | --------- | ------------------------------------------------------------------------------------ |
| warm canvas   | `#f5f5ef` | Product page background; a soft neutral that avoids institutional white/blue styling |
| ink           | `#142520` | Primary text and strongest neutral boundaries                                        |
| action        | `#075f57` | Primary buttons and actionable emphasis                                              |
| action strong | `#034b45` | Hover/pressed action and higher-contrast emphasis                                    |
| focus         | `#6b35a8` | Focus ring; deliberately distinct from action and status colors                      |
| current       | `#0b6a50` | Positive/current source status paired with an explicit text label                    |
| warning       | `#795800` | Stale/caution state paired with icon/text and a suitable light surface               |
| danger        | `#942f3a` | Source/parser failure and destructive caution, never custody or charge decoration    |

Supporting surface, muted-text, border, and status-surface tokens are derived and stored centrally.
They must be chosen by contrast testing, not opacity alone. Normal text must meet 4.5:1, large text
3:1, and meaningful UI/focus boundaries 3:1 against adjacent colors.

Current green does not mean “good person” or a favorable legal result; it means the source is within
its reviewed freshness policy. Danger red is not used for roster records or charges. Every status
includes a visible noun phrase such as “Source current,” “Data stale,” or “Source request failed.”

In forced-colors mode, allow system colors to replace fills and explicitly preserve borders, focus,
and control states with `Canvas`, `CanvasText`, `LinkText`, `ButtonFace`, `ButtonText`, and
`Highlight` as appropriate.

### Typography

Use the system sans-serif stack to minimize blocking font work, improve platform familiarity, and
avoid third-party requests. The stack must include sensible native fallbacks and must not depend on
a remote font.

Typography roles are fluid within bounded sizes:

- display/H1: compact, confident, and substantially smaller than a marketing hero;
- section heading: clear navigation within the task;
- body: at least 1rem with approximately 1.5–1.65 line height;
- small/meta: never below a comfortable 0.875rem for dates and evidence labels;
- data labels: medium weight, not all caps, with enough contrast to survive card reflow; and
- numeric/tabular values: use tabular numbers where it helps scan dates, counts, or amounts.

Reading prose is constrained to roughly 45–75 characters per line. Headings use tight but
non-colliding leading. Body copy is left aligned and never justified. Uppercase is reserved for true
abbreviations.

### Spacing

The base spacing unit is 4px. The semantic scale uses integer multiples, typically 4, 8, 12, 16, 24,
32, 48, and 64px. Components should select from that scale rather than introduce near-duplicates.

- 4–8px separates tightly related label/value details.
- 12–16px separates control internals and record fields.
- 24–32px separates related content groups.
- 48–64px separates major page sections on larger viewports, with a smaller mobile expression.

Whitespace carries hierarchy but must not push source status below the first mobile viewport
unnecessarily.

### Radius, borders, and elevation

Radius tokens are:

- `0.4rem` for controls, chips, and compact alerts;
- `0.75rem` for record groups and standard panels; and
- `1.15rem` for rare large identity or status surfaces.

Borders are the default grouping tool: a quiet 1px boundary for surfaces and a stronger boundary for
selected, error, or emphasized states. Avoid ornamental double rules and prison-bar-like repeated
vertical treatments.

Elevation is restrained. The base page and most panels are flat. A small shadow may separate a
floating menu or overlay; a moderate shadow is reserved for modal/popover layers. Roster cards do
not become a dense elevated grid.

### Focus states and controls

Interactive controls have a minimum comfortable height of 44px. The focus treatment uses the
`#6b35a8` token as a clearly visible outer ring with enough thickness and offset to remain visible
against both the element and adjacent surface. Hover is never the only indicator, and focus is not
removed on pointer interaction unless a distinct `:focus-visible` treatment remains available to
keyboard users.

Primary buttons use the action surface with high-contrast text. Hover/pressed moves to the strong
action token and provides a non-color state change. Secondary buttons use a visible border and
surface without resembling disabled controls. Tertiary actions use descriptive link styling with an
underline affordance in prose.

Disabled controls stay legible, do not carry essential explanatory text, and expose native disabled
semantics. Loading controls retain their width to prevent layout shift.

### Status treatments

Status is a component contract, not a colored badge alone. Each status includes:

- visible label and concise consequence;
- event-specific timestamp where relevant;
- optional non-decorative icon with redundant text;
- border/surface pair that meets non-text contrast; and
- appropriate semantic/live behavior.

Current, stale, valid-empty, request-failed, parser-failed, and review-needed states are visually
and verbally distinct. An informational state uses neutral/action-adjacent styling; it is not
coerced into success green. Alerts fit within normal page flow and do not resemble emergency
dispatch banners.

### Breakpoints and reflow

Responsive breakpoint tokens are `36rem`, `52rem`, and `72rem`. Components respond to their
available space; page behavior should not assume a device name.

- Below `36rem`, roster records use labeled vertical groups, actions may fill available width, and
  identity/status remain compact.
- At and above `36rem`, paired fields and compact actions may align when labels remain clear.
- At and above `52rem`, the roster may use a semantic table or denser row presentation and
  county/source content can use measured columns.
- At and above `72rem`, maximum content width and larger section rhythm prevent overlong lines; no
  oversized hero is introduced.

The layout must reflow at 320 CSS pixels and 400% zoom without loss or two-dimensional page
scrolling.

### Motion

Motion durations are 120ms for direct control feedback and 200ms for small disclosure/state
transitions. Use restrained easing and animate opacity or color only where it clarifies causality;
avoid large transforms, spring effects, looping status animation, parallax, and skeleton shimmer.

Under `prefers-reduced-motion: reduce`, nonessential transitions and animations are removed, smooth
scrolling is disabled, and state changes remain immediately understandable. Motion never
communicates source freshness by itself.

## Component guidance

### Header and navigation

Keep the header compact. It contains configurable product identity, primary public navigation, and
no government-styled crest. Mobile navigation uses a native or accessible disclosure with an
explicit label, stable focus, and no full-screen marketing treatment.

### County identity and freshness

The county H1, facility/jurisdiction label, independence context, and source status form one reading
sequence. Freshness is a bounded panel close to identity, not a floating KPI card. It shows last
successful fetch and latest check as distinct events and states the custody scope in plain language.

### Roster records

Desktop rows prioritize display name, booking/source identifier only when valid, booking time,
charges, and bond groups without flattening. Mobile cards preserve the same order and labels. No
portrait slot, mugshot frame, hover reveal, or link to a person page exists.

### Alerts

Information, valid-empty, stale, request-failed, parser-failed, and form-error alerts use the same
structural anatomy but not identical severity semantics. Server-rendered alerts sit in reading
order; only newly changing states use live announcements.

### Contacts and footer

Contacts use semantic address/description-list patterns, purpose labels, and restrained call
actions. The footer is minimal: independence statement, core trust/policy links, correction path,
and configured identity. It does not repeat the page navigation as an SEO block.

## Validation

Before recommendation and handoff, verify all three directions at desktop and mobile widths with
Playwright screenshots, axe, keyboard order, 200% zoom, forced colors, and reduced motion. For
Wayfinder, additionally test all status variants, long fictional charge text, multiple bonds, empty
and failure states, no-JavaScript first-page rendering, and appended mobile records.

The recommendation is based on task hierarchy, freshness comprehension, record relationships, mobile
scanning, and accessibility—not visual novelty alone.
