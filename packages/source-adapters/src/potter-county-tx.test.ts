import { describe, expect, it } from "vitest";

import {
  POTTER_COUNTY_TX_ADAPTER_KEY,
  formatPotterCharge,
  parsePotterRosterPages,
  type PotterPdfPage,
  type PotterPdfTextItem
} from "./potter-county-tx.js";
import { sourceAdapterRegistry } from "./registry.js";

type Person = Readonly<{
  name: readonly string[];
  booking: string;
  charges: readonly (readonly string[])[];
}>;

// Lays people out the way the Spillman report does: a header row, then one row per charge whose
// description wraps 10.7 points down; a person may continue on the next page.
function report(pages: readonly (readonly Person[])[], printDate = "01/02/00"): PotterPdfPage[] {
  return pages.map((people, index) => {
    const items: PotterPdfTextItem[] = [
      { text: "11:00", x: 700, y: 2.8 },
      { text: printDate, x: 742.9, y: 2.8 },
      index === 0
        ? { text: "Spillman Technologies", x: 90, y: 584.1 }
        : { text: `Page ${index + 1} of ${pages.length}`, x: 712.1, y: 592.6 },
      { text: "REPORT OF PRISONERS WITH THEIR OFFENSES", x: index === 0 ? 90 : 18, y: 575 }
    ];
    let y = 540;
    for (const person of people) {
      if (person.name.length > 0) {
        person.name.forEach((line, lineIndex) =>
          items.push({ text: line, x: 18, y: y - lineIndex * 14.4 })
        );
        items.push({ text: "W", x: 275, y: y + 2.8 });
        items.push({ text: "Age: 99", x: 305.3, y: y + 2.8 });
        items.push({ text: "Booking:", x: 459, y: y + 0.7 });
        items.push({ text: person.booking, x: 509.4, y: y + 0.7 });
        items.push({ text: "SO#:", x: 590.2, y: y + 0.7 });
        y -= 18 + (person.name.length - 1) * 14.4;
      }
      for (const lines of person.charges) {
        items.push({ text: "01/01/00(1000", x: 374.9, y });
        items.push({ text: "0.00", x: 452.5, y });
        lines.forEach((line, lineIndex) =>
          items.push({ text: line, x: 48.2, y: y - lineIndex * 10.7 })
        );
        y -= 27;
      }
    }
    return items;
  });
}

// Splits people into pages of at most 10, the most one synthetic page holds.
function paged(people: readonly Person[]): Person[][] {
  const pages: Person[][] = [];
  for (let index = 0; index < people.length; index += 10)
    pages.push(people.slice(index, index + 10));
  return pages;
}

describe("Potter County roster report", () => {
  it("is not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(POTTER_COUNTY_TX_ADAPTER_KEY)).toBe(false);
  });

  it("spells out the offense level and keeps unleveled charges as printed", () => {
    expect(formatPotterCharge("UNL CARRY WEAPON(MA)")).toBe(
      "UNL CARRY WEAPON (Class A Misdemeanor)"
    );
    expect(formatPotterCharge("RECKLESS DRIVING(M*)")).toBe("RECKLESS DRIVING (Misdemeanor)");
    expect(formatPotterCharge("CITY CHARGE-CHARGE BELOW(XX)")).toBe("CITY CHARGE-CHARGE BELOW");
    expect(() => formatPotterCharge("EVADING ARREST DET W/PREV")).toThrow("CHARGE_TEXT_CUT");
  });

  it("joins wrapped names and descriptions, including charges continued on the next page", () => {
    const filler = Array.from({ length: 150 }, (_, index) => ({
      name: [`TESTER, FILLER ${index}`],
      booking: String(1_000 + index),
      charges: [["SYNTHETIC OFFENSE(F3)"]]
    }));
    const roster = parsePotterRosterPages(
      report([
        [
          {
            name: ["TESTER, ALPHA LONG MIDDLE NAMES", "JR"],
            booking: "88464",
            charges: [["SYNTHETIC EVADING ARREST DET W/PREV", "CONVICTION(FS)"]]
          }
        ],
        [
          { name: [], booking: "", charges: [["SYNTHETIC OFFENSE TWO(F2)"]] },
          ...filler.slice(0, 5)
        ],
        ...paged(filler.slice(5))
      ])
    );
    expect(roster.records).toHaveLength(151);
    expect(roster.records[0]).toEqual({
      displayName: "TESTER, ALPHA LONG MIDDLE NAMES JR",
      bookingNumber: "88464",
      charges: [
        "SYNTHETIC EVADING ARREST DET W/PREV CONVICTION (State Jail Felony)",
        "SYNTHETIC OFFENSE TWO (Second Degree Felony)"
      ]
    });
  });

  it("fails closed on a reordered, short, or reshaped report", () => {
    const people = Array.from({ length: 150 }, (_, index) => ({
      name: [`TESTER, FILLER ${index}`],
      booking: String(1_000 + index),
      charges: [["SYNTHETIC OFFENSE(F3)"]]
    }));
    const pages = report(paged(people));
    expect(parsePotterRosterPages(pages).records).toHaveLength(150);
    expect(() =>
      parsePotterRosterPages([pages[1] ?? [], pages[0] ?? [], ...pages.slice(2)])
    ).toThrow();
    expect(() => parsePotterRosterPages(report(paged(people.slice(0, 20))))).toThrow();
    const cut = report(
      paged([{ ...people[0]!, charges: [["SYNTHETIC CUT OFF"]] }, ...people.slice(1)])
    );
    expect(() => parsePotterRosterPages(cut)).toThrow("CHARGE_TEXT_CUT");
  });
});
