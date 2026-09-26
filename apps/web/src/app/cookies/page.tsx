import { TrustPage } from "@/components/trust-page";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/cookies/",
  title: "Cookie Policy",
  description:
    "Learn how Jail Atlas uses browser storage for essential functions, its approach to optional analytics, and how to manage cookies in your browser."
});

export default function CookiesPage() {
  return (
    <TrustPage
      eyebrow="Storage and consent"
      path="/cookies/"
      title="Cookie policy"
      summary="The MVP is designed to work without advertising cookies or cross-site tracking. This policy explains the small amount of browser storage the service may use and what changes if optional analytics are approved later."
      sections={[
        {
          heading: "Essential operation",
          paragraphs: [
            "The service may use short-lived, essential browser storage for security, rate limiting, form protection, or accessibility preferences. These values are not used to build a person profile or follow you across unrelated sites.",
            "If a browser blocks non-essential storage, the public pages and source attribution should remain usable. A correction form may require a short-lived security value to prevent automated abuse."
          ]
        },
        {
          heading: "Optional measurement",
          paragraphs: [
            "No advertising or third-party analytics cookies are part of the current MVP. If optional measurement is added, it must be documented here, remain disabled until consent where required, and collect aggregated product-use signals rather than custody-record content."
          ]
        },
        {
          heading: "Managing storage",
          paragraphs: [
            "You can clear or block cookies in your browser settings. Clearing essential values can reset a security check or preference; it does not delete an official county record. For privacy questions, use the operator contact published on the production site."
          ]
        }
      ]}
    />
  );
}
