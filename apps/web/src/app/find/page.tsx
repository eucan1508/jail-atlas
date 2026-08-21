import Link from "next/link";
import type { Metadata } from "next";
import { z } from "zod";
import { CountyFinder } from "@/components/county-finder";
import { PageIntro } from "@/components/page-intro";
import { canRenderSyntheticScottCounty } from "@/lib/publication";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Find a county custody page",
  description: "Find an available county custody information page.",
  alternates: { canonical: absoluteUrl("/find/") },
  robots: { index: false, follow: false }
};

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
  const isScott = query.state === "iowa" && query.county === "scott-county";
  const showPrototype = isScott && canRenderSyntheticScottCounty();

  return (
    <main id="main-content" className="page-main site-shell narrow-shell">
      <PageIntro
        eyebrow="County finder"
        title="Find a county custody page"
        summary={<p>Only counties that pass the publication gates can appear in public results.</p>}
      />
      <CountyFinder />
      {showPrototype ? (
        <section className="content-section" aria-live="polite">
          <h2>One development result</h2>
          <p>
            <Link href="/iowa/scott-county/custody/">Scott County synthetic prototype</Link> —
            fictional data, not published custody information.
          </p>
        </section>
      ) : query.county ? (
        <p className="surface-card" role="status">
          No published county page matches this selection.
        </p>
      ) : null}
    </main>
  );
}
