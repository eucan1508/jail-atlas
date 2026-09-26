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
   state=<IA or MN>
   county_slug=<county slug>
   confirm=APPROVE
   ```

   This transaction marks the source healthy, enables its adapter, and publishes the county. Only
   run it after the source-specific dry-run and human review have passed.

   For the three audited Iowa sources, the worker can also run the checks sequentially in county
   order:

   ```text
   INGEST_MODE=live
   INGEST_NETWORK_ACCESS=enabled
   INGEST_DATABASE_WRITES=disabled
   ALLOW_LIVE_SOURCE_FETCHES=true
   SOURCE_HOST_ALLOWLIST=inmates.dallascountyiowa.gov,cedarcounty.iowa.gov,www.bhcso.org
   DATABASE_URL=<customer Neon URL>
   pnpm --filter @jail-atlas/ingest-worker dev -- run --state=IA --dry-run
   ```

   The state command is intentionally limited to Dallas, Cedar, Black Hawk, and the Ramsey, Stearns,
   and Anoka Minnesota adapters until the remaining Iowa and Minnesota source contracts have
   approved adapters. A dry-run is allowed while the source rows are `verification_pending`; it
   never writes a snapshot or changes publication status.

   Ramsey can be checked with the public county open-data host:

   ```text
   INGEST_MODE=live
   INGEST_NETWORK_ACCESS=enabled
   INGEST_DATABASE_WRITES=disabled
   ALLOW_LIVE_SOURCE_FETCHES=true
   SOURCE_HOST_ALLOWLIST=opendata.ramseycountymn.gov,jailroster.stearnscountymn.gov,incustodysearch.co.anoka.mn.us
   DATABASE_URL=<customer Neon URL>
   pnpm --filter @jail-atlas/ingest-worker dev -- run --state=MN --dry-run
   ```

4. Review the dry-run output and the source evidence. Only then enable the specific adapter and
   source in Neon. The activation is deliberately a customer-owned decision because it changes what
   is publishable:

   ```sql
   UPDATE official_sources
   SET source_status = 'healthy', publication_approved = true,
       verified_at = now(), last_checked_at = now()
   WHERE adapter_key = 'dallas-newworld-inmate-inquiry';

   UPDATE source_adapters
   SET enabled = true
   WHERE adapter_key = 'dallas-newworld-inmate-inquiry';
   ```

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
workflow concern. The existing state slots remain 00:00 UTC for Iowa and 06:00 UTC for Minnesota,
with the approved county adapters invoked sequentially inside each slot.
