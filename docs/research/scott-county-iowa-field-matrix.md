# Scott County, Iowa field evidence matrix

Research date: **August 21, 2026**

Decision context: **NOT ELIGIBLE FOR PHASE 2B**. This matrix records field structure observed in the
current public application. It does not approve an adapter, persistence, public display, county
publication, or any current Phase 2B normalization.

The observed source was the officially linked
[`www.scottcountyiowa.us` roster application](https://www.scottcountyiowa.us/sheriff/inmates.php),
reached from the official
[Scott County Inmate Listing](https://www.scottcountyiowa.gov/sheriff/inmates). Inspection was
deliberately limited to source labels, types, aggregate structure, and a minimal list/detail sample.
No real-person value was recorded.

## Source-scope restriction

The live application expressly states: **“This roster is not a comprehensive listing of all the
inmates being held in the Scott County Jail.”** This is a primary field-provenance limitation. A
`Yes` below means only that a field was present for a record the application chose to display. It
does not mean the field or record exists for every person held, and it cannot establish that the
displayed set is complete.

The application can verify only its displayed records. No source-row count, current-status count,
partition count, or calculated aggregate may be described as total jail population, total inmates,
complete roster, or complete active custody. An unlisted person cannot be described as absent from
Scott County Jail on this source's evidence.

## Candidate field matrix

| Field                                  | Source label/location                                                                                                                                               | Present      | List/detail                                          | Normalizable                                      | Publication necessity                                                                                                        | Ambiguity/risk                                                                                                                                                                                                                                       | Decision                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `full_name`                            | List table: `Inmate Name (last, first, middle)`; detail definition list: `First:`, `Middle:`, `Last:`, `Affix:`                                                     | Yes          | Both                                                 | Yes                                               | Yes — a name is necessary to make the custody list usable                                                                    | List formatting must be preserved; component splitting must not invent absent parts. Sampled detail components matched list tokens, but population-wide consistency is not confirmed. Do not collect aliases.                                        | Yes — normalize one source-faithful display string; retain field provenance                                              |
| `custody_status`                       | Search option: `In Custody` / `Released (within last seven days)`; list `Release Date Time` cell contains `In Custody` or a release date/time                       | Yes          | List; corroborated on detail                         | Yes                                               | Yes — required to avoid presenting recent releases as current custody                                                        | Status is encoded in a release column rather than a dedicated row field. Exact literal matching is required; blank or missing is not current custody.                                                                                                | Yes — normalize only the explicit current literal or an explicit release timestamp                                       |
| `booking_number`                       | Detail definition list: `Booking Number:`                                                                                                                           | Yes          | Detail                                               | Yes                                               | Not confirmed — useful for booking distinction, but public display needs a separate minimization decision                    | Explicitly source-labeled as a booking number. Not available on the list; requires detail fan-out. Completeness and repeated-booking behavior are unconfirmed. Must not be confused with `sysid` or `Permanent ID`.                                  | Yes for possible normalization; Not confirmed for public display                                                         |
| `booked_at`                            | List: `Booking Date Time`; detail: `Booking Date Time:`                                                                                                             | Yes          | Both                                                 | Not confirmed                                     | Yes — useful to distinguish bookings and assess current information                                                          | Present in every row of the sampled partition and matched between sampled list/detail records, but no timezone or UTC offset is displayed. Parsing to an instant would require an approved Scott County timezone rule.                               | Not confirmed — preserve source-local text until timezone policy is approved                                             |
| `released_at`                          | List: `Release Date Time`; detail: `Release Date:`                                                                                                                  | Yes          | Both                                                 | Not confirmed                                     | No for the proposed current-custody-only snapshot; potentially necessary only for a separately approved recent-release scope | Current rows carry the literal `In Custody`; released rows carry an unlabeled-timezone date/time. Recent-release retention and timezone mapping are unapproved. Absence must not create a release fact.                                              | No for initial public storage/display; may be used transiently to exclude released rows                                  |
| `charges`                              | List column: `Charges`; detail table: `Case #`, `Description`, `Grade`, `Offense Date`, `Jurisdiction`, `Conviction Date`, `Sentence Date`, `Sentence`, `Sent Type` | Yes          | Both; authoritative structure requires detail review | Yes                                               | Yes — source-published charge information is part of booking interpretation                                                  | Multiple rows were observed. List and detail representations may differ in density. Rows must remain attached to one booking and in source order. Do not turn charge text into guilt or disposition.                                                 | Yes — ordered child records only; never flatten                                                                          |
| `charge description`                   | Detail charge-table column: `Description`; list summary under `Charges`                                                                                             | Yes          | Both                                                 | Yes                                               | Yes — the minimum useful charge field                                                                                        | Description was populated in every row of the limited detail sample, but population-wide consistency is not confirmed. Treat as untrusted text and preserve wording.                                                                                 | Yes — source-faithful text with escaping, length limits, and booking ownership                                           |
| `case number`                          | Detail charge-table column: `Case #`                                                                                                                                | Yes          | Detail                                               | Yes                                               | No — not necessary for the initial custody-verification task                                                                 | More identifying data; the current domain `Charge` model has no case-number field. A schema change or repurposing another field would be required, and repurposing is prohibited.                                                                    | No for initial ingestion/publication; reconsider only through a separate necessity and schema review                     |
| `arresting or committing agency`       | List: `Committing Agency`; detail: `Committing Agency:`                                                                                                             | Yes          | Both                                                 | Yes                                               | Not confirmed — can help route arrest-report questions, but is not required to establish custody                             | The limited list/detail comparison matched exactly, but population-wide consistency is not confirmed. The source says committing agency, not arresting agency. Current booking schema has no agency field.                                           | Not confirmed — require a necessity decision and an explicit domain field before normalization                           |
| `bond/bail information`                | Detail bond table: `Date Set`, `Type ID`, `Bond Amt`, `Status`, `Posted By`, `Date Posted`                                                                          | Yes          | Detail                                               | Inconsistent                                      | Not confirmed — useful, but only if meaning can be preserved without legal inference                                         | Multiple rows exist. The table has no charge/case key. `No Bond` was observed explicitly in `Type ID`; separate zero monetary rows also exist. Missing-table/row meaning and population-wide formats are unconfirmed. Dollar symbol has no ISO code. | Not confirmed — booking-level ordered rows only after exact value, currency, absence, and retention rules are approved   |
| `source detail URL`                    | List anchor to `/sheriff/inmates.php?sysid={source locator}`                                                                                                        | Yes          | List-to-detail transport                             | No                                                | No — a public person/detail link conflicts with the no-profile route policy                                                  | `sysid` meaning, stability, scope, and reuse are undocumented. Query values are sensitive and must not enter logs, fixtures, public URLs, analytics, sitemaps, or structured data.                                                                   | No as a published/stored field; transient worker locator only for a later approved complete feed                         |
| `source update or retrieval timestamp` | Page notice says `updated every ten minutes`; no source-generated timestamp, timezone, `Last-Modified`, or `ETag`; worker retrieval time is internal                | Inconsistent | Page-level/internal                                  | Yes for retrieval time; No for source-update time | Yes internally for freshness; a source-update time may not be published because it is absent                                 | The ten-minute frequency is not an event timestamp. Request/build time cannot be relabeled as county update time.                                                                                                                                    | Yes for `capturedAt`, `lastCheckedAt`, and `lastSuccessAt`; No for `sourceLastUpdatedAt` unless the source publishes one |

## Consistency limits

The sampled surname partition showed the list-level name, booking date/time, custody/release cell,
committing agency, and charges populated in every row. Two linked detail pages—one current and one
recent-release structure—both exposed an explicit booking number, charge rows, and bond rows. These
are narrow structural observations about displayed records. The source's express non-comprehensive
notice prevents any population-wide completeness claim regardless of sample consistency.

The matrix uses `Not confirmed` where any of the following is unresolved:

- result truncation could hide records or field variants;
- a field needs detail-page fan-out that has no approved request budget;
- the source provides no timezone;
- list and detail consistency is not proven across the full source;
- an absence meaning is undocumented; or
- the existing domain model cannot store the field without a schema decision.

## Bond-specific decision matrix

| Question                                           | Finding                                                  | Normalization consequence                                                       |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| What owns the bond rows?                           | The bond table is on one booking detail page.            | Attach rows to the booking only.                                                |
| Is a charge or case key present in the bond table? | No.                                                      | Do not attach a bond to a charge/case and do not infer a relationship.          |
| Can one detail contain multiple bond rows?         | Yes, observed in the minimal sample.                     | Preserve every row and source order.                                            |
| Is `No Bond` explicit?                             | Yes, observed as a `Type ID` value.                      | Map to `no_bond` only on an exact, fixture-covered source value.                |
| Is zero monetary bond the same as `No Bond`?       | No; both appeared as distinct source row forms.          | A zero amount remains a monetary row unless official semantics prove otherwise. |
| Does a missing amount/table mean `No Bond`?        | Not confirmed.                                           | Default to `unknown`; never infer `no_bond`.                                    |
| Is currency explicit?                              | A dollar symbol was observed; no ISO code was displayed. | Mapping to `USD` needs an approved jurisdiction/source rule.                    |
| Can rows be totaled?                               | No mapping or payable-total rule is documented.          | Never calculate or display an invented total.                                   |
| Are `Posted By` and `Date Posted` proportionate?   | No for the initial public task.                          | Do not collect or publish them.                                                 |

## Fields excluded by minimization

The detail page also exposes a permanent identifier, full date of birth, age, city/state, physical
descriptors, aliases, release-detail fields, and images. Their presence does not make them
necessary. They are rejected for the proposed product scope and must not be copied into fixtures,
logs, snapshots, public markup, or metadata.

## Field set only after a complete replacement feed is approved

The current source is not eligible for Phase 2B, so no field is approved for implementation now.
Scott County may be reconsidered only if an official institution supplies or documents a complete
current-custody feed, its enumeration/cap behavior, and deterministic empty/failure semantics. If
that occurs and a separate Phase 2B is approved, the smallest candidate normalization set would be:

- source-faithful display name;
- explicit current-custody status;
- explicitly labeled booking number, subject to public-display minimization review;
- booking date/time after timezone policy approval;
- ordered charge descriptions attached to the booking; and
- ordered booking-level bond entries only after exact absence, value, and currency semantics are
  approved.

Case number, recent-release persistence, `sysid`, permanent ID, full birth date, images, physical
descriptors, aliases, posted-by fields, and unsupported agency normalization are outside that
candidate set.
