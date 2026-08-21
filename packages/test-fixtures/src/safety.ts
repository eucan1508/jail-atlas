import { SYNTHETIC_FIXTURE_MARKER, type SyntheticScottCountyFixture } from "./scott-county.js";

function isExampleTestUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "example.test" || hostname.endsWith(".example.test");
  } catch {
    return false;
  }
}

export function assertSyntheticFixtureSafety(fixture: SyntheticScottCountyFixture): true {
  if (
    fixture.fixtureKind !== "synthetic" ||
    fixture.fixtureMarker !== SYNTHETIC_FIXTURE_MARKER ||
    fixture.publicationAllowed !== false
  ) {
    throw new Error("Synthetic fixtures require a non-public fixture sentinel");
  }
  if (fixture.source.publicationApproved) {
    throw new Error("A synthetic source can never be publication-approved");
  }
  const URLs = [
    fixture.institution.officialUrl,
    fixture.source.sourceUrl,
    fixture.source.officialInstitutionUrl,
    fixture.source.relationshipEvidenceUrl,
    fixture.sourceEvidence.url,
    ...fixture.editorial.evidence.flatMap((evidence) => [
      evidence.url,
      ...(evidence.relationshipEvidenceUrl ? [evidence.relationshipEvidenceUrl] : [])
    ])
  ];
  if (!URLs.every(isExampleTestUrl)) {
    throw new Error("Synthetic fixture URLs must use example.test");
  }
  const allBookings = [...fixture.currentCustody.bookings, ...fixture.recentRelease.bookings];
  if (
    !allBookings.every(
      (booking) =>
        booking.person.displayName.startsWith("SYNTHETIC ") &&
        booking.person.displayName.endsWith(" — TEST ONLY") &&
        (booking.bookingIdentifier === null ||
          booking.bookingIdentifier.value.startsWith("SYNTHETIC-BOOKING-"))
    )
  ) {
    throw new Error("Synthetic person and booking sentinels are required");
  }
  const serialized = JSON.stringify(fixture);
  const disallowedPersonalFields = [
    '"dateOfBirth"',
    '"birthDate"',
    '"homeAddress"',
    '"phoneNumber"',
    '"personalEmail"',
    '"mugshot"'
  ];
  if (disallowedPersonalFields.some((field) => serialized.includes(field))) {
    throw new Error("Synthetic fixtures cannot contain personal-data fields");
  }
  return true;
}
