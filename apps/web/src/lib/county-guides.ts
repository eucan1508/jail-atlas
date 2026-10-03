export type CountyGuideSection = Readonly<{
  title: string;
  body: string;
  sourceLabel: string;
  sourceUrl: string;
}>;

export type CountyGuideFaq = Readonly<{
  question: string;
  answer: string;
}>;

export type CountyGuideProfile = Readonly<{
  facilityName: string;
  address: string;
  phone: string;
  operatedBy: string;
  reviewedAt: string;
  overview: string;
  contactSourceLabel: string;
  contactSourceUrl: string;
  sections: readonly CountyGuideSection[];
  /** County-specific questions shown ahead of the shared roster FAQ. */
  faq: readonly CountyGuideFaq[];
}>;

const profiles: Readonly<Record<string, CountyGuideProfile>> = {
  "iowa/dallas-county": {
    facilityName: "Dallas County Jail",
    address: "28985 Thin Blue Line Lane, Adel, IA 50003",
    phone: "515-993-5815",
    operatedBy: "Dallas County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Dallas County Sheriff's Office operates the correctional facility in Adel and publishes its current Inmate Inquiry. Official county pages also explain intake, release, bond, deposits, communication, visitation, and mail.",
    contactSourceLabel: "Official Dallas County Jail contact",
    contactSourceUrl: "https://www.dallascountyiowa.gov/508/Contact",
    sections: [
      {
        title: "Visitation and communication",
        body: "Video visits, inmate telephone service, and email correspondence use CIDNET. The county directs account and setup questions to the provider support area; review the official page before scheduling a visit.",
        sourceLabel: "Official inmate account and communication page",
        sourceUrl: "https://www.dallascountyiowa.gov/366/Inmate-Account-Bond"
      },
      {
        title: "Money and commissary",
        body: "Family and friends may deposit money online, by phone, or at the facility kiosk. The inmate's name or ID number is required; use only the setup link published by Dallas County.",
        sourceLabel: "Official inmate deposit instructions",
        sourceUrl: "https://www.dallascountyiowa.gov/366/Inmate-Account-Bond"
      },
      {
        title: "Mail",
        body: "Mail must include the inmate's full name, arrest number, cell number, and P.O. Box 187, Adel, IA 50003-0187. Incoming mail is searched under the county's published rules, and cash or personal checks should not be mailed.",
        sourceLabel: "Official inmate mail rules",
        sourceUrl: "https://www.dallascountyiowa.gov/368/Inmate-Visitation"
      },
      {
        title: "Bail and court records",
        body: "A magistrate determines bond. Dallas County lists jail, Clerk of Court, online, and bonding-company options, depending on the bond type. The Clerk of Court phone listed by the jail is 515-993-7018.",
        sourceLabel: "Official bond information",
        sourceUrl: "https://www.dallascountyiowa.gov/367/Bond-Information"
      }
    ],
    faq: [
      {
        question: "Does Dallas County Jail offer video visits?",
        answer:
          "Yes. Video visits, phone calls, and email messages with people held at the Dallas County Jail all go through CIDNET, and families set up a CIDNET account before the first visit. The county does not post a weekly visiting schedule on its jail pages, so call 515-993-5815 to confirm a time."
      },
      {
        question: "How do I put money on an inmate's account in Dallas County?",
        answer:
          "Deposits can be made online, by phone, or at the kiosk inside the jail in Adel, and you will need the person's name or inmate ID number. Do not mail cash or personal checks: money found in incoming mail is treated as contraband and posted to the account instead of being delivered."
      }
    ]
  },
  "iowa/cedar-county": {
    facilityName: "Cedar County Jail",
    address: "711 E. South St., Tipton, IA 52772",
    phone: "563-886-2121",
    operatedBy: "Cedar County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Cedar County Jail is located in the Cedar County Law Enforcement Center in Tipton. The Sheriff's Office publishes the current roster and the facility's visitation, deposit, phone, and messaging instructions.",
    contactSourceLabel: "Cedar County Sheriff's Office",
    contactSourceUrl: "https://cedarcounty.iowa.gov/sheriff/",
    sections: [
      {
        title: "Visitation",
        body: "General visits are offered on Wednesday and Sunday and last 30 minutes. The county permits two adult visitors, requires a valid state photo ID, and does not allow visitors under 18 in the visiting area. Housing-unit times and restrictions can change, so review the official schedule before traveling.",
        sourceLabel: "Official visitation rules",
        sourceUrl: "https://cedarcounty.iowa.gov/sheriff/inmate_visitation/"
      },
      {
        title: "Money and commissary",
        body: "The Sheriff's Office lists a lobby kiosk for cash or card deposits, phone deposits at 866-345-1884, and online deposits through Access Corrections or Smart Deposit. Transaction fees may apply.",
        sourceLabel: "Official commissary instructions",
        sourceUrl: "https://cedarcounty.iowa.gov/sheriff/inmate_visitation/"
      },
      {
        title: "Phone and messaging",
        body: "Cedar County identifies InmateSales as the provider for inmate phone service and chirping text messages and lists 877-398-7700 for provider support.",
        sourceLabel: "Official communication contacts",
        sourceUrl: "https://cedarcounty.iowa.gov/sheriff/inmate_visitation/"
      },
      {
        title: "Bail and court records",
        body: "Roster bond labels can change and are not a court ruling. Cedar County is in Iowa Judicial District 7. The Clerk of Court is at 400 Cedar St. in Tipton and lists 563-886-2101 for court questions.",
        sourceLabel: "Official Cedar County court information",
        sourceUrl: "https://www.cedarcounty.iowa.gov/courts/"
      }
    ],
    faq: [
      {
        question: "What are the visiting days at Cedar County Jail?",
        answer:
          "General visits are held on Wednesday and Sunday. Each person in custody may have two 30-minute visits a week with up to two visitors aged 18 or older, and contact visits are not allowed. Every visitor fills out a registration form in the lobby and must show a valid state photo ID with full name and date of birth."
      },
      {
        question: "How can I add money to a Cedar County inmate's account?",
        answer:
          "Use the kiosk in the Sheriff's Office lobby with cash or a card, call 866-345-1884, or create an account with Access Corrections or Smart Deposit and deposit online. The lobby kiosk charges a transaction fee, much like an ATM."
      }
    ]
  },
  "iowa/black-hawk-county": {
    facilityName: "Black Hawk County Jail",
    address: "225 E. 6th St., Waterloo, IA 50703",
    phone: "319-291-2587",
    operatedBy: "Black Hawk County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Black Hawk County Jail is operated by the Sheriff's Office in Waterloo. The county publishes a current Who's In Jail roster and a detailed family-support page covering mail, deposits, communication, and visits.",
    contactSourceLabel: "Black Hawk County Sheriff's Office contact page",
    contactSourceUrl: "https://www.bhcso.org/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "Visits use CIDNET. Local visits must be scheduled at least 24 hours ahead and take place at jail-lobby kiosks; remote visits may carry a provider fee. Frequency and available hours depend on the person's housing unit and security status.",
        sourceLabel: "Official inmate and family support",
        sourceUrl: "https://www.bhcso.org/resources/inmates-families"
      },
      {
        title: "Money and commissary",
        body: "The Sheriff's Office accepts account deposits through the jail lobby kiosk, by approved mailed payment, and online through Inmate Canteen. Confirm the recipient and current fee before submitting funds.",
        sourceLabel: "Official inmate and family support",
        sourceUrl: "https://www.bhcso.org/resources/inmates-families"
      },
      {
        title: "Phone and mail",
        body: "Phone, video, and electronic messaging use CIDNET. Postal mail must include the inmate's name, the jail address, and a return address; personal mail is searched under facility rules.",
        sourceLabel: "Official communication and mail rules",
        sourceUrl: "https://www.bhcso.org/resources/inmates-families"
      },
      {
        title: "Bail and court records",
        body: "For case filings and current court information, contact the Black Hawk County Clerk of Court at 319-833-3331. Do not treat a roster charge or bond label as a disposition.",
        sourceLabel: "Official requested phone numbers",
        sourceUrl: "https://www.bhcso.org/resources/requested-phone-numbers"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Black Hawk County Jail?",
        answer:
          "Hours depend on the housing pod. Most general-population pods (B through F) have weekday blocks between 8:15 a.m. and 2:30 p.m., plus 7 to 8 p.m. Monday through Thursday, and each person may have one local visit per weekday of up to 30 minutes. All visits are booked through CIDNET; local visits at the lobby kiosks are free but must be scheduled 24 hours ahead."
      },
      {
        question: "How do I send money to someone in the Black Hawk County Jail?",
        answer:
          "There are three options: the lobby kiosk, which takes cash or cards 24 hours a day; an online deposit through Inmate Canteen; or a money order or certified cashier's check made out to the inmate and sent by USPS, UPS, or FedEx to 225 E. 6th St., Waterloo, IA 50703. Cash is no longer accepted at the front counter, and commissary deposits cannot be moved to a phone account."
      }
    ]
  },
  "texas/milam-county": {
    facilityName: "Milam County Jail",
    address: "512 N. Jefferson, Suite A, Cameron, TX 76520",
    phone: "254-697-7063",
    operatedBy: "Milam County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Milam County Sheriff's Office operates the county jail in Cameron and publishes the current inmate roster. Its jail page provides the facility's current mail, deposit, care-package, and visitation instructions.",
    contactSourceLabel: "Milam County Sheriff's Office",
    contactSourceUrl: "https://www.milamcountysherifftx.org/divisions",
    sections: [
      {
        title: "Visitation",
        body: "The published schedule lists visits on Tuesday and Sunday from 8:30–10:45 a.m. and 11:45 a.m.–4:30 p.m., with a lunch closure. Call the jail before traveling because facility operations can change the schedule.",
        sourceLabel: "Official Milam County Jail page",
        sourceUrl: "https://www.milamcountysherifftx.org/jail"
      },
      {
        title: "Money and care packages",
        body: "Milam County directs online inmate-account deposits and care-package orders to JailATM. The jail says it does not accept cash, money orders, cashier's checks, or other currency in person or by mail.",
        sourceLabel: "Official deposit instructions",
        sourceUrl: "https://www.milamcountysherifftx.org/jail"
      },
      {
        title: "Mail and communication",
        body: "Personal mail must be addressed to Milam County Jail, the inmate's name, P.O. Box 247, Phoenix, MD 21131. The official jail page does not publish a general inmate phone-provider procedure; call 254-697-7063 for current instructions.",
        sourceLabel: "Official inmate mail instructions",
        sourceUrl: "https://www.milamcountysherifftx.org/jail"
      },
      {
        title: "Bail and court records",
        body: "Court status and filed case records must be confirmed with the appropriate court. The Milam County District Clerk is at 102 S. Fannin, Suite 5, Cameron, and lists 254-697-7052.",
        sourceLabel: "Official Milam County District Clerk information",
        sourceUrl: "https://www.milamcounty.net/upload/page/8923/New%202024%20Filing%20Fees.pdf"
      }
    ],
    faq: [
      {
        question: "What days can I visit an inmate at Milam County Jail?",
        answer:
          "Visitation is on Tuesday and Sunday, from 8:30 to 10:45 a.m. and again from 11:45 a.m. to 4:30 p.m., with a lunch break in between. Call 254-697-7063 before you go if you have questions."
      },
      {
        question: "How do I put money on a Milam County inmate's account?",
        answer:
          "Deposits are made online through JailATM, which also handles care-package orders. The jail does not take cash, money orders, or cashier's checks, either in person or by mail."
      }
    ]
  },
  "texas/hutchinson-county": {
    facilityName: "Hutchinson County Jail",
    address: "500 N. Main St., Stinnett, TX 79083",
    phone: "806-878-4012",
    operatedBy: "Hutchinson County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Hutchinson County Sheriff's Office publishes the current jail roster and facility information for the county jail in Stinnett, including a physical address, mailing address, phone number, and visitation schedule.",
    contactSourceLabel: "Official Hutchinson County Jail page",
    contactSourceUrl: "https://www.hutchinsonsherifftx.org/jail",
    sections: [
      {
        title: "Visitation",
        body: "The county lists male visitation Tuesday from 8–11:30 a.m. and 1–3:30 p.m. and Saturday from 9 a.m.–noon; female visitation is Thursday from 8–11:30 a.m. and 1–3:30 p.m. and Saturday from 1–4 p.m. Confirm the schedule before traveling.",
        sourceLabel: "Official visitation schedule",
        sourceUrl: "https://www.hutchinsonsherifftx.org/jail"
      },
      {
        title: "Money and commissary",
        body: "The official jail page does not publish an online deposit provider or detailed commissary procedure. Call the jail at 806-878-4012 before sending funds so the method and recipient can be confirmed.",
        sourceLabel: "Official jail contact",
        sourceUrl: "https://www.hutchinsonsherifftx.org/jail"
      },
      {
        title: "Phone and mail",
        body: "The facility lists P.O. Box 516, Stinnett, TX 79083 as its mailing address but does not publish detailed personal-mail or inmate-phone rules on the jail page. Contact the jail for the current format and restrictions.",
        sourceLabel: "Official jail contact and mailing address",
        sourceUrl: "https://www.hutchinsonsherifftx.org/jail"
      },
      {
        title: "Bail and court records",
        body: "For district-court filings, contact the Hutchinson County District Clerk at 515 S. Main St. in Stinnett, 806-878-4017. Confirm bond and hearing information with the jail or court rather than relying on a roster label.",
        sourceLabel: "Official Hutchinson County District Clerk",
        sourceUrl: "https://www.co.hutchinson.tx.us/government/district-clerk/"
      }
    ],
    faq: [
      {
        question: "When is visitation at Hutchinson County Jail?",
        answer:
          "Men can visit on Tuesday from 8 to 11:30 a.m. and 1 to 3:30 p.m., and on Saturday from 9 a.m. to noon. Women can visit on Thursday from 8 to 11:30 a.m. and 1 to 3:30 p.m., and on Saturday from 1 to 4 p.m."
      },
      {
        question: "Can I deposit money for a Hutchinson County inmate online?",
        answer:
          "The jail's official page does not name an online deposit service or describe how commissary funds are handled. Call the jail at 806-878-4012 to confirm the accepted method before sending money."
      }
    ]
  },
  "texas/kendall-county": {
    facilityName: "Kendall County Detention Center",
    address: "8 Staudt St., Box 7, Boerne, TX 78006",
    phone: "830-249-4989",
    operatedBy: "Kendall County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Kendall County Sheriff's Office operates the 153-bed Kendall County Detention Center in Boerne. The county publishes the current inmate roster and separate official pages for jail contact, mail, deposits, and visitation.",
    contactSourceLabel: "Official detention-center information",
    contactSourceUrl: "https://www.kendallcountysheriff.com/detention-center-jail-information",
    sections: [
      {
        title: "Visitation",
        body: "Kendall County uses Encartele/CIDNET for remote video services. Availability and scheduling rules can change; the jail directs scheduling questions to 830-249-4989 on weekdays from 1–4 p.m. and asks that remote visits be arranged at least one day ahead.",
        sourceLabel: "Official visitation notice",
        sourceUrl: "https://www.kendallcountysheriff.com/attorney-visitation"
      },
      {
        title: "Money and commissary",
        body: "Funds may be deposited at the 24-hour lobby kiosk by cash or card, online through JailATM, or by money order sent through the mail. The county says employees do not accept funds in person and fees apply to kiosk deposits.",
        sourceLabel: "Official inmate mail and deposit rules",
        sourceUrl: "https://www.kendallcountysheriff.com/inmate-mail-and-mail-rules"
      },
      {
        title: "Mail and communication",
        body: "The Sheriff's Office publishes detailed prohibited-item rules for inmate mail and requires books and publications to come directly from a publisher or authorized seller. Verify the current mailing label shown on the official page before sending anything.",
        sourceLabel: "Official inmate mail rules",
        sourceUrl: "https://www.kendallcountysheriff.com/inmate-mail-and-mail-rules"
      },
      {
        title: "Bail and court records",
        body: "Bonds and jail records are directed to the detention center address. For felony and district-court records, the Kendall County District Clerk is at 201 E. San Antonio Ave., Suite 201, Boerne, and lists 830-249-9343.",
        sourceLabel: "Official Kendall County District Clerk",
        sourceUrl: "https://co.kendall.tx.us/196/District-Clerk"
      }
    ],
    faq: [
      {
        question: "What are Kendall County Jail's visiting hours?",
        answer:
          "Face-to-face visits need an appointment, made by calling 830-249-4989 on weekdays between 9 and 11 a.m., one day ahead. Women visit Tuesday, Thursday, and Saturday from 8 to 11 a.m. and Wednesday and Friday from 1 to 4 p.m.; men have the opposite schedule. Each person gets two 20-minute visits a week, and visitors must arrive 10 minutes early with a valid government-issued ID."
      },
      {
        question: "Does Kendall County Jail offer video visits?",
        answer:
          "Yes, through CIDNET. Free on-site video visits in the jail lobby run daily from 8 to 11:45 a.m. and 12:45 to 5 p.m. and must be booked 24 hours ahead. Paid remote visits are available from 7 a.m. to 10:30 p.m. every day and must be booked at least an hour ahead."
      },
      {
        question: "How do I put money on an inmate's account in Kendall County?",
        answer:
          "Use the machine in the jail's main lobby, which takes cash or cards 24 hours a day for a $3.50 fee, deposit online through JailATM, or mail a money order. Detention staff do not accept funds in person, and mailed cash, checks, or gift cards are returned."
      }
    ]
  },
  "minnesota/mower-county": {
    facilityName: "Mower County Jail",
    address: "201 2nd Ave. NE, Suite 4, Austin, MN 55912",
    phone: "507-437-9562",
    operatedBy: "Mower County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Mower County Jail is located in Austin and operated by the Sheriff's Office. The county publishes a current roster PDF and official facility policies for visits, mail, inmate communication, and canteen use.",
    contactSourceLabel: "Official Mower County Jail directory",
    contactSourceUrl: "https://www.co.mower.mn.us/directory.aspx?did=34",
    sections: [
      {
        title: "Visitation",
        body: "Mower County uses monitored, recorded video and non-contact visitation. Visits are subject to the jail's schedule, identification requirements, conduct rules, and security restrictions; review the official policy before visiting.",
        sourceLabel: "Official visitor conduct policy",
        sourceUrl:
          "https://www.co.mower.mn.us/DocumentCenter/View/1114/Rules-of-Visitor-Conduct-PDF"
      },
      {
        title: "Money and canteen",
        body: "The county's published mail policy says accepted inmate funds are placed on a TurnKey canteen account and identifies cash and money orders as accepted by mail, while personal and third-party checks are rejected. Confirm the current method with the jail before sending funds.",
        sourceLabel: "Official inmate mail policy",
        sourceUrl: "https://www.co.mower.mn.us/DocumentCenter/View/1107/Inmate-Mail-PDF"
      },
      {
        title: "Phone and mail",
        body: "Mail should be addressed to Mower County Jail, care of the inmate's name, at the facility address. Mail is inspected under the published policy. The jail lists 507-481-3131 as the inmate-contact message number.",
        sourceLabel: "Official jail contact and mail instructions",
        sourceUrl: "https://www.co.mower.mn.us/DocumentCenter/View/1107/Inmate-Mail-PDF"
      },
      {
        title: "Bail and court records",
        body: "Roster charges are custody-source labels, not court outcomes. Use the Minnesota Judicial Branch court finder for Mower County case and hearing information, or call the jail for the appropriate court contact.",
        sourceLabel: "Minnesota Judicial Branch court finder",
        sourceUrl: "https://www.mncourts.gov/Find-Courts.aspx"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Mower County Jail?",
        answer:
          "Visits run Tuesday and Thursday from 1 to 4 p.m. and 6 to 8 p.m., and Wednesday and Friday from 1 to 4 p.m. Visitors must be on the approved visitor list, only one visitor is allowed in the visiting area at a time, and each inmate may have two visits per visiting day. Adults need a current photo ID."
      },
      {
        question: "How do I send money to a Mower County inmate?",
        answer:
          "Money sent to the jail is added to the person's TurnKey canteen account. Only cash and money orders are accepted by mail; personal and third-party checks are refused. Address it to Mower County Jail, C/O the inmate's name, 201 2nd Ave. NE, Suite 4, Austin, MN 55912."
      }
    ]
  },
  "minnesota/ramsey-county": {
    facilityName: "Ramsey County Adult Detention Center",
    address: "425 Grove St., Saint Paul, MN 55101",
    phone: "651-266-9350",
    operatedBy: "Ramsey County Sheriff's Office",
    reviewedAt: "October 3, 2026",
    overview:
      "The Ramsey County Sheriff's Office Detention Services division operates the Adult Detention Center, a pretrial county jail in Saint Paul. The Sheriff's Office publishes separate pages for visiting, inmate money, and phone and mail at the facility.",
    contactSourceLabel: "Official Adult Detention Center page",
    contactSourceUrl:
      "https://www.ramseycountymn.gov/your-government/leadership/sheriffs-office/sheriffs-office-divisions/detention-services/adult-detention-center-jail",
    sections: [
      {
        title: "Visitation and communication",
        body: "Visits are non-contact video visits, either free in the jail lobby or remotely from home, and need an approved account and a booking 24 hours ahead. NCIC provides phone service at 800-943-2189; people in custody can make outgoing calls only, and staff do not take phone messages.",
        sourceLabel: "Official visiting information",
        sourceUrl:
          "https://www.ramseycountymn.gov/your-government/leadership/sheriffs-office/sheriffs-office-divisions/detention-services/adult-detention-center-jail/visit-inmate"
      },
      {
        title: "Money and commissary",
        body: "Deposits can be made online through TurnKey Corrections, at the lobby kiosk 24 hours a day, or by mailing a cashier's check or money order payable to the inmate. Cash at the kiosk is free; online and card deposits carry a fee.",
        sourceLabel: "Official inmate money instructions",
        sourceUrl:
          "https://www.ramseycountymn.gov/your-government/leadership/sheriffs-office/sheriffs-office-divisions/detention-services/adult-detention-center-jail/inmate-money"
      },
      {
        title: "Mail",
        body: "Address letters to the inmate's full name, Ramsey County ADC, Inmate Mail, 425 Grove Street, Saint Paul, MN 55101. Non-privileged mail is opened and inspected, packages are refused, and processing can add two to three business days.",
        sourceLabel: "Official phone and mail instructions",
        sourceUrl:
          "https://www.ramseycountymn.gov/your-government/leadership/sheriffs-office/sheriffs-office-divisions/detention-services/adult-detention-center-jail/inmate-communication"
      },
      {
        title: "Bail and court records",
        body: "Ramsey County District Court is part of Minnesota's Second Judicial District. For hearing or warrant-resolution questions, the court lists 651-266-8266; court records are separate from the jail roster.",
        sourceLabel: "Minnesota Judicial Branch — Ramsey County",
        sourceUrl: "https://www.mncourts.gov/Find-Courts/Ramsey.aspx"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Ramsey County Adult Detention Center?",
        answer:
          "Free on-site video visits in the jail lobby are offered Sunday from 11:30 a.m. to 2:30 p.m. and Tuesday and Thursday from noon to 2:30 p.m. Remote visits from home run every day from 8 a.m. to 9:30 p.m., with breaks from 10:30 to 11:30 a.m. and 4:30 to 5:30 p.m., up to four 20-minute visits a day. Both need an approved visitation account and a booking at least 24 hours ahead."
      },
      {
        question: "How do I deposit money for a Ramsey County inmate?",
        answer:
          "Deposit online through TurnKey Corrections for a fee, use the 24-hour lobby kiosk at 425 Grove St. (cash is free, cards carry a fee), or mail a cashier's check or money order made payable to the inmate. Phone deposits are not accepted, and cash or personal checks sent by mail are returned."
      }
    ]
  },
  "minnesota/stearns-county": {
    facilityName: "Stearns County Jail",
    address: "807 Courthouse Square, Saint Cloud, MN 56303",
    phone: "320-259-3760",
    operatedBy: "Stearns County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Stearns County Sheriff's Office operates the county jail in Saint Cloud and publishes current and past inmate searches. The county also maintains separate official instruction pages for funds, mail, communication, property release, and visitation.",
    contactSourceLabel: "Official Stearns County Jail",
    contactSourceUrl: "https://www.stearnscountymn.gov/stearns-county-jail",
    sections: [
      {
        title: "Visitation",
        body: "Stearns County publishes a dedicated visitation page linked from its inmate-information hub. Review it immediately before a visit because scheduling, visitor approval, and security restrictions can change.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.stearnscountymn.gov/571/Visitation"
      },
      {
        title: "Money and canteen",
        body: "The county publishes a dedicated Inmate Funds page for adding money to canteen accounts and notes that inmates generally may receive money rather than outside belongings. Use only the method linked by the county.",
        sourceLabel: "Official inmate funds page",
        sourceUrl: "https://www.stearnscountymn.gov/567/Inmate-Funds"
      },
      {
        title: "Phone and mail",
        body: "Telephones are available in housing units when inmates are not on lockdown. Stearns County also publishes a dedicated mail-procedure page; check it for the current address and restrictions before sending correspondence.",
        sourceLabel: "Official inmate information hub",
        sourceUrl:
          "https://www.stearnscountymn.gov/inmate-information?contentId=d3a077e8-9de6-4e03-b34e-a0ff28673d2e"
      },
      {
        title: "Bail and court records",
        body: "The jail roster does not establish guilt or a final court outcome. Use the Minnesota Judicial Branch court finder for Stearns County hearings and case records, and call 320-259-3760 for jail-specific custody questions.",
        sourceLabel: "Minnesota Judicial Branch court finder",
        sourceUrl: "https://www.mncourts.gov/Find-Courts.aspx"
      }
    ],
    faq: [
      {
        question: "Does Stearns County Jail publish visiting hours?",
        answer:
          "Stearns County keeps its visitation procedures on a dedicated page of the jail's website, and JailAtlas has not yet confirmed a weekly schedule from it. Call the jail at 320-259-3760 before you travel to check the current times and visitor rules."
      },
      {
        question: "How do I add money to a Stearns County inmate's canteen account?",
        answer:
          "In most cases people held at the Stearns County Jail may receive money but not outside belongings, and the county's Inmate Funds page pictures a TurnKey deposit kiosk. Call 320-259-3760 to confirm the accepted methods and fees before sending money."
      }
    ]
  },
  "minnesota/anoka-county": {
    facilityName: "Anoka County Jail",
    address: "325 E. Jackson St., Anoka, MN 55303",
    phone: "763-324-5100",
    operatedBy: "Anoka County Sheriff's Office",
    reviewedAt: "October 1, 2026",
    overview:
      "The Anoka County Sheriff's Office operates the county jail in Anoka and publishes an official inmate locator. County pages separately document video visitation, phone and message services, and commissary deposits.",
    contactSourceLabel: "Official Anoka County jail information",
    contactSourceUrl: "https://www.anokacountymn.gov/437/Jail-Division",
    sections: [
      {
        title: "Visitation",
        body: "The jail offers onsite and remote video visits through ICSolutions. Visits must be scheduled at least 24 hours ahead, are monitored and recorded, and are generally limited to one 20-minute visit per day under the county's published rules.",
        sourceLabel: "Official visiting information",
        sourceUrl: "https://www.anokacountymn.gov/450/Visiting-Information"
      },
      {
        title: "Money and commissary",
        body: "Anoka County identifies Inmate Canteen/TurnKey as its online deposit service. The jail-lobby kiosk accepts cash, credit, and debit cards and is listed as available daily from 7 a.m. to 10 p.m.",
        sourceLabel: "Official commissary account instructions",
        sourceUrl: "https://www.anokacountymn.gov/444/Commissary-Account"
      },
      {
        title: "Phone and messages",
        body: "Inmate calls are generally available from 9 a.m. to 10 p.m. through ICSolutions. The county lists 888-506-8407 for provider support and 763-575-8506 for leaving a voice message.",
        sourceLabel: "Official phone and message instructions",
        sourceUrl: "https://www.anokacountymn.gov/2216/Phone-Calls-Messages"
      },
      {
        title: "Bail and court records",
        body: "Anoka County District Court is at 2100 3rd Ave. in Anoka. The main line is 763-760-6700 and the court lists 763-760-6540 for district-court bail questions.",
        sourceLabel: "Minnesota Judicial Branch — Anoka County",
        sourceUrl: "https://www.mncourts.gov/Find-Courts/Anoka.aspx"
      }
    ],
    faq: [
      {
        question: "How do video visits work at Anoka County Jail?",
        answer:
          "Family and friends can visit by video on-site at the jail, arriving no more than five minutes before the scheduled time, or remotely through ICSolutions for a fee. Remote visits must be booked on the ICSolutions website at least 24 hours in advance."
      },
      {
        question: "How can I put money on an Anoka County inmate's account?",
        answer:
          "Set up an Inmate Canteen/TurnKey account online, or use the kiosk in the jail lobby in Anoka, which takes cash and credit or debit cards from 7 a.m. to 10 p.m. every day. The funds cover phone calls, vending items, and commissary orders, which are delivered on Tuesdays and Fridays."
      }
    ]
  }
};

export function findCountyGuide(state: string, county: string): CountyGuideProfile | undefined {
  return profiles[`${state}/${county}`];
}

export const countyGuideKeys = Object.freeze(Object.keys(profiles));
