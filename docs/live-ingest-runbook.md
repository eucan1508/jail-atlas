# Live ingest activation runbook

The repository now contains a guarded live worker, but it is intentionally not enabled by the
migration. The migration provisions the three audited Iowa source records as `verification_pending`,
with the adapter records disabled and publication approval off.

1. Apply migrations through the repository workflow so the customer does not need to open Neon:

   ```text
   GitHub → Actions → Apply database migrations → Run workflow → confirm: APPLY
   ```

   The workflow uses the existing customer `DATABASE_URL` repository secret. It validates the
   migration journal and applies append-only Drizzle migrations. If the workflow is unavailable, the
   same command can be run from a customer-controlled environment:

   ```text
   pnpm --filter @jail-atlas/database db:migrate
   ```

2. Run one dry-run per approved Iowa adapter. The dry-run reads source metadata from Neon, performs
   the network allowlist and parser checks, and does not write a custody snapshot:

   ```text
   INGEST_MODE=live
   INGEST_NETWORK_ACCESS=enabled
   INGEST_DATABASE_WRITES=disabled
   ALLOW_LIVE_SOURCE_FETCHES=true
   SOURCE_HOST_ALLOWLIST=inmates.dallascountyiowa.gov
   DATABASE_URL=<customer Neon URL>
   LIVE_SOURCE_ADAPTER_KEY=dallas-newworld-inmate-inquiry
   pnpm --filter @jail-atlas/ingest-worker dev -- run --dry-run
   ```

   Repeat with the Cedar and Black Hawk hostnames and adapter keys after their source pages pass the
   same check.

3. After a dry-run succeeds, approve the source without opening Neon:

   ```text
   GitHub → Actions → Approve live source → Run workflow
   adapter_key=<approved adapter key>
   state=<IA, MN, TX, AR, or OK>
   county_slug=<county slug>
   confirm=APPROVE
   ```

   This transaction marks the source healthy, enables its adapter, and publishes the county. Only
   run it after the source-specific dry-run and human review have passed.

   For the four audited Iowa sources, the worker can also run the checks sequentially in county
   order:

   ```text
   INGEST_MODE=live
   INGEST_NETWORK_ACCESS=enabled
   INGEST_DATABASE_WRITES=disabled
   ALLOW_LIVE_SOURCE_FETCHES=true
   SOURCE_HOST_ALLOWLIST=inmates.dallascountyiowa.gov,cedarcounty.iowa.gov,www.bhcso.org,sofiles.cerrogordo.gov,ww1.johnsoncountyiowa.gov,polkinmates.polkcountyiowa.gov,injail.wcicc.com,marshall-so-ia.zuercherportal.com
   DATABASE_URL=<customer Neon URL>
   pnpm --filter @jail-atlas/ingest-worker dev -- run --state=IA --dry-run
   ```

   Polk County is paused: its Current Inmate Listing answers from other networks, but its Akamai
   edge returns HTTP 403 to GitHub Actions runners within seconds of the per-person detail requests,
   and then refuses the list too. The adapter (`polk-county.ts`) and its source row stay in place
   and can be re-enabled in `live-state-runner.ts` if the refresh moves to a network the county
   accepts.

   Clinton County is paused the same way: its jail portal answers from other networks, but returns
   HTTP 403 to GitHub Actions runners on the first request, before any list is read. The adapter
   (`jail-portal.ts`, shared with Marshall County) and its source row stay in place, unapproved.

   The state command is intentionally limited to Dallas, Cedar, Black Hawk, and the Ramsey, Stearns,
   Anoka, Mower, Wright, and Carlton Minnesota adapters until the remaining Iowa and Minnesota
   source contracts have approved adapters. A dry-run is allowed while the source rows are
   `verification_pending`; it never writes a snapshot or changes publication status.

   Ramsey can be checked with the public county open-data host:

   ```text
   INGEST_MODE=live
   INGEST_NETWORK_ACCESS=enabled
   INGEST_DATABASE_WRITES=disabled
   ALLOW_LIVE_SOURCE_FETCHES=true
   SOURCE_HOST_ALLOWLIST=opendata.ramseycountymn.gov,jailroster.stearnscountymn.gov,incustodysearch.co.anoka.mn.us,mower-sftp.co.mower.mn.us,www.wrightcountymn.gov,jailroster.co.carlton.mn.us,www.douglascountymn.gov,www.stlouiscountymn.gov,www.steelecountymn.gov,www3.crowwing.us,custody.renvillecountymn.gov,web1.co.ottertail.mn.us,inmatelocatorext.co.sherburne.mn.us,www2.kcmn.us,web1.washingtoncountymn.gov,dakotacountymn.gov,files.claycountymn.gov,www.winonaco.com,api.hennepincounty.gov,jailroster.hennepin.us,ftp.co.nobles.mn.us,api.correctionsrecordssearch.com,www.freeborncountymn.gov,cms5.revize.com,redwoodcounty-mn.gov,map.co.clearwater.mn.us
   DATABASE_URL=<customer Neon URL>
   pnpm --filter @jail-atlas/ingest-worker dev -- run --state=MN --dry-run
   ```

   Milam County, Texas can be checked against the official sheriff roster with:

   ```text
   SOURCE_HOST_ALLOWLIST=www.milamcountysherifftx.org
   pnpm --filter @jail-atlas/ingest-worker dev -- run --state=TX --dry-run
   ```

   The Texas sequence runs Milam, Kendall, Kleberg, Burleson, Tom Green, Angelina
   (`www.angelinacounty.net`), and Robertson. Burleson, Tom Green, and Robertson use the shared
   `sheriff-roster-site.ts` adapter, configured in `texas-rosters.ts`. Hutchinson is paused: its
   sheriff domain stopped resolving on 2026-09-30, and the county's replacement page is a hand-typed
   list headed "Recently Released Inmates", so it cannot be read as current custody. Its adapter and
   guide stay in the repository and can be re-enabled in `live-state-runner.ts` if a reliable roster
   returns.

   Arkansas runs Jefferson, Logan, Greene, Cleburne, Faulkner, Hot Spring, Baxter, St. Francis,
   Mississippi, Randolph, Hempstead, Izard, and Cross through one shared adapter
   (`sheriff-roster-site.ts`, configured in `arkansas-rosters.ts`). Jefferson, Logan, Mississippi,
   Randolph, Hempstead, and Izard use the `roster.php?grp=` layout; Greene, Cleburne, Faulkner, Hot
   Spring, Baxter, St. Francis, and Cross use `/inmate-roster/filters/current/...` paths and only
   the current view is read. Every crawl must collect exactly the count in the page's "Inmate Roster
   (N)" heading or the county fails closed. The Sharp, Stone, Lonoke, Independence, and Dallas
   County rosters are hosted by their roster service at `www.myr2m.com` and read by
   `myr2m-roster.ts`, which pages with ASP.NET form posts (the only source allowed to POST) and must
   match both the "shown out of N total" line and the roster's name list:

   ```text
   SOURCE_HOST_ALLOWLIST=www.jeffcoso.org,www.loganso.com,www.greenesoar.gov,www.cleburnearso.gov,www.fcso.ar.gov,www.hotspringcountysoar.gov,www.baxtercountysheriff.com,www.stfranciscountysheriff.org,www.mississippicountysheriffar.org,www.randolphcountysheriff.org,www.hempsteadcountysheriff.org,www.izardcountysheriff.org,www.crosscountysheriff.org,www.myr2m.com
   pnpm --filter @jail-atlas/ingest-worker dev -- run --state=AR --dry-run
   ```

   Oklahoma runs Wagoner, Lincoln, Pawnee, Seminole, Carter, Canadian, Sequoyah, Muskogee, Ottawa,
   Love, Greer, Major, Jackson, and Custer, which read the JSON endpoints behind each sheriff's
   inmate search (`/dmxConnect/api/Booking/`). For all fourteen, the list total must match its rows
   and a second official ID list must name the same people. Wagoner, Canadian, Sequoyah, and Jackson
   also fetch each booking's detail for its charges and check it against the list entry (the
   Canadian, Sequoyah, and Jackson details also carry the booking number and must show no release
   date); the Lincoln, Pawnee, Seminole, Carter, Muskogee, Ottawa, Love, Greer, Major, and Custer
   lists already carry the charges and must show no release dates. On a mismatch the crawl restarts
   (up to three times) and then fails closed:

   ```text
   SOURCE_HOST_ALLOWLIST=www.wagonercountyso.org,lincolncountysheriffok.gov,www.pawneecountysook.gov,www.seminolecosheriff.com,www.cartercountysheriff.us,ccsheriff.net,scsok.org,www.muskogeeso.org,www.ottawacountysook.gov,www.lovecosheriff.com,www.greercountysheriff.org,www.majorcosheriff.com,www.jacksoncountyso.com,www.custercountysheriff.com
   pnpm --filter @jail-atlas/ingest-worker dev -- run --state=OK --dry-run
   ```

4. Review the dry-run output and the source evidence. Only then run the `Approve live source`
   workflow for that specific adapter. The workflow performs the approval transaction with the
   customer-owned `DATABASE_URL`; no one needs to open Neon or paste SQL:

   ```text
   GitHub → Actions → Approve live source → Run workflow
   adapter_key=<approved adapter key>
   state=<IA, MN, TX, AR, or OK>
   county_slug=<county slug>
   confirm=APPROVE
   ```

   The workflow marks the source healthy, enables its adapter, and publishes the county in one
   transaction. It refuses to run unless the explicit `APPROVE` confirmation is supplied.

5. Run the write-enabled job for that one adapter:

   ```text
   INGEST_MODE=live
   INGEST_NETWORK_ACCESS=enabled
   INGEST_DATABASE_WRITES=enabled
   ALLOW_LIVE_SOURCE_FETCHES=true
   SOURCE_HOST_ALLOWLIST=inmates.dallascountyiowa.gov
   DATABASE_URL=<customer Neon URL>
   LIVE_SOURCE_ADAPTER_KEY=dallas-newworld-inmate-inquiry
   pnpm --filter @jail-atlas/ingest-worker dev -- run
   ```

The worker records a failed run without replacing the last successful snapshot. It runs only the
adapter named by `LIVE_SOURCE_ADAPTER_KEY`; scheduling Iowa counties one by one is therefore a
workflow concern. Each state runs twice a day, 12 hours apart: Iowa at 00:00 and 12:00 UTC,
Minnesota at 06:00 and 18:00, Texas at 03:00 and 15:00, Arkansas at 09:00 and 21:00, and Oklahoma at
01:00 and 13:00. The approved county adapters run sequentially inside each slot, and a county that
fails is tried once more, three minutes after the first pass, before the run is reported.

## Failure log

Every live-ingest run writes a per-county result table to its job summary. Scheduled and `write`
runs also add a comment to the open GitHub issue labelled `ingest-log` ("Ingest health log") when
any county fails or the run stops before a county completes. The comment names the state, each
failed adapter, its failure stage and code, and links the run. Successful runs are not logged, so an
issue with no new comments means every county refreshed. The workflow creates the issue on the first
failure.
