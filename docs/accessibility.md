# Accessibility

## Standard and responsibility

The product targets WCAG 2.2 Level AA across mobile and desktop. Accessibility is a release
requirement shared by design, engineering, content, and data work; automated scans supplement rather
than replace keyboard, screen-reader, zoom, and cognitive walkthroughs.

The primary supported tasks are finding a county, interpreting freshness and source status,
reviewing roster results, loading more records, locating a verified contact, understanding evidence,
and reporting a correction.

## Semantic page structure

- Include a keyboard-visible skip link to the main content.
- Use landmarks (`header`, `nav`, `main`, and `footer`) with unique labels where multiple landmarks
  share a role.
- Render one meaningful `h1`; use heading levels to represent the information hierarchy, not
  typography.
- Use visible, ordered breadcrumbs in a labeled navigation element and identify the current page.
- Use lists, description lists, tables, addresses, times, and buttons for their actual semantics.
- Keep source and freshness explanations in text; color and icons are supplementary.
- Set document language from validated locale configuration (`en-US` initially).

Independence from government appears as plain text, not only a logo treatment or footer disclosure.

## Roster presentation

The first 25 records render in server HTML. Essential roster access and all explanatory, source, and
contact content work with JavaScript disabled.

On wider viewports, a semantic table may be used when it improves relationships between booking
fields. It must have a caption, column headers, appropriate row headers where useful, and no
critical content available only by hover. Complex booking details with multiple charges and bonds
should use nested lists or labeled groups rather than an overly wide table.

On narrow viewports, each booking may render as a labeled article/card. DOM order must match reading
and visual order. Labels remain visible; position, columns, or punctuation alone do not convey
meaning. Multiple charges and bond entries are separate accessible list items.

The roster container uses `data-nosnippet` without hiding content from assistive technology. Do not
apply `aria-hidden` to meaningful roster data.

Status text must distinguish current custody, recent release, valid empty, stale data, source
failure, and parser failure. “No bond,” “not published,” “unknown,” and “not applicable” remain
distinct spoken labels.

## Load more interaction

Use a native `button`, not an anchor or clickable `div`. The accessible name begins as “Load more
records” and includes additional context only if concise. The cursor is never exposed as a navigable
URL.

Interaction states:

- **ready:** enabled button and, where useful, remaining-result context;
- **loading:** button disabled to prevent duplicate requests, visible progress text, and a polite
  status announcement such as “Loading more custody records”;
- **success:** focus remains on the button unless it disappears; a polite announcement reports the
  number added and total shown;
- **retry:** an inline error is associated with the control, preserves existing results, and offers
  a clearly named retry button;
- **complete:** the load button is removed or disabled and a polite “All available records are
  shown” message appears.

Appended content follows the existing list/table without reannouncing or duplicating editorial
sections. Do not force focus to the first appended row; offer a non-disruptive result count and
preserve virtual-cursor continuity. Prevent duplicate announcements from nested live regions.

## Keyboard and focus

All functionality is available with keyboard alone in a logical DOM sequence. Focus order follows
reading order at every breakpoint; CSS reordering does not change it.

- Use native controls wherever possible.
- Do not implement single-key shortcuts.
- Every focused interactive element has a persistent high-contrast focus indicator with sufficient
  area under WCAG 2.2 focus-appearance guidance.
- Sticky headers or banners must not fully obscure focused elements; use scroll padding and test at
  200% and 400% zoom.
- Modal behavior, if introduced, uses a proven accessible primitive, labeled title/description,
  focus containment, Escape dismissal where safe, and focus restoration.
- Touch targets are at least 24 by 24 CSS pixels with adequate spacing; primary mobile actions
  target approximately 44 pixels for comfort.

## Forms and correction flow

Every input has a persistent visible label. Instructions appear before the fields they govern.
Required state is conveyed in text and programmatically, and format examples do not rely on
placeholder text.

Server validation is authoritative. On error:

1. retain safe user input;
2. show a concise summary linked to invalid fields;
3. place specific text next to each field and connect it with `aria-describedby`;
4. set `aria-invalid="true"`; and
5. move focus to the summary only after a submitted validation failure.

Success is a visible heading/status, not a color change. Spam protection must not require an
inaccessible puzzle; prefer a honeypot, time threshold, rate limit, and server-side risk signal. The
privacy notice explains optional contact information and warns against unnecessary sensitive data.

## Visual access

All normal text meets a 4.5:1 contrast ratio; large text meets 3:1; meaningful non-text UI,
boundaries, and focus indicators meet 3:1 against adjacent colors. Disabled controls remain
understandable but are not used to hide essential status.

Layouts reflow at 320 CSS pixels and 400% zoom without two-dimensional scrolling except for
genuinely tabular content. Even tables should prefer responsive labeled records when horizontal
scrolling would obscure relationships.

Text supports browser spacing overrides: 1.5 line height, 2x paragraph spacing, 0.12em letter
spacing, and 0.16em word spacing without clipping or loss. Avoid justified body copy and long
all-cap labels. Keep line lengths near 45–75 characters in reading sections.

Status icons, if present, have an accessible text equivalent and are not the sole signal. Decorative
SVGs are hidden from assistive technology and cannot receive focus.

## Motion and timing

Animation is limited to brief state clarification. Respect `prefers-reduced-motion: reduce` by
removing nonessential transforms, smooth scrolling, parallax, shimmer, and looping effects. No
interaction has a user-facing timeout unless security requires it; any session timeout must warn and
offer extension.

Loading skeletons must not flash, shift layout, or announce every placeholder. Reserve roster and
status space to support the CLS target below 0.1.

## Links, labels, and language

Link text describes its destination, especially source pages and policies. Avoid repeated “learn
more” labels without accessible context. External links do not need to open a new tab; if one does,
disclose that behavior.

Explain institutional, legal, or technical terms on first use. Dates include timezone or context
when ambiguity could change a user decision. Do not rely on abbreviations for custody or bond
semantics. Plain language does not remove necessary precision.

## Error and status boundaries

Next.js loading, not-found, and error states use the same landmarks and accessible design language
as successful pages. A source failure is not a `404`; an unpublished county is. Error boundaries do
not expose stack traces, raw source content, identifiers, or secrets.

Critical source-status alerts use `role="status"` for nonurgent updates. Reserve `role="alert"` for
a newly occurring error that requires immediate awareness; server-rendered page status generally
needs no live role because it is already in the reading order.

## Test matrix

Automated coverage includes axe scans at representative desktop and mobile widths for the home,
coverage, county, trust, correction, error, and development-lab examples. It also tests
heading/landmark structure, accessible names, duplicate IDs, dialog behavior if present, and color
contrast detectable by automation.

Playwright flows cover:

- keyboard-only county finding;
- skip-link and breadcrumb use;
- table or card navigation at desktop and mobile widths;
- load-more loading, success, retry, and end states;
- correction validation and success;
- no-JavaScript access to the first 25 records; and
- reduced-motion behavior.

Manual release checks use at least one Chromium screen reader pairing and one platform-native
alternative, keyboard-only navigation, 200%/400% zoom, 320-pixel reflow, forced-colors/high-contrast
mode, text-spacing overrides, touch target review, and reduced motion.

Accessibility regressions at serious or critical impact block release. Other defects require an
owner, documented user impact, and time-bound resolution; core-task barriers are never waived for
Phase 1 handoff or production.
