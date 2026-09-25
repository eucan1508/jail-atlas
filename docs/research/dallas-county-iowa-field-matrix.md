# Dallas County, Iowa field evidence matrix

Research date: **August 21, 2026**

Decision context: **ELIGIBLE FOR PHASE 2B**. This matrix permits only separately approved adapter
and fictional-fixture work. It does not approve persistence, public display, Dallas County
publication, Iowa activation, deployment, or any real-person fixture.

The observed source was the officially routed
[`Dallas County Inmate Inquiry`](https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True),
supported by the official
[Dallas County Jail Division](https://www.dallascountyiowa.gov/364/Jail-Division). Inspection was
limited to source labels, aggregate structure, the source empty renderer, and a small
current/multiple-booking detail sample. No identifiable person value was recorded.

## Source-scope rule

The proposed scope is the result of the exact `InCustody=True` query. Each observed list record
reported `Yes` under `In Custody`. Detail pages can contain historical released bookings; those
sections are excluded. No returned or calculated record count may be called total jail population,
and absence from a later response is not release evidence.

## Candidate field matrix

| Field                                  | Source label/location                                                                  | Present      | List/detail              | Normalizable                        | Publication necessity                                                                    | Ambiguity/risk                                                                                                                                                                            | Decision                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------- | ------------ | ------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `full_name`                            | List `Name`; detail `Demographic Information` name field                               | Yes          | Both                     | Yes                                 | Yes — needed to use the custody list                                                     | Preserve source spelling/order. Do not collect aliases or infer components.                                                                                                               | Yes — one source-faithful display string with field provenance                   |
| `custody_status`                       | Request/control `In Custody`; list column `In Custody` with explicit `Yes`             | Yes          | List                     | Yes                                 | Yes — defines the approved scope                                                         | The detail contains booking history, so list custody status must not be inherited by every historical booking.                                                                            | Yes — current only on exact query and exact `Yes` value                          |
| `booking_number`                       | Detail booking heading explicitly prefixed `Booking`                                   | Yes          | Detail                   | Yes                                 | Not confirmed — useful for booking distinction; public display needs minimization review | Must not be confused with `Subject Number`, bond number, charge number, or detail locator. Multiple booking sections may exist.                                                           | Yes for candidate normalization; public display not yet approved                 |
| `booked_at`                            | Detail booking field `Booking Date`                                                    | Yes          | Detail                   | Not confirmed                       | Yes — useful booking context                                                             | No timezone/UTC offset is displayed. Current domain requires an ISO instant, so normalization needs an approved Dallas timezone/DST rule.                                                 | Conditional — do not invent a timezone; keep null until rule is approved         |
| `released_at`                          | Detail booking field `Release Date`                                                    | Yes          | Detail                   | Yes structurally                    | No for current-only storage; used only to exclude historical sections                    | A blank value was consistent with active-looking sampled sections, while populated values marked history. Missing alone is not a public release fact.                                     | No persistence for initial scope; transient current-section validation only      |
| `charges`                              | Booking-local charge table and charge/court-date table                                 | Yes          | Detail                   | Yes                                 | Yes — needed to preserve official booking meaning                                        | Multiple rows were observed. Court-date associations and historical booking rows are out of scope. Attach only to the selected current booking.                                           | Yes — ordered child records; never flatten                                       |
| `charge description`                   | Charge-table column `Charge Description`                                               | Yes          | Detail                   | Yes                                 | Yes — minimum useful charge field                                                        | Treat as untrusted source text. Do not turn it into guilt, conviction, disposition, or legal advice.                                                                                      | Yes — source-faithful escaped text with length limits                            |
| `case number`                          | Charge-table column `Docket Number`                                                    | Yes          | Detail                   | Yes                                 | No — unnecessary for initial custody verification                                        | Additional identifying court data; domain `Charge` has no docket-number field. Repurposing a field is prohibited.                                                                         | No for initial ingestion/publication                                             |
| `arresting or committing agency`       | `Booking Origin`; charge-table `Arresting Agency`                                      | Yes          | Detail                   | Yes                                 | Not confirmed                                                                            | Two different agency concepts exist and may differ by charge. Current booking model has no agency field.                                                                                  | Not confirmed — require necessity and explicit schema decision                   |
| `bond/bail information`                | Booking-local table `Bond Number`, `Bond Type`, `Bond Amount`; separate booking totals | Yes          | Detail                   | Yes with reviewed enumeration rules | Yes when meaning is preserved                                                            | Multiple rows observed. No charge/case key exists. Exact `NO BOND` differs from monetary types. Missing states and additional types are unconfirmed. Source totals must not replace rows. | Yes — ordered booking-level rows only; exact mappings fail closed                |
| `source detail URL`                    | List link to `/Inmate/Detail/{source locator}`                                         | Yes          | List-to-detail transport | No                                  | No — public person URLs conflict with product policy                                     | Locator meaning/stability is undocumented and sensitive.                                                                                                                                  | No storage/publication; transient worker locator only                            |
| `source update or retrieval timestamp` | No source event timestamp; worker retrieval events only                                | Inconsistent | Page-level/internal      | Retrieval only                      | Yes internally for freshness                                                             | No update cadence, timezone, `ETag`, or `Last-Modified`. Retrieval cannot be relabeled as county update time.                                                                             | Yes for `capturedAt`, `lastCheckedAt`, `lastSuccessAt`; no `sourceLastUpdatedAt` |

## Current-booking selection evidence

The current list is person-oriented and can link to more than one booking section. In three sampled
`Multiple Bookings` details, each had one booking with empty `Release Date` plus populated
`Housing Facility`, and one booking with populated `Release Date` plus no populated facility.

This is a candidate parser invariant, not permission to guess. Phase 2B fixtures must cover:

- one explicit-current list record with one active booking;
- a current list record with one active and one released historical booking;
- zero active-looking booking sections;
- more than one active-looking section;
- release/facility contradictions; and
- list/detail identity or booking-heading mismatch.

Only the first two can normalize successfully after review. Every ambiguity fails the snapshot.

## Bond-specific decision matrix

| Question                                        | Finding                                                     | Normalization consequence                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| What owns bond rows?                            | The bond table is nested inside one booking section.        | Attach every row to that booking only.                                                          |
| Is a charge/case key present in the bond table? | No.                                                         | Do not attach a bond to a charge/case.                                                          |
| Can a booking contain multiple bond rows?       | Yes, observed in the minimized sample.                      | Preserve every row and source order.                                                            |
| Is `No Bond` explicit?                          | Yes: exact observed `Bond Type` value `NO BOND`.            | Map to `no_bond` only on the reviewed exact enumeration.                                        |
| Is zero alone `No Bond`?                        | No. The semantic signal is `Bond Type`, not amount.         | Never map a zero or missing amount by itself to `no_bond`.                                      |
| Were monetary forms observed?                   | Yes: `CASH ONLY` and `CASH/SURETY` with positive amounts.   | Preserve type as a note/approved enumeration and normalize amount only after currency approval. |
| Does missing table/row/type mean `No Bond`?     | Not confirmed.                                              | Use `unknown` or fail validation according to the approved fixture; never infer `no_bond`.      |
| Is currency explicit?                           | A dollar sign is displayed; no ISO code was observed.       | Mapping to `USD` requires an approved source/jurisdiction rule.                                 |
| May booking totals replace rows?                | No. Separate source totals and individual rows are exposed. | Do not collapse rows or calculate an invented total. Omit totals initially.                     |

## Fields excluded by minimization

The source also exposes photograph, `Subject Number`, race, gender, height, weight, address, booking
origin, housing detail, prisoner type, court dates, docket number, offense date, sentence date,
disposition, sentence length, crime class, arresting agency, bond number, source totals, and
released booking history.

Their presence does not make them necessary. Initial Phase 2B fixtures and normalization should
exclude them unless a separate field-specific necessity, provenance, schema, retention, and display
review approves one.

## Smallest candidate Phase 2B field set

Subject to the unresolved approvals, the smallest useful set is:

- source-faithful display name;
- explicit current-custody status;
- explicitly labeled booking identifier for internal booking distinction;
- booking date only after timezone policy approval;
- ordered current-booking charge descriptions; and
- ordered current-booking bond rows using exact reviewed type semantics.

No field is approved for real persistence or publication by this document. Phase 2B must use wholly
fictional, hand-authored structural fixtures and must stop again for human review before any live
write or route activation.
