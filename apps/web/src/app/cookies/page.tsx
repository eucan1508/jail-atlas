import { TrustPage } from "@/components/trust-page";
import { CONTACT_EMAIL } from "@/lib/contact";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/cookies/",
  title: "Cookie Policy",
  description:
    "Learn how Jail Atlas uses browser storage for essential functions, how Google AdSense uses advertising cookies, and how to manage cookies in your browser."
});

export default function CookiesPage() {
  return (
    <TrustPage
      eyebrow="Storage and consent"
      path="/cookies/"
      title="Cookie policy"
      summary="This policy explains the small amount of browser storage the service itself uses and the advertising cookies Google AdSense sets when it shows ads on the site."
      sections={[
        {
          heading: "Essential operation",
          paragraphs: [
            "The service may use short-lived, essential browser storage for security, rate limiting, form protection, or accessibility preferences. These values are not used to build a person profile or follow you across unrelated sites.",
            "If a browser blocks non-essential storage, the public pages and source attribution should remain usable. A correction form may require a short-lived security value to prevent automated abuse."
          ]
        },
        {
          heading: "Advertising cookies",
          paragraphs: [
            "The site shows ads through Google AdSense. Google and other third-party vendors set cookies to serve ads based on a visitor's prior visits to this site and other sites, and to measure how ads perform.",
            "You can opt out of personalized advertising in Google's Ads Settings (adssettings.google.com), or opt out of some third-party vendors' cookies at aboutads.info. The site does not set third-party analytics cookies."
          ]
        },
        {
          heading: "Managing storage",
          paragraphs: [
            "You can clear or block cookies in your browser settings. Clearing essential values can reset a security check or preference; it does not delete an official county record.",
            `For privacy questions, email ${CONTACT_EMAIL}.`
          ]
        }
      ]}
    />
  );
}
