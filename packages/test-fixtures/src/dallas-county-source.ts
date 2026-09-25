export const SYNTHETIC_DALLAS_SOURCE_FIXTURE_MARKER =
  "SYNTHETIC_DALLAS_SOURCE_HTML_TEST_ONLY" as const;

const listHeaders = `
  <thead>
    <tr>
      <th>Photo</th>
      <th>Name</th>
      <th>In Custody</th>
      <th>Race</th>
      <th>Gender</th>
      <th>Height</th>
      <th>Weight</th>
      <th>Multiple Bookings</th>
    </tr>
  </thead>`;

function inquiryPage(body: string): string {
  return `<!doctype html>
<html lang="en">
  <head><title>Dallas County Inmate Inquiry</title></head>
  <body>
    <header><h1>Dallas County Inmate Inquiry</h1></header>
    <p class="disclaimer">Synthetic structural fixture. Not a real custody record.</p>
    <form method="get" action="/NewWorld.InmateInquiry/dallas">
      <label><input type="checkbox" name="InCustody" value="True" checked> In Custody</label>
    </form>
    ${body}
  </body>
</html>`;
}

export const syntheticDallasListPageOne = inquiryPage(`
  <table>
    ${listHeaders}
    <tbody>
      <tr>
        <td></td>
        <td><a href="/NewWorld.InmateInquiry/dallas/Inmate/Detail/synthetic-alpha-test-only">SYNTHETIC ALPHA — TEST ONLY</a></td>
        <td>Yes</td>
        <td></td><td></td><td></td><td></td><td>Yes</td>
      </tr>
    </tbody>
  </table>
  <nav aria-label="Synthetic pagination">
    <a href="/NewWorld.InmateInquiry/dallas?InCustody=True&amp;Page=2">Next</a>
  </nav>`);

export const syntheticDallasListPageTwo = inquiryPage(`
  <table>
    ${listHeaders}
    <tbody>
      <tr>
        <td></td>
        <td><a href="/NewWorld.InmateInquiry/dallas/Inmate/Detail/synthetic-beta-test-only">SYNTHETIC BETA — TEST ONLY</a></td>
        <td>Yes</td>
        <td></td><td></td><td></td><td></td><td>No</td>
      </tr>
    </tbody>
  </table>
  <nav aria-label="Synthetic pagination">
    <a href="/NewWorld.InmateInquiry/dallas?InCustody=True&amp;Page=1">Previous</a>
  </nav>`);

export const syntheticDallasValidEmptyPage = inquiryPage(`
  <table>
    ${listHeaders}
    <tbody><tr><td colspan="8">No data</td></tr></tbody>
  </table>`);

function bookingPanel(options: {
  readonly identifier: string;
  readonly bookingDate: string;
  readonly releaseDate: string;
  readonly housingFacility: string;
  readonly bonds: string;
  readonly charges: string;
}): string {
  return `<section class="panel booking-panel">
    <h3>Booking ${options.identifier}</h3>
    <dl>
      <dt>Booking Date</dt><dd>${options.bookingDate}</dd>
      <dt>Release Date</dt><dd>${options.releaseDate}</dd>
      <dt>Housing Facility</dt><dd>${options.housingFacility}</dd>
    </dl>
    <table class="bonds">
      <thead><tr><th>Bond Number</th><th>Bond Type</th><th>Bond Amount</th></tr></thead>
      <tbody>${options.bonds}</tbody>
    </table>
    <table class="charges">
      <thead>
        <tr>
          <th>Number</th><th>Charge Description</th><th>Offense Date</th>
          <th>Docket Number</th><th>Sentence Date</th><th>Disposition</th>
          <th>Sentence Length</th><th>Crime Class</th><th>Arresting Agency</th>
        </tr>
      </thead>
      <tbody>${options.charges}</tbody>
    </table>
  </section>`;
}

function detailPage(name: string, bookings: string): string {
  return `<!doctype html>
<html lang="en">
  <head><title>Dallas County Inmate Inquiry</title></head>
  <body>
    <header><h1>Dallas County Inmate Inquiry</h1></header>
    <p class="disclaimer">Synthetic structural fixture. Not a real custody record.</p>
    <section>
      <h2>Demographic Information</h2>
      <dl><dt>Name</dt><dd>${name}</dd></dl>
    </section>
    <section>
      <h2>Booking History</h2>
      ${bookings}
    </section>
  </body>
</html>`;
}

export const syntheticDallasAlphaDetail = detailPage(
  "SYNTHETIC ALPHA — TEST ONLY",
  `${bookingPanel({
    identifier: "SYNTHETIC-BOOKING-ACTIVE-A",
    bookingDate: "01/02/2000 03:04 PM",
    releaseDate: "",
    housingFacility: "SYNTHETIC FACILITY — TEST ONLY",
    bonds: `
      <tr><td>SYNTHETIC-BOND-A</td><td>CASH ONLY</td><td>$125.00</td></tr>
      <tr><td>SYNTHETIC-BOND-B</td><td>NO BOND</td><td>$0.00</td></tr>`,
    charges: `
      <tr><td>1</td><td>SYNTHETIC CHARGE ALPHA — TEST ONLY</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td>2</td><td>SYNTHETIC CHARGE BETA — TEST ONLY</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
  })}
  ${bookingPanel({
    identifier: "SYNTHETIC-BOOKING-HISTORICAL-A",
    bookingDate: "01/01/2000 01:00 PM",
    releaseDate: "01/01/2000 02:00 PM",
    housingFacility: "",
    bonds: `<tr><td>SYNTHETIC-BOND-HISTORY</td><td>CASH/SURETY</td><td>$50.00</td></tr>`,
    charges: `<tr><td>1</td><td>SYNTHETIC HISTORICAL CHARGE — TEST ONLY</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
  })}`
);

export const syntheticDallasBetaDetail = detailPage(
  "SYNTHETIC BETA — TEST ONLY",
  bookingPanel({
    identifier: "SYNTHETIC-BOOKING-ACTIVE-B",
    bookingDate: "01/03/2000 04:05 PM",
    releaseDate: "",
    housingFacility: "SYNTHETIC FACILITY — TEST ONLY",
    bonds: "",
    charges: `<tr><td>1</td><td>SYNTHETIC CHARGE GAMMA — TEST ONLY</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
  })
);

export const syntheticDallasSourceHtmlFixture = Object.freeze({
  fixtureKind: "synthetic" as const,
  fixtureMarker: SYNTHETIC_DALLAS_SOURCE_FIXTURE_MARKER,
  publicationAllowed: false as const,
  listPages: Object.freeze([syntheticDallasListPageOne, syntheticDallasListPageTwo]),
  details: Object.freeze([syntheticDallasAlphaDetail, syntheticDallasBetaDetail]),
  validEmpty: syntheticDallasValidEmptyPage
});

export type SyntheticDallasSourceHtmlFixture = typeof syntheticDallasSourceHtmlFixture;

export function assertSyntheticDallasSourceFixtureSafety(
  fixture: SyntheticDallasSourceHtmlFixture
): true {
  if (
    fixture.fixtureKind !== "synthetic" ||
    fixture.fixtureMarker !== SYNTHETIC_DALLAS_SOURCE_FIXTURE_MARKER ||
    fixture.publicationAllowed !== false
  ) {
    throw new Error("Dallas source fixtures require a non-public synthetic sentinel");
  }

  const serialized = JSON.stringify(fixture);
  const requiredMarkers = [
    "SYNTHETIC ALPHA — TEST ONLY",
    "SYNTHETIC BETA — TEST ONLY",
    "synthetic-alpha-test-only",
    "synthetic-beta-test-only"
  ];
  if (!requiredMarkers.every((marker) => serialized.includes(marker))) {
    throw new Error("Dallas source fixtures require explicit synthetic record markers");
  }

  const forbiddenPersonalPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/,
    /\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /\/Inmate\/Detail\/(?!synthetic-(?:alpha|beta)-test-only)[^"<]+/
  ];
  if (forbiddenPersonalPatterns.some((pattern) => pattern.test(serialized))) {
    throw new Error("Dallas source fixtures contain a personal-data-shaped value");
  }

  return true;
}
