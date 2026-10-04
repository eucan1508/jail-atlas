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
  },
  "minnesota/wright-county": {
    facilityName: "Wright County Jail",
    address: "3800 Braddock Ave. NE, Buffalo, MN 55313",
    phone: "763-684-2381",
    operatedBy: "Wright County Sheriff's Office",
    reviewedAt: "October 3, 2026",
    overview:
      "The Wright County Sheriff's Office runs the county jail in Buffalo, which opened in 2009 with a licensed capacity of 288. On weekdays the Sheriff's Office publishes a Jail Census of every adult in custody, and its jail page covers visiting, deposits, phone service, and mail.",
    contactSourceLabel: "Official Wright County Jail page",
    contactSourceUrl: "https://www.wrightcountymn.gov/237/Jail",
    sections: [
      {
        title: "Visitation",
        body: "Free video visits at the jail run Monday through Saturday from 9 to 11:30 a.m., weekdays from 2:30 to 4 p.m., and Tuesday and Wednesday evenings from 6 to 8 p.m. Visits last 20 minutes with up to two adults, children are allowed, and a current government-issued photo ID is required. There is no visiting on Sundays or listed holidays.",
        sourceLabel: "Official jail visiting hours",
        sourceUrl: "https://www.wrightcountymn.gov/237/Jail"
      },
      {
        title: "Money and commissary",
        body: "Deposits can be made online through Inmate Canteen with a credit card, or in cash at the kiosk in the jail lobby, which posts the money straight to the person's account. Phone funds go through Reliance Telephone, or the person can move money from their canteen account to their phone account.",
        sourceLabel: "Official jail FAQ",
        sourceUrl: "https://www.wrightcountymn.gov/Faq.aspx?QID=94"
      },
      {
        title: "Phone and mail",
        body: "Reliance Telephone provides inmate phone service, and the jail lists 763-515-4160 for leaving a brief voicemail. Since July 6, 2026, personal mail goes to a Reliance processing center in Grand Forks, North Dakota, where it is scanned to the person's tablet and the originals are destroyed. Legal and medical mail still goes directly to the jail.",
        sourceLabel: "Official personal mail notice",
        sourceUrl:
          "https://www.wrightcountymn.gov/DocumentCenter/View/37745/Wright-County-Jail-Personal-Mail-Process-Change-Notice"
      },
      {
        title: "Bail and court records",
        body: "Wright County is in Minnesota's Tenth Judicial District. Court Administration keeps case records, schedules hearings, and collects fines at 3700 Braddock Ave. NE, Suite 1100, Buffalo, and lists 763-760-6300. A charge on the jail census is not a court outcome.",
        sourceLabel: "Official Court Administration page",
        sourceUrl: "https://www.wrightcountymn.gov/155/Court-Administration"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Wright County Jail?",
        answer:
          "Morning visits run Monday through Saturday from 9 to 11:30 a.m. Afternoon visits run Monday through Friday from 2:30 to 4 p.m., and evening visits run Tuesday and Wednesday from 6 to 8 p.m. Each video visit at the jail is free and lasts 20 minutes, you may visit once per session, and there are no visits on Sundays or holidays."
      },
      {
        question: "How do I put money on an inmate's account in Wright County?",
        answer:
          "Deposit online through Inmate Canteen with a credit card, or bring cash to the kiosk in the jail lobby in Buffalo. For phone calls, add money at Reliance Telephone, or let the person transfer funds from their canteen account to their phone account."
      },
      {
        question: "Where do I send mail to someone in the Wright County Jail?",
        answer:
          "Personal letters and photos go to the inmate's first and last name, Wright County Jail – Buffalo, MN, 1533 S. 42nd St., Suite 200, Grand Forks, ND 58201. They are scanned to the person's tablet and the originals are not returned. Personal mail sent straight to the jail is returned to the sender, but legal and medical mail should still go to the jail."
      },
      {
        question: "How do I post bail at Wright County Jail?",
        answer:
          "First confirm the bail amount and conditions with the jail at 763-684-2381. You can then bring the exact cash amount to jail reception, or work with a bail bond company; a list of companies is posted in the jail lobby, and they charge at least 10% of the bond as a fee."
      }
    ]
  },
  "minnesota/carlton-county": {
    facilityName: "Carlton County Jail",
    address: "1780 Justice Drive, Suite 1200, Carlton, MN 55718",
    phone: "218-384-4560",
    operatedBy: "Carlton County Sheriff's Office",
    reviewedAt: "October 3, 2026",
    overview:
      "The Carlton County Sheriff's Office runs the county jail in the Carlton County Justice Center. The Sheriff's Office posts a jail roster that it updates every hour, and its jail pages cover visiting, deposits, phone service, and mail.",
    contactSourceLabel: "Official Carlton County Jail information",
    contactSourceUrl: "https://www.carltoncountymn.gov/271/Jail-Information",
    sections: [
      {
        title: "Visitation",
        body: "Visits are held Tuesday, Thursday, and Saturday from 1 to 4:30 p.m. and 7 to 9 p.m. They are non-contact, limited to 30 minutes per inmate, and at least one visitor must be 18 or older. Visitors need a photo ID and a PIN from jail staff, and they enter through door 4.",
        sourceLabel: "Official jail information page",
        sourceUrl: "https://www.carltoncountymn.gov/271/Jail-Information"
      },
      {
        title: "Money and commissary",
        body: "Deposits can be made online through JailATM, up to $300 a week, with a 10% fee on credit cards. The lobby kiosk charges $3 on cash deposits and 10% on card deposits. Money orders and cashier's checks can also be mailed to the jail.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.carltoncountymn.gov/836/Commissary"
      },
      {
        title: "Phone and mail",
        body: "Reliance Telephone handles inmate phone accounts at 800-896-3201. Letters go to the inmate's first and last name, C/O Carlton County Jail, 1780 Justice Drive, Suite 1200, Carlton, MN 55718. Only postmarked U.S. Mail is accepted, envelopes may not carry stickers, and personal property should not be mailed.",
        sourceLabel: "Official correspondence page",
        sourceUrl: "https://www.carltoncountymn.gov/273/Correspondence"
      },
      {
        title: "Bail and court records",
        body: "Call the jail at 218-384-4560 to make an appointment before posting bail or bond. Carlton County Court Administration is in the same Justice Center and lists 218-673-5065. A charge on the jail roster is not a court outcome.",
        sourceLabel: "Official county contact list",
        sourceUrl: "https://www.carltoncountymn.gov/883/Contact-Us"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Carlton County Jail?",
        answer:
          "Visiting days are Tuesday, Thursday, and Saturday, from 1 to 4:30 p.m. and again from 7 to 9 p.m. Visits are non-contact and last up to 30 minutes per inmate. Bring a photo ID; jail staff give you a PIN to use the visiting station."
      },
      {
        question: "How do I put money on an inmate's account in Carlton County?",
        answer:
          "Use JailATM online (up to $300 a week, 10% card fee) or the Stellar kiosk in the jail lobby, which charges $3 on cash deposits and 10% on card deposits. You can also mail a money order or cashier's check to the jail, and it will be added to the person's account."
      },
      {
        question: "What is the mailing address for Carlton County Jail?",
        answer:
          "Write the inmate's first and last name, then C/O Carlton County Jail, 1780 Justice Drive, Suite 1200, Carlton, MN 55718. The jail only accepts mail delivered by the U.S. Postal Service, envelopes cannot have stickers, and personal items sent by mail go into the person's property until release."
      },
      {
        question: "How do I post bail at Carlton County Jail?",
        answer:
          "Call the jail at 218-384-4560 and make an appointment before you come in to post bail or bond. For hearing dates and case questions, contact Carlton County Court Administration at 218-673-5065."
      }
    ]
  },
  "texas/kleberg-county": {
    facilityName: "Kleberg County Detention Center",
    address: "1500 E. King Ave., Kingsville, TX 78363",
    phone: "361-595-8500",
    operatedBy: "Kleberg County Sheriff's Office",
    reviewedAt: "October 4, 2026",
    overview:
      "The Kleberg County Sheriff's Office runs the detention center in Kingsville. Its website keeps a current-inmates roster separate from a 48-hour release list, and the Detention Division pages cover visiting, deposits, phone and video calls, mail, and bonds.",
    contactSourceLabel: "Official Detention Division page",
    contactSourceUrl: "https://www.klebergcoso.org/jail-division",
    sections: [
      {
        title: "Visitation",
        body: "Regular visits are on Tuesday (men 2–3:30 p.m., women 3:30–4 p.m.) and Saturday (men 2–4:30 p.m., women 4:30–5 p.m.). Each inmate may have two 20-minute visits a week, visitors must be on the inmate's list and show photo ID, and close-custody and maximum-security inmates have separate times.",
        sourceLabel: "Official inmate visitation page",
        sourceUrl: "https://www.klebergcoso.org/inmate-visitation"
      },
      {
        title: "Money and commissary",
        body: "Kleberg County uses CTC Commissary. Family can deposit funds online through CommissaryDeposit.com or at the cash and card kiosk in the Sheriff's Office lobby; phone deposits are not available and fees may apply. Commissary orders go through CommissaryOrder.com, and items from other merchants are refused except soft-cover books.",
        sourceLabel: "Official send-money page",
        sourceUrl: "https://www.klebergcoso.org/send-money-to-an-inmate"
      },
      {
        title: "Phone and mail",
        body: "Encartele handles inmate phone accounts (866-476-6723), and City Tele-Coin handles video calls and messages. Letters go to the inmate's name and PID number, Kleberg County Detention Center, P.O. Box 1360, Kingsville, TX 78363. Mail is opened and inspected, and cash, money orders, and checks must not be mailed.",
        sourceLabel: "Official inmate communication page",
        sourceUrl: "https://www.klebergcoso.org/communicate-with-an-inmate"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office lets families post bond online through eBONDS with a credit card. For district-court filings and case records, the Kleberg County District Clerk lists 361-595-8561. A roster charge or bond label is not a court outcome.",
        sourceLabel: "Official posting bond page",
        sourceUrl: "https://www.klebergcoso.org/posting-bond"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Kleberg County Jail?",
        answer:
          "Regular visitation is on Tuesday and Saturday. On Tuesday, men visit from 2 to 3:30 p.m. and women from 3:30 to 4 p.m.; on Saturday, men visit from 2 to 4:30 p.m. and women from 4:30 to 5 p.m. Visits last 20 minutes, each inmate gets two a week, and you should arrive 30 minutes early with a photo ID."
      },
      {
        question: "How do I put money on an inmate's account in Kleberg County?",
        answer:
          "Deposit online at CommissaryDeposit.com (CTC Commissary) or use the cash and card kiosk in the Sheriff's Office lobby in Kingsville. Phone deposits are not available, and you should not mail cash, money orders, or checks."
      },
      {
        question: "What is the mailing address for Kleberg County Detention Center?",
        answer:
          "Write the inmate's name and PID number, then Kleberg County Detention Center, P.O. Box 1360, Kingsville, TX 78363. Mail is delivered Monday through Friday, letters must be written in ink, and photos are limited to six per envelope and no larger than 5 by 7 inches."
      },
      {
        question: "How do I post bail at Kleberg County Jail?",
        answer:
          "Kleberg County uses eBONDS, which lets you post a bond online with a major credit card without going to the jail. Call the detention center at 361-595-8500 to confirm the bond amount and charges first."
      }
    ]
  },
  "arkansas/jefferson-county": {
    facilityName: 'W.C. "Dub" Brassell Adult Detention Center',
    address: "300 East 2nd Avenue, Pine Bluff, AR 71601",
    phone: "870-541-1921",
    operatedBy: "Jefferson County Sheriff's Office",
    reviewedAt: "October 4, 2026",
    overview:
      "The Jefferson County Sheriff's Office runs the W.C. \"Dub\" Brassell Adult Detention Center in Pine Bluff, a 300-bed jail that opened in 2007. The booking desk is at 870-541-1921 and jail administration at 870-541-4620. The Sheriff's Office FAQ covers video visits, commissary deposits, and bonds.",
    contactSourceLabel: "Official Jefferson County jail page",
    contactSourceUrl: "https://www.jeffcoso.org/jail",
    sections: [
      {
        title: "Visitation",
        body: "Family visits are by video through HomeWAV, seven days a week from 8 to 10 a.m. and 1 to 3 p.m., from home or at the detention center. The HomeWAV account has to be set up before you arrive; it cannot be created at the jail. Setup costs $1.00 and visits $0.50 a minute, and HomeWAV support is at 1-877-241-7559.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.jeffcoso.org/faq"
      },
      {
        title: "Money and commissary",
        body: "There are three ways to add money to a detainee's commissary account: the lobby kiosk at the detention center (cash or debit/credit card), TigerDeposits.com, or a money order mailed with the detainee's first and last name to 300 East 2nd Avenue, Pine Bluff, AR 71601.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.jeffcoso.org/faq"
      },
      {
        title: "Phone and mail",
        body: "Video visits run through HomeWAV monitors in each housing pod; once your account is set up, the detainee's name shows on the pod monitor, so there is no need to call the jail to have a deputy notify them. Money orders are mailed to 300 East 2nd Avenue, Pine Bluff, AR 71601. The Sheriff's Office does not post separate letter rules, so call jail administration at 870-541-4620 before mailing anything else.",
        sourceLabel: "Official Jefferson County jail page",
        sourceUrl: "https://www.jeffcoso.org/jail"
      },
      {
        title: "Bail and court records",
        body: 'Most warrants carry a bond set by the court; "No Bond" warrants mean the person stays in custody until seeing a judge. The Sheriff\'s Office accepts a cash bond or a surety bond from a licensed bail bonding company, and generally does not accept a release on recognizance or a property bond. A roster charge is not a court outcome.',
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.jeffcoso.org/faq"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Jefferson County Jail?",
        answer:
          "Family visits are by HomeWAV video, every day from 8 to 10 a.m. and 1 to 3 p.m. Set up the account at HomeWAV before you go; it costs $1.00 to open and $0.50 a minute. Attorneys may visit any day, preferably during business hours, and clergy may visit for up to 30 minutes during business hours."
      },
      {
        question: "How do I put money on an inmate's account in Jefferson County?",
        answer:
          "Use the kiosk in the detention center lobby (cash or card), deposit online at TigerDeposits.com, or mail a money order with the detainee's first and last name to 300 East 2nd Avenue, Pine Bluff, AR 71601."
      },
      {
        question: "What is the address of the Jefferson County jail in Pine Bluff?",
        answer:
          'The W.C. "Dub" Brassell Adult Detention Center is at 300 East 2nd Avenue, Pine Bluff, AR 71601. Call booking at 870-541-1921 or jail administration at 870-541-4620.'
      },
      {
        question: "How do I post bail at Jefferson County Jail?",
        answer:
          'Bring the bond amount in cash or use a licensed bail bonding company; the Sheriff\'s Office generally does not accept a release on recognizance or a property bond. Call booking at 870-541-1921 to confirm the bond amount first. A "No Bond" warrant means the person must see a judge before release.'
      }
    ]
  },
  "arkansas/logan-county": {
    facilityName: "Logan County Detention Center",
    address: "201 South Lowder Street, Paris, AR 72855",
    phone: "479-963-3271, ext. 1",
    operatedBy: "Logan County Sheriff's Office",
    reviewedAt: "October 4, 2026",
    overview:
      "The Logan County Sheriff's Office runs a 100-bed detention center in Paris, built in 2019 to replace a 33-bed jail. Logan County has two county seats, Paris and Booneville; most people arrested in the county are booked here, and much of the Paris court docket is heard in a courtroom inside the building.",
    contactSourceLabel: "Official detention center inmate information",
    contactSourceUrl: "https://www.loganso.com/detention-center-inmate-information",
    sections: [
      {
        title: "Visitation",
        body: "Visits are on Wednesdays and Sundays from 1 to 5 p.m. They are not in person: visitors use video kiosks in a room off the front lobby. The inmate schedules the visit from the cellblock kiosk, so the jail cannot book it for you; call 479-963-3271, ext. 1, on the morning of the visit to confirm you are on the list. Visits usually last 10 to 15 minutes.",
        sourceLabel: "Official detention center inmate information",
        sourceUrl: "https://www.loganso.com/detention-center-inmate-information"
      },
      {
        title: "Money and commissary",
        body: "Money is added to an inmate's account through City Tele-Coin, the same service used for at-home video visits. The jail does not accept items for inmates except prescription medication and prescription glasses; no clothing, food, or books.",
        sourceLabel: "Official detention center inmate information",
        sourceUrl: "https://www.loganso.com/detention-center-inmate-information"
      },
      {
        title: "Phone and mail",
        body: "At-home video visits are set up through a City Tele-Coin account. The detention center is at 201 South Lowder Street, Paris, AR 72855. Staff check incoming mail; contraband found in it is seized, and sending contraband into a jail is a Class C felony that the Sheriff's Office investigates.",
        sourceLabel: "Official detention center inmate information",
        sourceUrl: "https://www.loganso.com/detention-center-inmate-information"
      },
      {
        title: "Bail and court records",
        body: "Bonding out and release pickups use the door at the back of the building, next to the sally port; drive around to the right to reach the front lobby instead. For felony cases, the Circuit Clerk is at 479-963-2164 in Paris and 479-675-2894 in Booneville. District Court usually sits Tuesdays in Paris (clerk 479-963-3792) and Thursdays in Booneville (clerk 479-675-4929).",
        sourceLabel: "Official court information page",
        sourceUrl: "https://www.loganso.com/court-information"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Logan County Jail?",
        answer:
          "Wednesdays and Sundays, 1 to 5 p.m., by video kiosk in a room off the front lobby of the detention center in Paris. The inmate schedules the visit, not the jail. Call 479-963-3271, ext. 1, that morning to confirm you are on the list."
      },
      {
        question: "How do I put money on an inmate's account in Logan County?",
        answer:
          "Use City Tele-Coin, the service the Sheriff's Office links for inmate accounts and video visits. The jail does not accept dropped-off items other than prescription medication and prescription glasses."
      },
      {
        question: "Where is the Logan County jail?",
        answer:
          "The Logan County Sheriff's Office and Detention Center is at 201 South Lowder Street in Paris. Visitors park in front and use the lobby doors; people bonding out or being picked up use the release door at the back of the building."
      },
      {
        question: "Who do I call about a Logan County court case?",
        answer:
          "For felony cases, call the Circuit Clerk at 479-963-2164 (Paris) or 479-675-2894 (Booneville). For misdemeanors and traffic cases, call the District Court clerk at 479-963-3792 (Paris) or 479-675-4929 (Booneville)."
      }
    ]
  },
  "arkansas/greene-county": {
    facilityName: "Greene County Detention Center",
    address: "1809 N Rockingchair Road, Paragould, AR 72450",
    phone: "870-239-6334",
    operatedBy: "Greene County Sheriff's Office",
    reviewedAt: "October 4, 2026",
    overview:
      "The Greene County Sheriff's Office runs the detention center in Paragould, which can hold up to 456 people and averages about 350. Video visits, messages, and deposits go through JailATM, and the Sheriff's Office lists separate addresses for regular mail, legal mail, and money orders.",
    contactSourceLabel: "Official detention center page",
    contactSourceUrl: "https://www.greenesoar.gov/detention-center",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video through JailATM (TechFriends), which also handles messages and photos. Create the account at jailatm.com; for problems with the service call JailATM at 870-627-5476. For other questions, call the detention center at 870-239-6334.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.greenesoar.gov/detention-center"
      },
      {
        title: "Money and commissary",
        body: "Commissary is provided by Keefe, and money can be deposited through jailatm.com. Money orders go by mail to Financial Director, 1809 North Rockingchair, Paragould, AR 72450, and must be labeled as a money order. Property and money release is Friday through Sunday, 1 to 4 p.m., with a valid photo ID and a release form signed by the inmate.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.greenesoar.gov/detention-center"
      },
      {
        title: "Phone and mail",
        body: 'Correct Solutions Group runs the inmate phones. Regular mail goes to 500 Amity Road Suite 5B PMB 53, Conway, AR 72032. Legal mail comes from an attorney to 1809 North Rockingchair, Paragould, AR 72450, stamped "Legal Mail"; mail that needs a notary goes to Notary at the same address.',
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.greenesoar.gov/detention-center"
      },
      {
        title: "Bail and court records",
        body: "Cash bonds can be paid at the Sheriff's Office at any time through dispatch, or online through the county's CIS Arkansas payment page, and carry a 10% Arkansas bond fee that is not refunded. Misdemeanor fines are paid at the courthouse, Monday through Friday, 8:30 a.m. to 4:30 p.m. Bond amounts and court dates also appear on the official roster.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.greenesoar.gov/faqs"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at Greene County Jail?",
        answer:
          "Visits are by video through JailATM. Set up an account at jailatm.com; JailATM's help line is 870-627-5476. The same account handles messages and photos."
      },
      {
        question: "How do I put money on an inmate's account in Greene County?",
        answer:
          'Deposit through jailatm.com, or mail a money order labeled "money order" to Financial Director, 1809 North Rockingchair, Paragould, AR 72450.'
      },
      {
        question: "What is the mailing address for Greene County Detention Center?",
        answer:
          'Regular mail goes to 500 Amity Road Suite 5B PMB 53, Conway, AR 72032, not to the jail. Only legal mail from an attorney, stamped "Legal Mail," goes directly to 1809 North Rockingchair, Paragould, AR 72450.'
      },
      {
        question: "How do I pay a cash bond in Greene County?",
        answer:
          "Pay at the Sheriff's Office in Paragould at any hour through dispatch, or online through the CIS Arkansas payment page for the Greene County Sheriff. Cash bonds carry a 10% Arkansas bond fee that is not refunded."
      }
    ]
  },
  "arkansas/cleburne-county": {
    facilityName: "Cleburne County Detention Center",
    address: "914 South 9th Street, Heber Springs, AR 72543",
    phone: "501-362-2596",
    operatedBy: "Cleburne County Sheriff's Office",
    reviewedAt: "October 4, 2026",
    overview:
      "The Cleburne County Sheriff's Office runs a 70-bed detention center in Heber Springs. It holds only men on a long-term basis; women held long term are housed at the White County Jail in Searcy, and the jail does not house juveniles.",
    contactSourceLabel: "Official detention center page",
    contactSourceUrl: "https://www.cleburnearso.gov/detention-center",
    sections: [
      {
        title: "Visitation",
        body: "There are no in-person visits. Family and friends visit by video, seven days a week from 7 a.m. to 10 p.m., from any internet device or from the kiosk in the jail lobby. Video visits and e-messages are set up at jailatm.com.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.cleburnearso.gov/detention-center"
      },
      {
        title: "Money and commissary",
        body: "Cash can be left at the front counter for an inmate's commissary account, or deposited at the kiosk in the jail lobby. Inmates use the account for phone cards, underwear, socks, and commissary items. The jail does not accept food or clothing from outside.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.cleburnearso.gov/detention-center"
      },
      {
        title: "Phone and mail",
        body: "Personal mail is sent through jailatm.com or mailed to JailATM.com - Cleburne County Jail, with the inmate's ID and full name, 500 Amity Road, Ste 5B, PMB 53, Conway, AR 72032. It is scanned and delivered on a kiosk or tablet, and the original is destroyed. Legal and commercial mail still goes to the jail in Heber Springs.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.cleburnearso.gov/detention-center"
      },
      {
        title: "Bail and court records",
        body: "Judges set the bond amount and the sheriff decides whether a bond is sufficient. Bond can be posted in full in cash or through a licensed bail bonding company; the Cleburne County Sheriff's Office does not accept so-called sheriff's bonds. A roster charge or bond label is not a court outcome.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.cleburnearso.gov/faqs"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Cleburne County Jail?",
        answer:
          "Video visits run seven days a week, 7 a.m. to 10 p.m., from home or from the kiosk in the jail lobby. There are no face-to-face visits. Set up the account at jailatm.com."
      },
      {
        question: "How do I put money on an inmate's account in Cleburne County?",
        answer:
          "Leave cash at the front counter of the detention center at 914 South 9th Street in Heber Springs, or use the deposit kiosk in the jail lobby."
      },
      {
        question: "What is the mailing address for Cleburne County Jail?",
        answer:
          "Send personal mail to JailATM.com - Cleburne County Jail, the inmate's ID and full name, 500 Amity Road, Ste 5B, PMB 53, Conway, AR 72032, or send it electronically at jailatm.com. Legal and commercial mail goes directly to the jail."
      },
      {
        question: "Are women held at the Cleburne County jail?",
        answer:
          "Only for a short time. The Cleburne County Detention Center holds men long term; women held long term are housed at the White County Jail in Searcy."
      }
    ]
  }
};

export function findCountyGuide(state: string, county: string): CountyGuideProfile | undefined {
  return profiles[`${state}/${county}`];
}

export const countyGuideKeys = Object.freeze(Object.keys(profiles));
