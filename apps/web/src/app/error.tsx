"use client";

import { useEffect } from "react";
import { Button } from "@jail-atlas/ui";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only the framework-generated digest is exposed; error messages can contain source content.
    console.error("page_render_failed", { digest: error.digest ?? "unavailable" });
  }, [error.digest]);

  return (
    <main id="main-content" className="page-main site-shell narrow-shell">
      <p className="eyebrow">Page error</p>
      <h1>This page could not be displayed.</h1>
      <p>The failure does not mean that an official roster is empty. Try the page again.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
