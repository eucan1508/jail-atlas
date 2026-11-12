import { describe, expect, it } from "vitest";
import { chargeTermsForState, explainCharge, offenseLevels } from "@/lib/charge-decoder";

const terms = (notes: readonly { term: string }[]) => notes.map((note) => note.term);

describe("charge decoder", () => {
  it("names the Minnesota statute section from the roster citation", () => {
    const notes = explainCharge(
      "minnesota",
      "Theft-Take/Use/Transfer Movable Prop-No Consent",
      "609.52.2(a)(1)"
    );
    expect(notes[0]).toEqual({ term: "Minnesota Statutes 609.52", meaning: "Theft" });
    expect(terms(notes)).toContain("PROP");
  });

  it("reads citations printed at the start of the charge text", () => {
    expect(
      explainCharge("missouri", "565.225-006Y202053 - STALKING - 1ST DEGREE - 1ST OFFENSE", null)[0]
    ).toEqual({ term: "Missouri Revised Statutes 565.225", meaning: "Stalking, first degree" });
    expect(
      explainCharge("kansas", "Criminal threat. Unknown circumstance", "21-5415(a)")[0]
    ).toEqual({
      term: "Kansas Statutes 21-5415",
      meaning: "Criminal threat; aggravated criminal threat"
    });
    expect(
      explainCharge("minnesota", "169A-25 - DWI - Second-Degree Described", "169A-25")[0]?.term
    ).toBe("Minnesota Statutes 169A.25");
  });

  it("explains Texas penalty groups, weights, and code citations", () => {
    const notes = explainCharge("texas", "POSS CS PG 1/1-B >=1G<4G", "HSC 481.115(c)");
    expect(notes[0]).toEqual({
      term: "HSC 481.115",
      meaning:
        "Texas Health and Safety Code section 481.115: Possession of substance in penalty group 1 or 1-B."
    });
    expect(terms(notes)).toEqual(
      expect.arrayContaining(["POSS", "CS", "PG 1", "PG 1-B", "G / GM", "< > >="])
    );
  });

  it("keeps state-only terms out of other states", () => {
    expect(
      terms(explainCharge("minnesota", "Domestic Assault-GM-Subsequent Violation", null))
    ).toContain("GM");
    expect(terms(explainCharge("arkansas", "POSSESSION OF METH GT 2GM", null))).not.toContain("GM");
    expect(explainCharge("minnesota", "DWI", null)[0]?.meaning).toMatch(/impaired/);
    expect(explainCharge("texas", "DWI", null)[0]?.meaning).toMatch(/intoxicated/);
  });

  it("reads Oklahoma title and section citations", () => {
    expect(
      explainCharge("oklahoma", "POSSESSION SCHEDULE I OR II (63 O. S. 2-206)", null)[0]
    ).toEqual({ term: "63 O.S. 2-206", meaning: "Oklahoma Statutes, Title 63, section 2-206." });
  });

  it("returns no notes for plain charge text", () => {
    expect(explainCharge("iowa", "Burglary 3rd Degree", null)).toEqual([]);
  });

  it("lists each state's terms once and offense levels only where checked", () => {
    const texas = terms(chargeTermsForState("texas"));
    expect(new Set(texas).size).toBe(texas.length);
    expect(texas).toContain("PG 1-B");
    expect(terms(chargeTermsForState("iowa"))).not.toContain("PG 1");
    expect(offenseLevels.alabama).toBeUndefined();
    expect(offenseLevels.texas?.levels).toHaveLength(8);
  });
});
