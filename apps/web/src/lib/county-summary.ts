import type { CountyCoverageBrief } from "./coverage-catalog";
import type { CountyGuideProfile } from "./county-guides";

const displayDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "America/Chicago"
});

/** Calendar date (YYYY-MM-DD) for a guide's "reviewedAt" text such as "October 3, 2026". */
export function reviewedDateIso(reviewedAt: string): string | null {
  const parsed = new Date(`${reviewedAt} 12:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/**
 * The answer-first paragraph shown under a county page heading. It stands on its own so search
 * and answer engines can quote it without the rest of the page.
 */
export function countyAnswerSummary({
  entry,
  profile,
  recordCount,
  capturedAt
}: {
  entry: CountyCoverageBrief;
  profile: CountyGuideProfile;
  recordCount: number | null;
  capturedAt: Date | null;
}): string {
  const where = `${profile.facilityName} is the county jail for ${entry.county}, ${entry.stateName}, run by the ${profile.operatedBy} in ${entry.seatCity}.`;
  const custody =
    recordCount !== null && capturedAt !== null
      ? ` As of ${displayDate.format(capturedAt)}, the official roster lists ${recordCount} ${
          recordCount === 1 ? "person" : "people"
        } in custody.`
      : "";
  return `${where}${custody} The jail is at ${profile.address}; call ${profile.phone} to confirm visits, deposits, mail, and bail before you go.`;
}

/** Question-style heading for a guidance card, matched on the card's topic. */
export function guidanceQuestion(title: string, facility: string): string {
  const topic = title.toLocaleLowerCase("en-US");
  if (topic.includes("visit")) return `When can you visit someone at ${facility}?`;
  if (topic.includes("money") || topic.includes("commissary") || topic.includes("canteen")) {
    return `How do you put money on an inmate's account at ${facility}?`;
  }
  if (topic.includes("mail") || topic.includes("phone") || topic.includes("message")) {
    return `How do you call or send mail to someone at ${facility}?`;
  }
  if (topic.includes("communication")) return `How do you contact someone at ${facility}?`;
  if (topic.includes("bail") || topic.includes("bond") || topic.includes("court")) {
    return `How do bail and court records work for ${facility}?`;
  }
  return title;
}
