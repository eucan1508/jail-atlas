import statuteSections from "./statute-sections.json";
import type { CoverageState } from "./coverage-catalog";

/**
 * Plain-English notes for the abbreviations, statute citations, and offense levels that appear in
 * official jail roster charge text. Every explanation is either a common law-enforcement term or
 * comes from the state's own statutes:
 *  - Section titles in statute-sections.json are the official headnotes published by the
 *    Minnesota Office of the Revisor of Statutes, the Iowa Legislature (Iowa Code 2026), the Kansas
 *    Office of Revisor of Statutes (chapters 8, 21 and 22), the Missouri Revisor of Statutes, and
 *    the Texas Legislature (Penal Code, Health and Safety Code chapters 481 and 483, and
 *    Transportation Code chapters 502, 521, 545, 547, 548, 550, and 601).
 *  - Texas penalty groups follow Texas Health and Safety Code 481.102 to 481.105.
 *  - Offense-level penalties follow the statutes named in each level's source.
 * A note is only shown when the term matches; unknown abbreviations are left alone rather than
 * guessed.
 */

export type ChargeNote = Readonly<{ term: string; meaning: string }>;

type Term = Readonly<{
  term: string;
  pattern: RegExp;
  meaning: string;
  states?: readonly CoverageState[];
}>;

const terms: readonly Term[] = [
  {
    term: "FTA",
    pattern: /\bFTA\b/,
    meaning: "Failure to appear: the person missed a required court date."
  },
  {
    term: "FTP",
    pattern: /\bFTP\b/,
    meaning: "Failure to pay: a fine, fee, or court cost was not paid as ordered."
  },
  {
    term: "DWI",
    pattern: /\bDWI\b/i,
    meaning: "Driving while impaired by alcohol or drugs.",
    states: ["minnesota"]
  },
  {
    term: "DWI",
    pattern: /\bDWI\b/i,
    meaning: "Driving while intoxicated by alcohol or drugs.",
    states: ["texas", "arkansas", "missouri", "iowa", "kansas", "oklahoma", "alabama"]
  },
  {
    term: "DUI",
    pattern: /\bDUI\b/i,
    meaning: "Driving under the influence of alcohol or drugs."
  },
  {
    term: "OWI",
    pattern: /\bOWI\b/i,
    meaning: "Operating while intoxicated, Iowa's charge for driving under the influence."
  },
  { term: "BAC", pattern: /\bBAC\b/, meaning: "Blood alcohol concentration." },
  {
    term: "DUS",
    pattern: /\bDUS\b/,
    meaning: "Driving under suspension: driving while the license is suspended."
  },
  {
    term: "DUR",
    pattern: /\bDUR\b/,
    meaning: "Driving under revocation: driving while the license is revoked."
  },
  { term: "DWLS", pattern: /\bDWLS\b/, meaning: "Driving while license suspended." },
  { term: "DL", pattern: /\bDL\b/, meaning: "Driver's license." },
  { term: "MV", pattern: /\bMV\b/, meaning: "Motor vehicle." },
  {
    term: "CS",
    pattern: /\bCS\b/,
    meaning: "Controlled substance: a drug that is illegal or regulated by law."
  },
  {
    term: "CDS",
    pattern: /\bCDS\b/,
    meaning: "Controlled dangerous substance: a drug that is illegal or regulated by law."
  },
  { term: "PCS", pattern: /\bPCS\b/, meaning: "Possession of a controlled substance." },
  {
    term: "UPCS",
    pattern: /\bUPCS\b/,
    meaning: "Unlawful possession of a controlled substance."
  },
  { term: "POSS", pattern: /\bPOSS\b/i, meaning: "Possession." },
  {
    term: "AGG",
    pattern: /\bAGG\b/i,
    meaning: "Aggravated: a more serious form of the offense, such as one involving a weapon."
  },
  { term: "ASSLT", pattern: /\bASSLT\b/i, meaning: "Assault." },
  { term: "ASLT", pattern: /\bASLT\b/i, meaning: "Assault." },
  { term: "MARIJ", pattern: /\bMARIJ\b/i, meaning: "Marijuana." },
  { term: "METH", pattern: /\bMETH\b/i, meaning: "Methamphetamine." },
  {
    term: "PARA",
    pattern: /\bPARA(?:PH)?\b/i,
    meaning: "Paraphernalia: items used to take, make, or store drugs."
  },
  { term: "PROP", pattern: /\bPROP\b/i, meaning: "Property." },
  { term: "INJ", pattern: /\bINJ\b/i, meaning: "Injury." },
  { term: "W/O", pattern: /\bW\/O\b/i, meaning: "Without." },
  { term: "PREV", pattern: /\bPREV\b/i, meaning: "Previous." },
  { term: "CONV", pattern: /\bCONV\b/i, meaning: "Conviction." },
  { term: "MISD", pattern: /\bMISD\b/i, meaning: "Misdemeanor." },
  { term: "FEL", pattern: /\bFEL\b/i, meaning: "Felony." },
  {
    term: "SCH",
    pattern: /\bSCH(?:ED)?\b/i,
    meaning: "Schedule: the category the law places a drug in, based on its risk of abuse."
  },
  {
    term: "G / GM",
    pattern: /\d\s?(?:G|GM|GMS)\b/i,
    meaning: "Grams."
  },
  { term: "OZ", pattern: /\d\s?OZ\b/i, meaning: "Ounces." },
  {
    term: "< > >=",
    pattern: /[<>]/,
    meaning: "< means less than, > means more than, and >= means at least."
  },
  { term: "LEO", pattern: /\bLEO\b/, meaning: "Law enforcement officer." },
  {
    term: "DOC",
    pattern: /\bDOC\b/,
    meaning: "Department of Corrections, the state prison system."
  },
  {
    term: "ICE",
    pattern: /\bICE\b/,
    meaning:
      "U.S. Immigration and Customs Enforcement. An ICE hold asks the jail to keep the person until federal immigration officers take custody."
  },
  {
    term: "287(g)",
    pattern: /\b287\s?\(G\)/i,
    meaning:
      "A detainer under section 287(g) of the federal Immigration and Nationality Act, which lets local officers carry out some immigration duties."
  },
  {
    term: "Mittimus",
    pattern: /\bMITTIMUS\b/i,
    meaning: "A court order sending the person to jail, usually to serve a sentence."
  },
  {
    term: "Capias pro fine",
    pattern: /\bCAPIAS PRO FINE\b/i,
    meaning: "A court order to arrest a person who has not paid a fine."
  },
  {
    term: "Capias",
    pattern: /\bCAPIAS\b(?! PRO FINE)/i,
    meaning: "A court order to arrest the person and bring them before the court."
  },
  {
    term: "Bench warrant",
    pattern: /\bBENCH WARRANT\b/i,
    meaning: "A warrant issued by a judge, often after a missed court date."
  },
  {
    term: "Bond forfeiture",
    pattern: /\bBOND FORFEITURE\b/i,
    meaning:
      "The court declared a bail bond forfeited, usually after a missed court date, and ordered a new arrest."
  },
  {
    term: "Hold for other agency",
    pattern: /\bHOLD(?:ING)? FOR (?:AN)?OTHER AGENCY\b|\bHOLD OF ANOTHER AGENCY\b/i,
    meaning:
      "The jail is holding the person for another police agency, county, state, or federal office."
  },
  {
    term: "Probable cause",
    pattern: /\bPROBABLE CAUSE\b/i,
    meaning:
      "Arrested without a warrant because an officer believed a crime was committed. A judge reviews the arrest soon after."
  },
  {
    term: "Fugitive from justice",
    pattern: /\bFUGITIVE\b/i,
    meaning:
      "Wanted in another state. The person is held while that state arranges to take them back."
  },
  {
    term: "Absconding",
    pattern: /\bABSCOND/i,
    meaning: "Leaving probation or parole supervision without permission."
  },
  {
    term: "Revocation of stay",
    pattern: /\bREVOCATION OF STAY\b/i,
    meaning:
      "A request to end a stayed sentence because conditions, such as probation terms, were not followed.",
    states: ["minnesota"]
  },
  // Minnesota offense levels and terms.
  {
    term: "GM",
    pattern: /(?:^|[\s(-])GM(?:$|[\s)-])/,
    meaning: "Gross misdemeanor: punishable by up to 364 days in jail and a $3,000 fine.",
    states: ["minnesota"]
  },
  {
    term: "F / FE",
    pattern: /\((?:F|FE)\)|\s-\sFE$/,
    meaning: "Felony: a crime punishable by a year or more in prison.",
    states: ["minnesota"]
  },
  {
    term: "M / MS",
    pattern: /\((?:M|MS)\)|\s-\sMS$/,
    meaning: "Misdemeanor: punishable by up to 90 days in jail and a $1,000 fine.",
    states: ["minnesota"]
  },
  {
    term: "PM",
    pattern: /\(PM\)/,
    meaning:
      "Petty misdemeanor: not a crime under Minnesota law; the most it can bring is a $300 fine.",
    states: ["minnesota"]
  },
  {
    term: "DAC",
    pattern: /\bDAC\b/,
    meaning: "Driving after cancellation of a driver's license.",
    states: ["minnesota"]
  },
  {
    term: "Inimical to public safety",
    pattern: /\bIPS\b|\bINIMICAL\b/i,
    meaning:
      "The license was canceled because the driver's alcohol or drug record was found to make driving a danger to public safety.",
    states: ["minnesota"]
  },
  { term: "CSC", pattern: /\bCSC\b/, meaning: "Criminal sexual conduct.", states: ["minnesota"] },
  {
    term: "OFP",
    pattern: /\bOFP\b/,
    meaning: "Order for protection: a court order in a domestic abuse case.",
    states: ["minnesota"]
  },
  {
    term: "DANCO",
    pattern: /\bDANCO\b/,
    meaning: "Domestic abuse no contact order, issued by a judge in a criminal case.",
    states: ["minnesota"]
  },
  {
    term: "HRO",
    pattern: /\bHRO\b/,
    meaning: "Harassment restraining order.",
    states: ["minnesota"]
  },
  // Iowa offense levels.
  {
    term: "SMMS",
    pattern: /\bSMMS\b/,
    meaning: "Simple misdemeanor: punishable by up to 30 days in jail.",
    states: ["iowa"]
  },
  {
    term: "SRMS",
    pattern: /\bSRMS\b/,
    meaning: "Serious misdemeanor: punishable by up to one year in jail.",
    states: ["iowa"]
  },
  {
    term: "AGMS",
    pattern: /\bAGMS\b/,
    meaning: "Aggravated misdemeanor: punishable by up to two years in prison.",
    states: ["iowa"]
  },
  // Texas.
  {
    term: "SJF",
    pattern: /\bSJF\b/,
    meaning: "State jail felony: punishable by 180 days to two years in a state jail.",
    states: ["texas"]
  },
  {
    term: "MTR",
    pattern: /\bMTR\b/,
    meaning: "Motion to revoke: prosecutors asked the judge to revoke the person's probation.",
    states: ["texas"]
  },
  {
    term: "MTA",
    pattern: /\bMTA\b/,
    meaning:
      "Motion to adjudicate: prosecutors asked the judge to find the person guilty after deferred adjudication terms were not followed.",
    states: ["texas"]
  },
  {
    term: "MAN DEL",
    pattern: /\bMAN(?:\/| )DEL\b/i,
    meaning: "Manufacture or delivery.",
    states: ["texas"]
  },
  {
    term: "DET",
    pattern: /\bARREST DET\b/i,
    meaning: "Detention, as in evading arrest or detention.",
    states: ["texas"]
  },
  {
    term: "UUMV",
    pattern: /\bUUMV\b/,
    meaning: "Unauthorized use of a motor vehicle.",
    states: ["texas"]
  },
  {
    term: "UCW",
    pattern: /\bUCW\b/,
    meaning: "Unlawful carrying of a weapon.",
    states: ["texas"]
  },
  {
    term: "TDCJ",
    pattern: /\bTDCJ\b/,
    meaning: "Texas Department of Criminal Justice, which runs the state prisons.",
    states: ["texas"]
  },
  // Arkansas.
  { term: "LT", pattern: /\bLT\b/, meaning: "Less than.", states: ["arkansas"] },
  { term: "GT", pattern: /\bGT\b/, meaning: "Greater than.", states: ["arkansas"] },
  {
    term: "GE",
    pattern: /\bGE\b/,
    meaning: "Greater than or equal to.",
    states: ["arkansas"]
  },
  {
    term: "ADC",
    pattern: /\bADC\b/,
    meaning: "Arkansas Division of Correction, the state prison system.",
    states: ["arkansas"]
  },
  {
    term: "Schedule VI",
    pattern: /\bSCH(?:ED)?\.? ?VI\b/i,
    meaning: "In Arkansas, the drug schedule that includes marijuana.",
    states: ["arkansas"]
  },
  {
    term: "Omnibus DWI Act",
    pattern: /\bOMNIBUS\b/i,
    meaning: "The Arkansas law that covers driving while intoxicated.",
    states: ["arkansas"]
  },
  // Kansas.
  {
    term: "KDOC",
    pattern: /\bKDOC\b/,
    meaning: "Kansas Department of Corrections, the state prison system.",
    states: ["kansas"]
  }
];

const texasPenaltyGroups: Readonly<Record<string, string>> = {
  "1": "Penalty Group 1, the Texas drug group that includes cocaine, methamphetamine, heroin, oxycodone, and hydrocodone.",
  "1-A": "Penalty Group 1-A, the Texas drug group for LSD and related drugs.",
  "1-B": "Penalty Group 1-B, the Texas drug group for fentanyl and drugs made from it.",
  "2": "Penalty Group 2, the Texas drug group that includes MDMA (ecstasy) and psilocybin.",
  "2-A": "Penalty Group 2-A, the Texas drug group for synthetic cannabinoids.",
  "3": "Penalty Group 3, the Texas drug group that includes prescription drugs such as alprazolam (Xanax) and diazepam (Valium).",
  "4": "Penalty Group 4, the Texas drug group for medicines with small amounts of a narcotic, such as some codeine cough syrups."
};

function penaltyGroupNotes(text: string): ChargeNote[] {
  const notes: ChargeNote[] = [];
  for (const match of text.matchAll(/\bPG\s?([1-4](?:-[AB])?(?:\s?\/\s?[1-4](?:-[AB])?)*)/gi)) {
    for (const group of (match[1] ?? "").toUpperCase().split("/")) {
      const key = group.trim();
      const meaning = texasPenaltyGroups[key];
      if (meaning) notes.push({ term: `PG ${key}`, meaning });
    }
  }
  return notes;
}

type StatuteSystem = Readonly<{
  name: string;
  pattern: RegExp;
  key: (match: RegExpMatchArray) => string;
}>;

const statuteSystems: Partial<Record<CoverageState, StatuteSystem>> = {
  // 609.52.2(a)(1), 169A.20.1(2), and the Steele County form 609-14.
  minnesota: {
    name: "Minnesota Statutes",
    pattern: /^(\d{1,3}[A-Z]?)[.-](\d{1,4}[A-Z]?)\b/,
    key: (match) => `${match[1]}.${match[2]}`
  },
  // 321J.2(2)(b), 708.2A, 692A.112-B.
  iowa: {
    name: "Iowa Code",
    pattern: /^(\d{1,3}[A-Z]?)\.(\d{1,4}[A-Z]?)/,
    key: (match) => `${match[1]}.${match[2]}`
  },
  // 8-1567, 21-5415(a), 21-5915 a.
  kansas: {
    name: "Kansas Statutes",
    pattern: /^(\d{1,2})-(\d{3,4}[a-z]?)/,
    key: (match) => `${match[1]}-${match[2]}`
  },
  // 565.225-006Y202053, 303.025.
  missouri: {
    name: "Missouri Revised Statutes",
    pattern: /^(\d{3})\.(\d{3,4})/,
    key: (match) => `${match[1]}.${match[2]}`
  }
};

const sectionTitles = statuteSections as Readonly<Record<string, Readonly<Record<string, string>>>>;

function statuteNote(
  state: CoverageState,
  description: string,
  statuteCode: string | null
): ChargeNote | null {
  const system = statuteSystems[state];
  const titles = sectionTitles[state];
  if (!system || !titles) return null;
  for (const candidate of [statuteCode, description]) {
    const match = candidate?.trim().match(system.pattern);
    if (!match) continue;
    const section = system.key(match);
    const title = titles[section];
    if (title) return { term: `${system.name} ${section}`, meaning: title };
  }
  return null;
}

function oklahomaStatuteNote(description: string): ChargeNote | null {
  const match = description.match(
    /\b(\d{1,2})\s?\.?\s?O\.\s?S\.?\s?(?:§\s?)?(\d{1,4}(?:[.-]\d{1,4}[A-Z]?)*)/i
  );
  if (!match) return null;
  return {
    term: `${match[1]} O.S. ${match[2]}`,
    meaning: `Oklahoma Statutes, Title ${match[1]}, section ${match[2]}.`
  };
}

// Texas rosters cite codes by abbreviation: "PC 49.04", "HSC 481.115(b)".
const texasCodes: Readonly<Record<string, string>> = {
  PC: "Texas Penal Code",
  HSC: "Texas Health and Safety Code",
  TRC: "Texas Transportation Code",
  CCP: "Texas Code of Criminal Procedure",
  FC: "Texas Family Code",
  GC: "Texas Government Code",
  ABC: "Texas Alcoholic Beverage Code"
};

function texasStatuteNote(statuteCode: string | null): ChargeNote | null {
  const match = statuteCode?.trim().match(/^([A-Z]{2,3})\s+(\d{1,3}\.\d{1,4}[A-Z]?)/);
  const code = match ? texasCodes[match[1] ?? ""] : undefined;
  if (!match || !code) return null;
  const term = `${match[1]} ${match[2]}`;
  const title = sectionTitles.texas?.[term];
  return {
    term,
    meaning: title ? `${code} section ${match[2]}: ${title}.` : `${code}, section ${match[2]}.`
  };
}

const maximumNotes = 8;

/** Notes for one charge, in the order its terms appear; empty when nothing is recognized. */
export function explainCharge(
  state: CoverageState,
  description: string,
  statuteCode: string | null
): ChargeNote[] {
  const notes: ChargeNote[] = [];
  const statute =
    statuteNote(state, description, statuteCode) ??
    (state === "oklahoma" ? oklahomaStatuteNote(description) : null) ??
    (state === "texas" ? texasStatuteNote(statuteCode) : null);
  if (statute) notes.push(statute);

  const found: { index: number; note: ChargeNote }[] = [];
  for (const term of terms) {
    if (term.states && !term.states.includes(state)) continue;
    const match = term.pattern.exec(description);
    if (match) found.push({ index: match.index, note: { term: term.term, meaning: term.meaning } });
  }
  if (state === "texas") {
    const index = description.search(/\bPG\s?[1-4]/i);
    for (const note of penaltyGroupNotes(description)) found.push({ index, note });
  }
  found.sort((left, right) => left.index - right.index);
  for (const { note } of found) {
    if (!notes.some((existing) => existing.term === note.term)) notes.push(note);
  }
  return notes.slice(0, maximumNotes);
}

/** Abbreviations that can appear in a state's roster charge text, for the state's terms page. */
export function chargeTermsForState(state: CoverageState): ChargeNote[] {
  const list: ChargeNote[] = [];
  for (const term of terms) {
    if (term.states && !term.states.includes(state)) continue;
    if (list.some((existing) => existing.term === term.term)) continue;
    list.push({ term: term.term, meaning: term.meaning });
  }
  if (state === "texas") {
    for (const [group, meaning] of Object.entries(texasPenaltyGroups)) {
      list.push({ term: `PG ${group}`, meaning });
    }
  }
  return list;
}

export type OffenseLevel = Readonly<{ name: string; meaning: string }>;
export type OffenseLevelGuide = Readonly<{ source: string; levels: readonly OffenseLevel[] }>;

/** Offense classes with their maximum penalties, only for states whose statutes were checked. */
export const offenseLevels: Partial<Record<CoverageState, OffenseLevelGuide>> = {
  texas: {
    source: "Texas Penal Code sections 12.21 to 12.35",
    levels: [
      { name: "Class C misdemeanor", meaning: "Fine of up to $500. No jail time." },
      { name: "Class B misdemeanor", meaning: "Up to 180 days in jail and a $2,000 fine." },
      { name: "Class A misdemeanor", meaning: "Up to one year in jail and a $4,000 fine." },
      {
        name: "State jail felony",
        meaning: "180 days to two years in a state jail and a fine of up to $10,000."
      },
      {
        name: "Third degree felony",
        meaning: "Two to 10 years in prison and a fine of up to $10,000."
      },
      {
        name: "Second degree felony",
        meaning: "Two to 20 years in prison and a fine of up to $10,000."
      },
      {
        name: "First degree felony",
        meaning: "Five to 99 years or life in prison and a fine of up to $10,000."
      },
      { name: "Capital felony", meaning: "Life in prison, or death if the state seeks it." }
    ]
  },
  minnesota: {
    source: "Minnesota Statutes sections 609.02 and 609.03",
    levels: [
      {
        name: "Petty misdemeanor",
        meaning: "Not a crime. The most it can bring is a $300 fine."
      },
      { name: "Misdemeanor", meaning: "Up to 90 days in jail and a $1,000 fine." },
      { name: "Gross misdemeanor", meaning: "Up to 364 days in jail and a $3,000 fine." },
      {
        name: "Felony",
        meaning:
          "A crime that can bring a year or more in prison. The maximum depends on the offense."
      }
    ]
  },
  iowa: {
    source: "Iowa Code sections 902.1, 902.9, and 903.1",
    levels: [
      { name: "Simple misdemeanor", meaning: "Up to 30 days in jail and a fine." },
      { name: "Serious misdemeanor", meaning: "Up to one year in jail and a fine." },
      { name: "Aggravated misdemeanor", meaning: "Up to two years in prison and a fine." },
      { name: "Class D felony", meaning: "Up to five years in prison and a fine." },
      { name: "Class C felony", meaning: "Up to 10 years in prison and a fine." },
      { name: "Class B felony", meaning: "Up to 25 years in prison." },
      { name: "Class A felony", meaning: "Life in prison." }
    ]
  },
  kansas: {
    source: "Kansas Statutes sections 21-6602, 21-6804, and 21-6805",
    levels: [
      { name: "Class C misdemeanor", meaning: "Up to one month in the county jail." },
      { name: "Class B misdemeanor", meaning: "Up to six months in the county jail." },
      { name: "Class A misdemeanor", meaning: "Up to one year in the county jail." },
      {
        name: "Felony severity levels",
        meaning:
          "Felonies are ranked from severity level 1, the most serious, to level 10 (drug crimes from 1 to 5). The sentence comes from the state sentencing grid and the person's criminal history."
      }
    ]
  }
};

export const statuteSourceLabels: Partial<Record<CoverageState, string>> = {
  minnesota: "Minnesota Statutes section titles, Office of the Revisor of Statutes",
  iowa: "Iowa Code 2026 section titles, Iowa Legislature",
  kansas: "Kansas Statutes section titles, Kansas Office of Revisor of Statutes",
  missouri: "Missouri Revised Statutes section titles, Missouri Revisor of Statutes",
  texas:
    "Texas Penal Code, Health and Safety Code, and Transportation Code section titles, Texas Legislature"
};
