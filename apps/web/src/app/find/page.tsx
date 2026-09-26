import Link from "next/link";
import type { Metadata } from "next";
import { z } from "zod";
import { CountyFinder } from "@/components/county-finder";
import { PageIntro } from "@/components/page-intro";
import { canRenderSyntheticScottCounty } from "@/lib/publication";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  path: "/find/",
  title: "Find a County Jail Roster",
  description:
    "Search Jail Atlas by state, county, or city to find an available jail roster. Open a county page to review custody records and the latest capture time.",
  index: false
});

const searchSchema = z.object({
  state: z.string().optional(),
  county: z.string().optional()
});

export default async function FindPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = searchSchema.parse(await searchParams);
  const published = await getPublishedCountyCoverage();
  const isScott = query.state === "iowa" && query.county === "scott-county";
  const showPrototype = isScott && canRenderSyntheticScottCounty();
  const selectedPublished = published.find(
    ({ entry }) => entry.state === query.state && entry.slug === query.county
  );

  return (
    <main id="main-content" className="page-main site-shell narrow-shell finder-page">
      <PageIntro
        eyebrow="County finder"
        title="Find a county jail roster"
        summary={<p>Search published county pages by state, county, or city.</p>}
      />
      <CountyFinder counties={published.map(({ entry }) => entry)} />
      {selectedPublished ? (
        <section className="content-section" aria-live="polite">
          <h2>Published county result</h2>
          <p>
            <Link href={selectedPublished.path}>{selectedPublished.entry.county} custody page</Link>
          </p>
        </section>
      ) : null}
      {showPrototype ? (
        <section className="content-section" aria-live="polite">
          <h2>One development result</h2>
          <p>
            <Link href="/iowa/scott-county/custody/">Scott County synthetic prototype</Link> —
            fictional data, not published custody information.
          </p>
        </section>
      ) : query.county && !selectedPublished ? (
        <p className="surface-card" role="status">
          No published county page matches this selection.
        </p>
      ) : null}
    </main>
  );
}
