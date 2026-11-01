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
  "iowa/cerro-gordo-county": {
    facilityName: "Cerro Gordo County Jail",
    address: "17262 Lark Ave., Mason City, IA 50401",
    phone: "641-421-3019",
    operatedBy: "Cerro Gordo County Sheriff's Office",
    reviewedAt: "October 8, 2026",
    overview:
      "The Cerro Gordo County Sheriff's Office runs the county jail inside the Law Enforcement Center at 17262 Lark Ave. in Mason City. Bond can be posted at any hour, and the jail's online population report lists each person's charges with their Iowa Code citations and bond type.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://cerrogordo.gov/sheriff/jail/",
    sections: [
      {
        title: "Visitation",
        body: "In-person visits are Wednesdays 6:30 to 8:30 p.m. and Sundays 1 to 3 p.m., and must be scheduled 24 hours ahead through Prodigy. Visits last 15 minutes; each inmate gets two a day, with up to two people per visit. Visitors must be 18 or older and show a government ID. Video visits from home are started by the inmate, who sends you a link by text or email once your Prodigy account is approved.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://cerrogordo.gov/sheriff/jail/"
      },
      {
        title: "Money and commissary",
        body: "Family and friends can add money to an inmate's commissary account 24 hours a day, at the kiosk in the jail lobby (cash, debit, or credit) or online through JailATM (cards only). Inmates can move commissary money to the jail phone system to pay for calls. Money left at release is returned on a debit card.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://cerrogordo.gov/sheriff/jail/"
      },
      {
        title: "Phone and mail",
        body: "Write to the inmate's name, Cerro Gordo County Law Enforcement Center, 17262 Lark Ave., Mason City, IA 50401, with your full name and address on the envelope. Packages are not accepted, and newspapers must come straight from the publisher. Inmates call out collect or with commissary funds; for problems with the inmate phone system, call 866-797-5778.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://cerrogordo.gov/sheriff/jail/"
      },
      {
        title: "Bail and court records",
        body: "Bond can be posted 24 hours a day, 7 days a week. The jail's population report shows the bond for each charge; when it reads cash/surety (sometimes c/s), a bail bondsman can be used. For court dates and times, call the Clerk of Court at 641-424-6431.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://cerrogordo.gov/sheriff/jail/"
      }
    ],
    faq: [
      {
        question: "When are visiting hours at the Cerro Gordo County Jail?",
        answer:
          "Wednesdays from 6:30 to 8:30 p.m. and Sundays from 1 to 3 p.m. Book the visit at least 24 hours ahead through Prodigy. Visits are 15 minutes, visitors must be 18 or older, and no one under 18 is allowed in the building."
      },
      {
        question: "How do I put money on an inmate's account in Cerro Gordo County?",
        answer:
          "Use the kiosk in the jail lobby in Mason City, which takes cash, debit, and credit cards, or deposit online through JailATM with a card. Both are available 24 hours a day."
      },
      {
        question: "What is the mailing address for the Cerro Gordo County Jail?",
        answer:
          "Write the inmate's name, then Cerro Gordo County Law Enforcement Center, 17262 Lark Ave., Mason City, IA 50401. Your full name and address must be on the envelope, or the mail is held in the inmate's property."
      },
      {
        question: "Can I use a bail bondsman in Cerro Gordo County?",
        answer:
          "Yes, when the charge or warrant lists the bond as cash/surety (c/s). Bonds can be posted at the jail at any hour. Call the jail at 641-421-3019 to confirm the amount."
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
  "arkansas/faulkner-county": {
    facilityName: "Faulkner County Detention Center",
    address: "500 S German Lane, Conway, AR",
    phone: "501-328-4160",
    operatedBy: "Faulkner County Sheriff's Office",
    reviewedAt: "October 5, 2026",
    overview:
      "The Faulkner County Sheriff's Office runs the detention center in Conway in two units. Unit Two at 500 S German Lane handles booking and holds up to 218 men and 88 women; Unit One at 801 Locust Street is the maximum-security unit for up to 118 men. The county also has a separate 16-bed juvenile detention center.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.fcso.ar.gov/jail",
    sections: [
      {
        title: "Visitation",
        body: "Unit Two visits are by video only, except attorney conferences and visits the Jail Administrator approves. Video visits are available in both units, and accounts are set up through JailATM. A detainee can only start video visits after leaving booking and moving to general population. Visits are recorded and monitored.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.fcso.ar.gov/jail"
      },
      {
        title: "Money and commissary",
        body: "Commissary deposits go through Access Corrections: the Access Corrections app or website (lowest handling charge), the toll-free line at 866-345-1884, or the cash kiosk in the lobby. Pick the right detainee name, because staff may not be able to move money sent to the wrong account.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.fcso.ar.gov/faq"
      },
      {
        title: "Phone and mail",
        body: "Personal mail does not go to the jail. Send it to JailATM.com - Faulkner County Jail, with the inmate ID number and full name, 500 Amity Rd, Ste 5B, PMB 53, Conway, AR 72032. Only legal mail goes to 801 Locust St, Conway, AR 72034. Phone accounts run through Correct Solutions (facility ID 24096, 877-618-3516), and detainees can call from 8 a.m. to 10 p.m.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.fcso.ar.gov/faq"
      },
      {
        title: "Bail and court records",
        body: "Judges set the bond amount and the sheriff decides whether a bond is sufficient. Bond can be posted in full in cash or through a licensed bail bonding company, whose fees are not refunded. Release on one's own recognizance is rarely allowed except for very minor offenses. Call Unit Two at 501-328-4160 for the amount.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.fcso.ar.gov/jail"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at Faulkner County Jail?",
        answer:
          "Visits are by video. Set up an account through JailATM; the detainee can take video visits once they are out of booking and in general population. In-person visits at Unit Two are limited to attorneys and visits the Jail Administrator approves."
      },
      {
        question: "How do I put money on an inmate's account in Faulkner County?",
        answer:
          "Use Access Corrections: its app or website, the phone line at 866-345-1884, or the cash kiosk in the jail lobby. Phone money is separate and goes through Correct Solutions, facility ID 24096."
      },
      {
        question: "What is the mailing address for Faulkner County Jail?",
        answer:
          "Send personal mail to JailATM.com - Faulkner County Jail, the inmate ID number and full name, 500 Amity Rd, Ste 5B, PMB 53, Conway, AR 72032. The jail itself only accepts legal mail, at 801 Locust St, Conway, AR 72034."
      },
      {
        question: "What are the phone numbers for the Faulkner County Detention Center?",
        answer:
          "Unit Two, which handles booking, is at 501-328-4160. Unit One is reached through the Sheriff's Office at 501-450-4914, then press 3."
      }
    ]
  },
  "minnesota/douglas-county": {
    facilityName: "Douglas County Jail",
    address: "509 3rd Avenue West, Alexandria, MN 56308",
    phone: "320-762-2139",
    operatedBy: "Douglas County Sheriff's Office",
    reviewedAt: "October 4, 2026",
    overview:
      "The Douglas County Jail in Alexandria opened in 2010. It has 156 beds, is approved to hold up to 135 people, and holds men and women at minimum, medium, and maximum security. It is a direct-supervision jail, so correctional officers work inside the housing units. TurnKey Corrections runs commissary and video visits.",
    contactSourceLabel: "Official jail administration page",
    contactSourceUrl: "https://www.douglascountymn.gov/jail",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by appointment through TurnKey's Inmate Canteen site, where you create a profile with a selfie and a photo of your ID. On-site visits at the jail are Tuesday 7 to 9:30 p.m., Thursday 1:30 to 4 p.m. and 7 to 9:30 p.m., and Sunday 1:30 to 4 p.m., one per inmate per day. Visits from home run daily from 9 to 10:30 a.m., 1 to 4 p.m., and 7 to 10:30 p.m. Each visit lasts 20 minutes.",
        sourceLabel: "Official visiting information page",
        sourceUrl: "https://www.douglascountymn.gov/visiting-jail"
      },
      {
        title: "Money and commissary",
        body: "Cash can be deposited at the kiosk in the public vestibule just inside the jail's main entrance, and it shows up in the inmate's account right away. Checks or money orders made out to the inmate can also be mailed; never mail cash. Property or money is released to someone outside only when the inmate fills out a release form, and all property goes out at once.",
        sourceLabel: "Official inmate property and money page",
        sourceUrl: "https://www.douglascountymn.gov/inmate-property-money"
      },
      {
        title: "Phone and mail",
        body: "Letters go to the inmate's full name, Douglas County Jail, 509 3rd Avenue West, Alexandria, MN 56308, by U.S. Mail only. All mail is scanned and inspected; crayon, gel pen, stickers, glitter, and glue are not allowed. The jail does not take phone messages, but you can leave one on the inmate message line at 320-391-6420. Phone cards cost $10.69 from canteen or can be bought online from Reliance Telephone.",
        sourceLabel: "Official jail mail page",
        sourceUrl: "https://www.douglascountymn.gov/jail-mail"
      },
      {
        title: "Bail and court records",
        body: "The jail accepts bail 24 hours a day, cash only. Call 320-762-2139 for the amount. During business hours (8 a.m. to 4 p.m., Monday to Friday) pay in the front lobby; at other times press the intercom button next to the kiosk. A bond must go through a licensed Minnesota bail bond company. For hearing dates, call Court Administration at 320-304-6050.",
        sourceLabel: "Official pay or post bond page",
        sourceUrl: "https://www.douglascountymn.gov/paypost-bond"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Douglas County Jail?",
        answer:
          "On-site visits are Tuesday 7 to 9:30 p.m., Thursday 1:30 to 4 p.m. and 7 to 9:30 p.m., and Sunday 1:30 to 4 p.m. Video visits from home run every day from 9 to 10:30 a.m., 1 to 4 p.m., and 7 to 10:30 p.m. All visits are booked through TurnKey's Inmate Canteen site and last 20 minutes."
      },
      {
        question: "How do I put money on an inmate's account in Douglas County?",
        answer:
          "Use the deposit kiosk just inside the main entrance of the jail at 509 3rd Avenue West in Alexandria; the money posts right away. You can also mail a check or money order made out to the inmate. Do not send cash in the mail."
      },
      {
        question: "What is the mailing address for Douglas County Jail?",
        answer:
          "Write the inmate's full name, then Douglas County Jail, 509 3rd Avenue West, Alexandria, MN 56308. Send it by U.S. Mail. Mail for someone who has been released or transferred is returned if it has a return address."
      },
      {
        question: "How do I post bail at Douglas County Jail?",
        answer:
          "Bail is paid in cash at the jail, any time of day. Call 320-762-2139 first to get the amount. On weekdays from 8 a.m. to 4 p.m. pay in the front lobby; after hours, use the intercom next to the lobby kiosk. For a bond, contact a licensed Minnesota bail bond company."
      }
    ]
  },
  "minnesota/st-louis-county": {
    facilityName: "St. Louis County Jail",
    address: "4334 Haines Road, Duluth, MN 55811",
    phone: "218-726-2345",
    operatedBy: "St. Louis County Sheriff's Office",
    reviewedAt: "October 5, 2026",
    overview:
      "The St. Louis County Sheriff's Office runs a 197-bed jail in Duluth, plus 72-hour lockups in Hibbing (8 beds) and Virginia (12 beds). Besides people arrested in the county, the jail holds fugitives wanted elsewhere and U.S. Marshals prisoners. Its roster is updated every hour and also lists people the county boards in other jails; this page shows only those held in Duluth.",
    contactSourceLabel: "Official St. Louis County Jail page",
    contactSourceUrl: "https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail",
    sections: [
      {
        title: "Visitation",
        body: "Visits use the video kiosks in the jail lobby in Duluth: Monday to Friday 8 to 10 a.m., and Saturday and Sunday 8 to 11 a.m. and 3 to 5 p.m. Every lobby visit must be registered 1 to 8 days ahead on the Reliance Telephone website. Reliance also runs video calls from home through its Reliance Connect app at $0.25 a minute.",
        sourceLabel: "Official St. Louis County Jail page",
        sourceUrl: "https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail"
      },
      {
        title: "Money and commissary",
        body: "Each inmate has an account for commissary, phone time, and other necessities, managed by Stellar Services. Money deposited is first applied to any fees the inmate owes before it can be used. Do not mail money orders, checks, or cash; the jail's mail service returns them.",
        sourceLabel: "Official inmate funds page",
        sourceUrl: "https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail/inmate-funds"
      },
      {
        title: "Phone and mail",
        body: "The jail does not accept mail directly. Letters go through TextBehind, addressed with the inmate's first and last name and LID (shown on the official roster), P.O. Box 247, Phoenix, MD 21131; they are scanned and delivered as copies. Legal mail is not handled by TextBehind. Reliance Telephone (800-896-3201) handles phone accounts and the texting and video wallet, and you can leave a voice message at 218-409-8366.",
        sourceLabel: "Official jail communication page",
        sourceUrl: "https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail/jail-communication"
      },
      {
        title: "Bail and court records",
        body: "The court sets bail. A family member can post it, or a bail agent can post it for a nonrefundable fee, usually 10 to 20 percent of the amount. Call the jail at 218-726-2345 to confirm the amount and how to pay. Property pickup also needs a call to that number first and a picture ID.",
        sourceLabel: "Official bail bonds page",
        sourceUrl: "https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail/bail-bonds"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at St. Louis County Jail?",
        answer:
          "Lobby kiosk visits at the jail in Duluth run Monday to Friday from 8 to 10 a.m., and Saturday and Sunday from 8 to 11 a.m. and 3 to 5 p.m. Register each visit 1 to 8 days in advance on the Reliance Telephone website."
      },
      {
        question: "How do I put money on an inmate's account in St. Louis County?",
        answer:
          "The jail uses Stellar Services for inmate accounts. Deposits pay off any fees the inmate owes first, and the rest can be used for commissary and phone time. Do not send money through the mail."
      },
      {
        question: "What is the mailing address for St. Louis County Jail?",
        answer:
          "Personal mail goes to TextBehind, not the jail: the inmate's first and last name and LID, P.O. Box 247, Phoenix, MD 21131. The LID is listed next to each name on the official jail roster. Mail sent straight to the jail is returned."
      },
      {
        question: "Why is someone on the St. Louis County roster but not on this page?",
        answer:
          "The county's roster also lists people it boards in other jails, such as Carlton County. This page shows only the people the roster places at the St. Louis County Jail in Duluth."
      }
    ]
  },
  "minnesota/crow-wing-county": {
    facilityName: "Crow Wing County Jail",
    address: "313 Laurel Street, Brainerd, MN 56401",
    phone: "218-822-7050",
    operatedBy: "Crow Wing County Sheriff's Office",
    reviewedAt: "October 6, 2026",
    overview:
      "The Crow Wing County Jail in Brainerd opened in 2007 and is licensed by the State of Minnesota for up to 276 men and women, in five direct-supervision housing units. Each unit has video visitation stations and phones, and the jail can be reached 24 hours a day.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.crowwing.gov/396/Jail",
    sections: [
      {
        title: "Visitation",
        body: "Visits are non-contact video visits through an NCIC account; requests are reviewed within 24 hours. Free visits from the lobby kiosks run 8 to 11 a.m., 1 to 4:30 p.m., and 6:30 to 10 p.m., up to two 25-minute visits per visitor per day. Visits from home cost $0.30 a minute and run 7 to 11 a.m., 1 to 4:30 p.m., and 6:30 to 10 p.m., including holidays. Inmates who have not been arraigned or moved to a housing unit cannot have visits.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.crowwing.gov/401/Visitation"
      },
      {
        title: "Money and commissary",
        body: "Money can be added to an inmate's trust account at the lobby kiosk (cash or card, 24 hours a day), online through Inmate Canteen, or by mailing a money order or cashier's check made out to the inmate. Personal checks are not accepted. Commissary orders are processed on Tuesdays and Saturdays.",
        sourceLabel: "Official money page",
        sourceUrl: "https://www.crowwing.gov/400/Money"
      },
      {
        title: "Phone and mail",
        body: "Letters go by U.S. Mail to Crow Wing County Jail, the inmate's full name, 313 Laurel Street, Brainerd, MN 56401, with a complete return address. Mail with drawings, stickers, glitter, copied games, blank paper, stamps, or Polaroids is held in the inmate's property. Inmates can also be reached by text on their jail-issued tablets through NCIC.",
        sourceLabel: "Official inmate mail page",
        sourceUrl: "https://www.crowwing.gov/399/Inmate-Mail"
      },
      {
        title: "Bail and court records",
        body: "Bail up to $1,000 can be posted online through Inmate Canteen. Cash bail can be paid at the jail lobby kiosk or at Court Administration, 213 Laurel St, Suite 11, Brainerd (218-824-1310), which also handles court dates. Card payments through Inmate Canteen carry a transaction fee.",
        sourceLabel: "Official money page",
        sourceUrl: "https://www.crowwing.gov/400/Money"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Crow Wing County Jail?",
        answer:
          "Free video visits from the jail lobby kiosks run 8 to 11 a.m., 1 to 4:30 p.m., and 6:30 to 10 p.m. Visits from home through NCIC run 7 to 11 a.m., 1 to 4:30 p.m., and 6:30 to 10 p.m. and cost $0.30 a minute. Set up and get approval for your NCIC account first, which can take 24 hours."
      },
      {
        question: "How do I put money on an inmate's account in Crow Wing County?",
        answer:
          "Use the kiosk in the jail lobby in Brainerd (cash or card, open 24 hours), deposit online through Inmate Canteen, or mail a money order or cashier's check made out to the inmate. Personal checks are not accepted."
      },
      {
        question: "What is the mailing address for Crow Wing County Jail?",
        answer:
          "Write Crow Wing County Jail, then the inmate's full name, then 313 Laurel Street, Brainerd, MN 56401. Mail must come through the U.S. Postal Service with a full return address."
      },
      {
        question: "How do I post bail at Crow Wing County Jail?",
        answer:
          "Bail of up to $1,000 can be paid online through Inmate Canteen. Cash bail is paid at the jail lobby kiosk or at Court Administration, 213 Laurel St, Suite 11, Brainerd. Call the jail at 218-822-7050 to confirm the amount."
      }
    ]
  },
  "minnesota/renville-county": {
    facilityName: "Renville County Jail",
    address: "104 4th Street S., Olivia, MN 56277",
    phone: "320-523-3600",
    operatedBy: "Renville County Sheriff's Office",
    reviewedAt: "October 6, 2026",
    overview:
      "The Renville County Jail in Olivia opened in 2008 and has 72 beds. Anyone arrested in Renville County is held here, whether the arrest was made by the Sheriff's Office or a city police department. The jail also holds federal inmates, who appear on the official list as Federal Inmate.",
    contactSourceLabel: "Official sheriff contact page",
    contactSourceUrl: "https://www.renvillecountymn.gov/sheriff/contact-us/",
    sections: [
      {
        title: "Visitation",
        body: "There are no in-person visits right now; visits are by video unless the jail approves otherwise. Video visits run Saturday through Thursday, 1 to 3 p.m. and 7 to 9 p.m., and last 20 minutes. Bring a photo ID showing your name and current address and be ready to state your relationship to the inmate. Visitors under 18 need an adult with them. Dispatch starts each visit, so expect delays during busy call times.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.renvillecountymn.gov/sheriff/divisions/jail/"
      },
      {
        title: "Money and commissary",
        body: "Money for an inmate's account can be dropped off at the jail's public entrance, or mailed as a money order made out to the inmate to Renville County Jail, C/O the inmate's name, 104 4th Street S., Olivia, MN 56277. Do not mail cash. Phone and text funds are added separately through Reliance Telephone.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.renvillecountymn.gov/sheriff/divisions/jail/"
      },
      {
        title: "Phone and mail",
        body: "Inmates can only make outgoing calls, so you cannot call someone in the jail. You can leave a voicemail at 320-400-3018. Address letters to the inmate's full name, C/O Renville County Jail, 104 4th Street S., Olivia, MN 56277. All mail is searched; letters from attorneys and courts are opened in front of the inmate. Letters with stickers, stamps, or perfume are not delivered.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.renvillecountymn.gov/sheriff/divisions/jail/"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office does not post bail instructions online. Call the jail at 320-523-3600 for the amount and how it can be paid. For court dates and case questions, Court Administration at the Renville County Courthouse in Olivia is at 320-523-3680.",
        sourceLabel: "Official county directory",
        sourceUrl: "https://www.renvillecountymn.gov/directory-page/"
      }
    ],
    faq: [
      {
        question: "When are visiting hours at Renville County Jail?",
        answer:
          "Video visits run Saturday through Thursday from 1 to 3 p.m. and 7 to 9 p.m. Each visit lasts 20 minutes, and there are no visits on Friday evening. Inmates who have not been arraigned can only see immediate family, at the next scheduled visiting time."
      },
      {
        question: "How do I send money to an inmate in Renville County?",
        answer:
          "Drop it off at the jail's public entrance in Olivia, or mail a money order made out to the inmate to Renville County Jail, C/O the inmate's name, 104 4th Street S., Olivia, MN 56277. Money for calls and texts goes through Reliance Telephone."
      },
      {
        question: "Can I call someone in the Renville County Jail?",
        answer:
          "No. Inmates can only call out, using calling cards bought through commissary. You can leave a voicemail they can check by calling 320-400-3018. Staff pass on messages only for real emergencies, such as a death in the family, through 320-523-3600."
      },
      {
        question: "Why do many people on the list show Federal Inmate?",
        answer:
          "The Renville County Jail also holds people for federal authorities. The official list labels them Federal Inmate instead of giving a Minnesota statute, and this page shows the same label."
      }
    ]
  },
  "minnesota/steele-county": {
    facilityName: "Steele County Detention Center",
    address: "2500 Alexander Street SW, Owatonna, MN 55060",
    phone: "507-446-7000",
    operatedBy: "Steele County Sheriff's Office",
    reviewedAt: "October 5, 2026",
    overview:
      "The Steele County Detention Center in Owatonna opened in October 2003 and is the county's fourth jail. It has a rated capacity of 154 beds and holds men and women, both before and after sentencing, along with detainees from other counties and from state and federal agencies. It is staffed 24 hours a day.",
    contactSourceLabel: "Official Detention Center page",
    contactSourceUrl: "https://steelecountymn.gov/departments/detention_center/index.php",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video; there is no face-to-face contact. Lobby visits are free, Monday through Sunday from 12:30 to 4 p.m. and 7:30 to 10 p.m., with up to two 20-minute visits per detainee per day. Visits from home run 8 a.m. to 10 p.m. outside lockdown times and cost 39 cents a minute by credit card. Accounts are created through TurnKey's Inmate Canteen site and can take up to 24 hours to be approved.",
        sourceLabel: "Official inmate visiting page",
        sourceUrl:
          "https://steelecountymn.gov/departments/detention_center/communicating_with_an_inmate/inmate_visiting.php"
      },
      {
        title: "Money and commissary",
        body: "Money can be added with cash or a credit card at the lobby kiosk, online through TurnKey's Inmate Canteen site, or by mailing cash to the facility, which staff deposit into the detainee's account. Personal checks, cashier's checks, and unapproved money orders that arrive by mail go into the detainee's property instead.",
        sourceLabel: "Official inmate funds page",
        sourceUrl: "https://steelecountymn.gov/departments/detention_center/inmate_funds.php"
      },
      {
        title: "Phone and mail",
        body: "Mail goes to the detainee at 2500 Alexander St SW, Owatonna, MN 55060. It is inspected, handed out Tuesday through Saturday, and refused if it is scented, written in crayon or marker, or marked on the envelope. Calls cost 21 cents a minute from the detainee's account, and messages cost 13 to 25 cents each through Inmate Canteen.",
        sourceLabel: "Official inmate mail page",
        sourceUrl:
          "https://steelecountymn.gov/departments/detention_center/communicating_with_an_inmate/inmate_mail.php"
      },
      {
        title: "Bail and court records",
        body: "The Detention Center does not post bail instructions online, so call 507-446-7000 (staffed 24 hours) for the amount and how to pay. For court dates and case questions, Steele County District Court lists 507-686-7012. Detainees arraigned on new charges are usually released between 2:30 and 4 p.m.; sentenced detainees between 6 and 8 a.m.",
        sourceLabel: "Official detainee release times page",
        sourceUrl:
          "https://steelecountymn.gov/departments/detention_center/detainee_release_times.php"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Steele County Jail?",
        answer:
          "Free lobby video visits run every day from 12:30 to 4 p.m. and 7:30 to 10 p.m. Visits from home run 8 a.m. to 10 p.m. outside lockdown times and cost 39 cents a minute. Set up an account on TurnKey's Inmate Canteen site at least a day ahead, because approval can take 24 hours."
      },
      {
        question: "How do I put money on an inmate's account in Steele County?",
        answer:
          "Use the cash and card kiosk in the Detention Center lobby, deposit online through TurnKey's Inmate Canteen site, or mail cash to the facility. Do not mail personal checks; they go into the detainee's property, not their account."
      },
      {
        question: "What is the mailing address for Steele County Detention Center?",
        answer:
          "Address mail to the detainee at 2500 Alexander St SW, Owatonna, MN 55060. Incoming mail is handed out Tuesday through Saturday, and anything scented or written in crayon or marker is refused."
      },
      {
        question: "When are people released from Steele County Jail?",
        answer:
          "Sentenced detainees are usually released between 6 and 8 a.m. People arraigned on new charges are usually released between 2:30 and 4 p.m. Call 507-446-7000 to confirm."
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
  "arkansas/hot-spring-county": {
    facilityName: "Hot Spring County Detention Center",
    address: "1 Detention Lane, Malvern, AR 72104",
    phone: "501-332-7410",
    operatedBy: "Hot Spring County Sheriff's Office",
    reviewedAt: "October 6, 2026",
    overview:
      "The Hot Spring County Detention Center in Malvern opened in March 2009 and is run by the Hot Spring County Sheriff's Office. The county seat is Malvern. The city of Hot Springs is not part of Hot Spring County; it is in neighboring Garland County, a separate jurisdiction.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.hotspringcountysoar.gov/jail",
    sections: [
      {
        title: "Visitation",
        body: "The Sheriff's Office does not post visiting days, hours, or visit rules online. Call the detention center at 501-332-7410 before you go to ask whether visits are on site or by video and when the next one can be scheduled.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.hotspringcountysoar.gov/jail"
      },
      {
        title: "Money and commissary",
        body: "Commissary money is added online through City Tele-Coin, using its Commissary Deposit option. The jail page lists no other deposit method, so call 501-332-7410 before bringing cash or a money order to the building.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.hotspringcountysoar.gov/jail"
      },
      {
        title: "Phone and mail",
        body: "The detention center is at 1 Detention Lane, Malvern, AR 72104, and the jail's phone is 501-332-7410. The Sheriff's Office does not publish its letter rules or how inmates make calls, so check with the jail before mailing anything other than a plain letter.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.hotspringcountysoar.gov/jail"
      },
      {
        title: "Bail and court records",
        body: "Bond amounts appear on the official roster, but the Sheriff's Office does not post how to pay a bond; call the jail at 501-332-7410. Misdemeanor and traffic cases go through District Court, 305 Locust St., Suite 3, Malvern (501-332-7604). Felony fines on cases numbered 30CR are paid to the Sheriff's Office at 215 E. Highland Ave., Malvern, in cash, card, money order, or cashier's check.",
        sourceLabel: "Official FAQ and fines pages",
        sourceUrl: "https://www.hotspringcountysoar.gov/faq"
      }
    ],
    faq: [
      {
        question: "Is Hot Spring County Jail in Hot Springs?",
        answer:
          "No. The Hot Spring County Detention Center is in Malvern, at 1 Detention Lane. The city of Hot Springs is in Garland County, which this Sheriff's Office does not serve."
      },
      {
        question: "How do I put money on an inmate's account in Hot Spring County?",
        answer:
          "Use City Tele-Coin and choose Commissary Deposit. That is the only method listed on the jail's official page; call 501-332-7410 to ask about any other way."
      },
      {
        question: "How do I find out an inmate's bond in Hot Spring County?",
        answer:
          "The Sheriff's Office's own roster lists a bond amount for each person. To confirm the amount or ask how to post it, call the detention center at 501-332-7410."
      },
      {
        question: "Where do I pay a Hot Spring County fine?",
        answer:
          "Felony fines on 30CR cases are paid at the Sheriff's Office, 215 E. Highland Ave., Malvern, by mail, in person, or online; personal checks are not accepted. Misdemeanor and traffic fines go to District Court at 305 Locust St., Suite 3 (501-332-7604)."
      }
    ]
  },
  "arkansas/baxter-county": {
    facilityName: "Baxter County Detention Center",
    address: "904 Hwy 62 W., Mountain Home, AR 72653",
    phone: "870-425-7000",
    operatedBy: "Baxter County Sheriff's Office",
    reviewedAt: "October 7, 2026",
    overview:
      "Everyone arrested in Baxter County is booked into the Sheriff's Office detention center in Mountain Home, which has separate housing for low- and medium-risk men, high-risk men, and women. It holds people awaiting trial and people serving sentences or waiting to go to the Arkansas Department of Corrections; in 2025 it booked 2,008 people, with a daily count between 83 and 131.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.baxtercountysheriff.com/jail",
    sections: [
      {
        title: "Visitation",
        body: "Visiting days depend on the inmate: men with last names A-I on Tuesdays, J-R on Wednesdays, and S-Z on Saturdays; all women on Fridays. Each visiting day has three sessions: 7 to 9:30 a.m., 1 to 4 p.m., and 6:30 to 9:30 p.m. There are no visits on Sunday, Monday, or Thursday. Bring a government photo ID; children 6 and under cannot visit, visitors 7 to 17 need an adult, and no more than two people can see an inmate at once.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.baxtercountysheriff.com/faq"
      },
      {
        title: "Money and commissary",
        body: "Commissary money is added at the kiosk in the detention center's main lobby, which is open at all hours, including nights, weekends, and holidays. Follow the touch-screen prompts to pick the inmate. Credit and debit cards are not accepted for commissary at this time.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.baxtercountysheriff.com/faq"
      },
      {
        title: "Phone and mail",
        body: "The Sheriff's Office is at 904 Hwy 62 W., Mountain Home, AR 72653, and its main line, 870-425-7000, is answered 24 hours a day. The office does not post letter rules or inmate phone instructions online, so call before mailing anything to someone in the jail. Phones and cameras are not allowed in the visiting room.",
        sourceLabel: "Official contact page",
        sourceUrl: "https://www.baxtercountysheriff.com/contact-us"
      },
      {
        title: "Bail and court records",
        body: "Bond can be posted in cash or through a licensed bail bonding company; the Sheriff's Office does not accept so-called Sheriff's Bonds, generally does not accept property bonds, and staff cannot recommend a bondsman. A warrant usually lists its bond amount, though some are No Bond and the person waits to see a judge. Call 870-425-7000 to ask about a warrant's charge, bond, and issuing court.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.baxtercountysheriff.com/faq"
      }
    ],
    faq: [
      {
        question: "When can I visit someone in the Baxter County jail?",
        answer:
          "It depends on the inmate's last name and sex: men A-I on Tuesdays, J-R on Wednesdays, S-Z on Saturdays, and all women on Fridays, in sessions at 7 to 9:30 a.m., 1 to 4 p.m., and 6:30 to 9:30 p.m. There are no visits on Sunday, Monday, or Thursday."
      },
      {
        question: "How do I put money on an inmate's account in Baxter County?",
        answer:
          "Use the commissary kiosk in the main lobby of the detention center in Mountain Home. It is available at all hours, but it does not take credit or debit cards."
      },
      {
        question: "Who cannot visit an inmate at Baxter County Detention Center?",
        answer:
          "Children 6 and under, anyone without a government photo ID, people awaiting court on felony charges, and anyone with a protection or no-contact order involving the inmate. A visitor with a felony conviction may visit only immediate family, with advance approval from the jail administrator."
      },
      {
        question: "How is bond posted in Baxter County?",
        answer:
          "In cash, or as a surety bond through a licensed bail bonding company. The Sheriff's Office does not take Sheriff's Bonds and generally does not accept property bonds or release on recognizance. Call 870-425-7000 for a specific bond amount."
      }
    ]
  },
  "arkansas/st-francis-county": {
    facilityName: "St. Francis County Detention Center",
    address: "2124 South Washington, Forrest City, AR",
    phone: "870-633-2611",
    operatedBy: "St. Francis County Sheriff's Office",
    reviewedAt: "October 7, 2026",
    overview:
      "The St. Francis County Detention Center in Forrest City is a long-term jail built for 144 people: 124 men and 20 women. Besides county detainees, it holds Arkansas state prisoners waiting for a prison bed and federal inmates awaiting extradition. Some people held on misdemeanors work off their fines cleaning county roadways.",
    contactSourceLabel: "Official detention center page",
    contactSourceUrl: "https://www.stfranciscountysheriff.org/detention-center",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video and run Monday through Friday, 8 a.m. to 4 p.m., at the detention center at 2124 South Washington in Forrest City. There are no posted weekend visiting hours, even though the building is open seven days a week. Call 870-633-2611 before you go to confirm the person can have visits.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.stfranciscountysheriff.org/detention-center"
      },
      {
        title: "Money and commissary",
        body: "Money for commissary is put on an inmate's books at the detention center, Monday through Friday from 8 a.m. to 4 p.m., the same hours as video visits. The Sheriff's Office does not list an online deposit service, so call 870-633-2611 to ask what forms of payment the window takes.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.stfranciscountysheriff.org/detention-center"
      },
      {
        title: "Phone and mail",
        body: "Mail for inmates goes to P.O. Box 1817, Forrest City, AR 72335, with the inmate's full name. The Sheriff's Office does not post letter rules or how inmates make calls, so check with the jail before sending anything other than a plain letter. The jail's line, 870-633-2611, is answered 24 hours a day.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.stfranciscountysheriff.org/detention-center"
      },
      {
        title: "Bail and court records",
        body: "When a warrant lists a bond, the Sheriff's Office takes it in cash or as a surety bond from a licensed bail bonding company; it generally does not accept property bonds or release on recognizance. Some warrants are No Bond, and the person stays in custody until seeing a judge. District Court is at 615 East Cross in Forrest City.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.stfranciscountysheriff.org/faq"
      }
    ],
    faq: [
      {
        question: "When can I visit someone in the St. Francis County jail?",
        answer:
          "Video visits run Monday through Friday from 8 a.m. to 4 p.m. at the detention center in Forrest City. No weekend visiting hours are posted."
      },
      {
        question: "How do I put money on an inmate's books in St. Francis County?",
        answer:
          "Go to the detention center at 2124 South Washington in Forrest City, Monday through Friday between 8 a.m. and 4 p.m. Call 870-633-2611 first to ask which payment types are accepted."
      },
      {
        question: "What is the mailing address for St. Francis County jail?",
        answer: "Write the inmate's full name, then P.O. Box 1817, Forrest City, AR 72335."
      },
      {
        question: "Why are there state and federal inmates in the St. Francis County jail?",
        answer:
          "The detention center holds Arkansas state prisoners who are waiting for space in a state prison, and federal inmates who are waiting to be extradited to other states, along with people held on county charges."
      }
    ]
  },
  "arkansas/mississippi-county": {
    facilityName: "Mississippi County Detention Center",
    address: "685 North County Road 599, Luxora, AR 72358",
    phone: "870-658-2242",
    operatedBy: "Mississippi County Sheriff's Office",
    reviewedAt: "October 7, 2026",
    overview:
      "Mississippi County has two county seats, Blytheville and Osceola, but its Sheriff's Office and detention center are in Luxora, at 685 North County Road 599. The office answers 870-658-2242 and 870-762-2243 around the clock.",
    contactSourceLabel: "Official FAQ page",
    contactSourceUrl: "https://www.mississippicountysheriffar.org/faqs",
    sections: [
      {
        title: "Visitation",
        body: "Men visit from 8:30 to 11:30 a.m. (sign in by 11): last names A-M on Saturdays, N-Z on Sundays. Women visit from 1 to 2 p.m. (sign in by 1:30) on either Saturday or Sunday. Visits last 30 minutes, with no more than two visitors per detainee. Visitors must be over 18 and bring a photo ID, and cell phones are not allowed in the visiting booths.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.mississippicountysheriffar.org/faqs"
      },
      {
        title: "Money and commissary",
        body: "There are three ways to add money: the Tiger Commissary kiosk at the end of the visitation lobby (cash or card), online through Tiger Deposits by card, or a money order made out to the detainee and mailed to the detainee's name at 685 NCR 599, Luxora, AR 72358. Do not put letters or cards in with a money order; the whole envelope is returned unopened.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.mississippicountysheriffar.org/faqs"
      },
      {
        title: "Phone and mail",
        body: "Letters do not go to the jail. Send them through Smart Inmate, or by post to the detainee's name and inmate ID number, c/o Smart Communications - Mississippi County Detention Center, 1490 Union Ave #606, Memphis, TN 38104. Only legal mail and money orders go to the Luxora address. Mail for someone already released is returned, not forwarded.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.mississippicountysheriffar.org/faqs"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office charges a $20 fee, set by state law, for taking and entering each bail bond, and accepts cash, money orders, and credit or debit cards (cards carry a 2.49% fee). Call 870-658-2242 for the bond amount on a specific charge. Property left behind after release can be picked up Monday through Friday, 8:30 a.m. to 3:30 p.m., with a photo ID.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.mississippicountysheriffar.org/faqs"
      }
    ],
    faq: [
      {
        question: "When are visiting hours at Mississippi County Detention Center?",
        answer:
          "Men visit 8:30 to 11:30 a.m., on Saturday if their last name starts with A-M and Sunday for N-Z. Women visit 1 to 2 p.m. on Saturday or Sunday. Visits are 30 minutes, visitors must be over 18 with a photo ID, and no more than two people can visit at once."
      },
      {
        question: "Where do I send a letter to someone in the Mississippi County jail?",
        answer:
          "Not to the jail. Address it to the detainee's name and inmate ID number, c/o Smart Communications - Mississippi County Detention Center, 1490 Union Ave #606, Memphis, TN 38104, or send it electronically through Smart Inmate."
      },
      {
        question: "How do I put money on a detainee's account in Mississippi County?",
        answer:
          "Use the Tiger Commissary kiosk in the visitation lobby, deposit online through Tiger Deposits, or mail a money order made out to the detainee to 685 NCR 599, Luxora, AR 72358, with nothing else in the envelope."
      },
      {
        question: "Is the Mississippi County jail in Blytheville or Osceola?",
        answer:
          "Neither. The county has two seats, Blytheville and Osceola, but the Sheriff's Office and detention center are in Luxora, at 685 North County Road 599."
      }
    ]
  },
  "arkansas/randolph-county": {
    facilityName: "Randolph County Detention Center",
    address: "1510 Pace Road, Pocahontas, AR 72455",
    phone: "870-892-8888",
    operatedBy: "Randolph County Sheriff's Office",
    reviewedAt: "October 8, 2026",
    overview:
      "The Randolph County Sheriff's Office and Detention Center share a building at 1510 Pace Road in Pocahontas, and the office answers 870-892-8888 around the clock. Since May 2025, inmates have used wall phones and handheld tablets from NCIC Inmate Communications for calls, video visits, messages, and education programs.",
    contactSourceLabel: "Official FAQ page",
    contactSourceUrl: "https://www.randolphcountysheriff.org/faqs",
    sections: [
      {
        title: "Visitation",
        body: "Families can video visit from home through a prepaid NCIC account, at $0.30 a minute; set one up at ncic.com or by calling 1-800-943-2189. The Sheriff's Office does not post on-site visiting hours, so call 870-892-8888 to ask whether in-person visits are available.",
        sourceLabel: "Official jail communications page",
        sourceUrl: "https://www.randolphcountysheriff.org/jail-communications"
      },
      {
        title: "Money and commissary",
        body: "Money for calls, video visits, and messages goes on a prepaid NCIC account, which can be funded online or by phone at any hour. The Sheriff's Office does not post how to put money on an inmate's commissary account, so call the jail at 870-892-8888 before bringing or mailing funds.",
        sourceLabel: "Official jail communications page",
        sourceUrl: "https://www.randolphcountysheriff.org/jail-communications"
      },
      {
        title: "Phone and mail",
        body: "Inmates cannot receive calls, only voicemail; their calls cost $0.20 a minute in the U.S., and three-way calls are not allowed. Letters go to the inmate's name and inmate number, Randolph County Detention Center AR, PO Box 591, Longview, TX 75606, where they are scanned to the inmate's tablet and destroyed. Keep letters to 5 pages, one side, letter size, with no more than one photo. Legal mail goes to 1510 Pace Road, Pocahontas, AR 72455.",
        sourceLabel: "Official inmate mail guidelines",
        sourceUrl: "https://www.randolphcountysheriff.org/jail-communications"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office does not post bond instructions online. Call 870-892-8888, answered 24 hours a day, for the bond amount and how it can be paid. For child-support body attachments, the order itself may list a cash amount that secures release; others require seeing the judge first.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.randolphcountysheriff.org/faqs"
      }
    ],
    faq: [
      {
        question: "Where do I send a letter to someone in the Randolph County jail?",
        answer:
          "To the inmate's name and inmate number, Randolph County Detention Center AR, PO Box 591, Longview, TX 75606. Letters are scanned and delivered to the inmate's tablet, and the paper is destroyed, so do not send originals you want back."
      },
      {
        question: "Can I video visit an inmate in Randolph County from home?",
        answer:
          "Yes. Set up a prepaid NCIC account at ncic.com or by calling 1-800-943-2189. Video visits cost $0.30 a minute, and the same account pays for calls and messages."
      },
      {
        question: "Can I call someone in the Randolph County Detention Center?",
        answer:
          "No. Inmates can only make outgoing calls, but you can leave voicemail for approved inmates through NCIC. Calls within the U.S. cost $0.20 a minute."
      },
      {
        question: "What are the mail rules at Randolph County Detention Center?",
        answer:
          "Each envelope needs the inmate's name, inmate number, and a return address. Letters can be up to 5 pages, letter size, written on one side only, with at most one photo; more than one photo and the whole letter is returned. Magazines, newspapers, and books are not accepted at the Longview address."
      }
    ]
  },
  "oklahoma/wagoner-county": {
    facilityName: "Wagoner County Detention Center",
    address: "307 E. Cherokee St., Wagoner, OK 74467",
    phone: "918-485-7730",
    operatedBy: "Wagoner County Sheriff's Office",
    reviewedAt: "October 9, 2026",
    overview:
      "The Wagoner County Sheriff's Office runs the county jail at 307 E. Cherokee St. in Wagoner, in the same building as the Sheriff's Office. The jail line is 918-485-7730, and the Sheriff's Office main line, 918-485-3124, is answered 24 hours a day. The jail passed its 2024 Health Department inspection with no infractions.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.wagonercountyso.org/jail",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video through Cidnet, the same service used for inmate phone calls. Create a Cidnet account to set up visits and add funds. Visitors must be 18 or older unless a parent or legal guardian is present, and every visit is monitored and recorded. The jail can end a visit at any time, and visiting privileges can be suspended for rule violations.",
        sourceLabel: "Official visitation and mail page",
        sourceUrl: "https://www.wagonercountyso.org/visitation-mail-policies"
      },
      {
        title: "Money and commissary",
        body: "Each inmate has a commissary account through Tiger Commissary, and family can add money or order commissary online. Weekly commissary orders are placed on Thursday and must be in by 8 a.m. that day. Money for calls and video visits goes on a Cidnet account instead.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.wagonercountyso.org/commissary-web-deposits"
      },
      {
        title: "Phone and mail",
        body: "Address letters to the inmate's name, c/o Wagoner County Detention Center, 307 E Cherokee, Wagoner OK 74467, with your first and last name and return address, or the letter comes back. All mail is opened and checked. Only items that can be scanned are processed: no newspapers, magazines, Polaroids, stamps, envelopes, blank paper, or musical cards, and no more than 3 to 5 photos per letter. Inmate phone calls also run through Cidnet.",
        sourceLabel: "Official visitation and mail page",
        sourceUrl: "https://www.wagonercountyso.org/visitation-mail-policies"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office keeps a list of registered bail bondsmen in the Wagoner County area. A bond must be filled in and notarized correctly and carry the case number once a case is filed; the court clerk will not accept one that is not, and the person can be re-arrested. Call the jail at 918-485-7730 for the bond amount on a specific booking.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://www.wagonercountyso.org/bondsmen"
      }
    ],
    faq: [
      {
        question: "How do I visit an inmate at the Wagoner County jail?",
        answer:
          "Visits are by video through Cidnet. Set up a Cidnet account and add funds; visits are managed from there. Visitors under 18 need a parent or legal guardian with them, and all visits are recorded."
      },
      {
        question: "What is the mailing address for the Wagoner County jail?",
        answer:
          "Write the inmate's name, then c/o Wagoner County Detention Center, 307 E Cherokee, Wagoner OK 74467. Put your full name and return address on the envelope, and send only paper that can be scanned."
      },
      {
        question: "How do I put money on an inmate's account in Wagoner County?",
        answer:
          "Deposit online through Tiger Commissary, which also takes commissary orders. Orders are placed each Thursday, with an 8 a.m. cutoff. Calls and video visits are paid through a separate Cidnet account."
      },
      {
        question: "Why was a bond refused in Wagoner County?",
        answer:
          "Bonds that are not filled in or notarized correctly, or that lack a case number once a case is filed, are not accepted by the court clerk, and the person can be re-arrested. Bondsmen are responsible for their own paperwork."
      }
    ]
  },
  "oklahoma/lincoln-county": {
    facilityName: "Lincoln County Detention Center",
    address: "811 Manvel Ave., Chandler, OK 74834",
    phone: "405-258-1191",
    operatedBy: "Lincoln County Sheriff's Office",
    reviewedAt: "October 9, 2026",
    overview:
      "The Lincoln County Sheriff's Office runs the county detention center in Chandler; its office is at 811 Manvel Ave., Suite 14, and the jail's lobby kiosk is where deposits are made in person. The main line, 405-258-1191, handles jail questions, visit scheduling problems, and records requests.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://lincolncountysheriffok.gov/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "Visits run through Prodigy. Remote video visits are available from 6 a.m. to 10 p.m. On-site visits must be scheduled 24 hours ahead and last 20 minutes, up to two a day per inmate, any day of the week; limited Saturday kiosk visits in the detention center lobby are kept for families without internet access. Up to three visitors, counting children, with a government photo ID; visitors under 18 must come with a parent. Visits are recorded.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://lincolncountysheriffok.gov/visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary is run by Prodigy Solutions. Funds can be added in person at the jail from 8:30 a.m. to 4:30 p.m., Monday to Friday, at the lobby kiosk with cash or a card, or by bringing a money order made out to the inmate. Phone money goes on a separate prepaid collect or PIN debit account; PIN debit funds belong to the inmate and are not refunded.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://lincolncountysheriffok.gov/commissary"
      },
      {
        title: "Phone and mail",
        body: "Inmates call out from phones inside the jail, either collect to a prepaid account in your name or from their own PIN debit account. Set up an account through Prodigy at 866-797-5578 (8 a.m. to 8 p.m. weekdays, 2 to 6 p.m. Saturdays) or with cash or a card at the lobby kiosk. The Sheriff's Office does not post letter rules online, so call 405-258-1191 before mailing anything to an inmate.",
        sourceLabel: "Official visitation and phones page",
        sourceUrl: "https://lincolncountysheriffok.gov/visitation"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office does not post bond instructions online. Call the main line at 405-258-1191 for the bond amount on a booking and how it can be posted.",
        sourceLabel: "Official contact page",
        sourceUrl: "https://lincolncountysheriffok.gov/contact-us"
      }
    ],
    faq: [
      {
        question: "How do I schedule a visit at the Lincoln County jail?",
        answer:
          "Set up a Prodigy account. Remote video visits run 6 a.m. to 10 p.m.; on-site visits must be scheduled at least 24 hours ahead and last 20 minutes, up to two a day. If scheduling fails, call the detention center at 405-258-1191."
      },
      {
        question: "How do I put money on an inmate's account in Lincoln County?",
        answer:
          "Come to the jail in Chandler between 8:30 a.m. and 4:30 p.m. on a weekday and use the lobby kiosk (cash or card), or bring a money order made out to the inmate."
      },
      {
        question: "Who can visit an inmate at the Lincoln County Detention Center?",
        answer:
          "Up to three visitors at a time, including children, each adult with a state or federal photo ID. Visitors under 18 must be with a biological parent. Anyone with a protection or no-contact order involving the inmate cannot visit."
      },
      {
        question: "Can I call an inmate at the Lincoln County jail?",
        answer:
          "No; inmates call out. Fund a prepaid collect account in your name through Prodigy (866-797-5578) so their calls to you go through, or add money to their PIN debit account."
      }
    ]
  },
  "oklahoma/pawnee-county": {
    facilityName: "Pawnee County Jail",
    address: "500 Harrison Street, Pawnee, OK 74058",
    phone: "918-762-2565, ext. 2",
    operatedBy: "Pawnee County Sheriff's Office",
    reviewedAt: "October 10, 2026",
    overview:
      "The Pawnee County Sheriff's Office runs the county jail from its office at 500 Harrison Street in Pawnee. The main line, 918-762-2565, is answered around the clock by dispatch; the jail is extension 2. Administration keeps weekday hours, 8:30 a.m. to 4:30 p.m.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.pawneecountysook.gov/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "Visits run through Prodigy. Set up a Prodigy account and fund it first. Remote video visits are available daily from 6 a.m. to 11 p.m., except 1:30 to 3:30 p.m. on Tuesdays and Thursdays. On-site visits use the Prodigy kiosk in the jail's visitation room, 8:30 a.m. to 4:15 p.m., Monday to Friday. Visitors under 18 need a parent or legal guardian with them. There is a dress code: no mini-skirts, halter tops, short shorts, see-through clothing, or swimwear. Anyone released from this jail cannot visit for six months.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.pawneecountysook.gov/visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary is handled by CTC Commissary. Web deposits go to the inmate's trust fund account, and commissary can also be ordered online and shipped to the inmate; orders placed by Thursday at midnight are delivered the following Tuesday. Cash or a card can be used at the Tiger kiosk in the lobby. Money orders are not accepted. Money left on the account at release goes only to the inmate.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.pawneecountysook.gov/commissary"
      },
      {
        title: "Phone and mail",
        body: "Letters go through the U.S. Postal Service with the inmate's full name and ID number clearly printed on the envelope. Do not send cash or anything the jail treats as contraband. Video calls come through Prodigy as a text message with a link to join. The Sheriff's Office does not post phone account rules online, so call the jail at 918-762-2565, ext. 2.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.pawneecountysook.gov/faqs"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office does not post bond instructions online. Call the jail at 918-762-2565, ext. 2 for the bond on a booking and how to post it. Reports and other records come from the Records Division; copies cost $1 for the first page and 50 cents for each page after.",
        sourceLabel: "Official records page",
        sourceUrl: "https://www.pawneecountysook.gov/records"
      }
    ],
    faq: [
      {
        question: "When can I visit someone in the Pawnee County jail?",
        answer:
          "Remote video visits through Prodigy run 6 a.m. to 11 p.m. every day, except 1:30 to 3:30 p.m. on Tuesdays and Thursdays. Visits at the jail's Prodigy kiosk are 8:30 a.m. to 4:15 p.m., Monday to Friday."
      },
      {
        question: "Can I mail a money order to an inmate in Pawnee County?",
        answer:
          "No. The jail does not accept money orders. Use a CTC web deposit, or pay with cash or a card at the Tiger kiosk in the lobby."
      },
      {
        question: "How do I address a letter to a Pawnee County inmate?",
        answer:
          "Send it by U.S. mail with the inmate's full name and ID number clearly printed on the envelope. Leave out cash and anything the jail would treat as contraband."
      },
      {
        question: "How often is the Pawnee County inmate search updated?",
        answer:
          "The Sheriff's Office says its inmate search is updated hourly and shows only people in custody. This page reads that list twice a day, so check the capture time at the top of the roster."
      }
    ]
  },
  "texas/burleson-county": {
    facilityName: "Burleson County Jail",
    address: "1334 State Highway 21 East, Caldwell, TX 77836",
    phone: "979-567-4343",
    operatedBy: "Burleson County Sheriff's Office",
    reviewedAt: "October 10, 2026",
    overview:
      "The Burleson County Sheriff's Office runs the county jail at 1334 State Highway 21 East in Caldwell. The jail is overseen by a jail administrator and a jail lieutenant, and the office's main line, 979-567-4343, handles jail questions. Its fax number is 979-567-0615.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.burlesoncountysherifftx.org/jail",
    sections: [
      {
        title: "Visitation",
        body: "In-person visits are held only on Thursdays and Sundays, 1 to 5 p.m. Every visit must be booked on HomeWAV at least 24 hours ahead, and the inmate has to accept the requested time. Each inmate gets one 20-minute visit, and all visitors must come to that same session. You can visit only one inmate per visiting day. Bring a current state photo ID, driver's license, or passport, and arrive before your time; late visitors are turned away. Children 16 and under must be the inmate's dependents and come with an adult. Only car keys and ID may be brought in. The dress code is strict, and shoulders must be covered. Anyone released from a jail or from TDCJ in the last six months cannot visit.",
        sourceLabel: "Official visitation and commissary page",
        sourceUrl: "https://www.burlesoncountysherifftx.org/visitation-and-commissary"
      },
      {
        title: "Money and commissary",
        body: "Commissary money is added through Tiger (tigersnack.com). Choose Texas, then Burleson County, then find the inmate. You can add money or order commissary for them there, and the commissary menu is posted on the Sheriff's site. Money orders have not been accepted since January 1, 2022.",
        sourceLabel: "Official visitation and commissary page",
        sourceUrl: "https://www.burlesoncountysherifftx.org/visitation-and-commissary"
      },
      {
        title: "Phone and mail",
        body: "Phone time can be added through HomeWAV, and inmates can also buy phone time from commissary. The Sheriff's Office does not post mail rules online, so call 979-567-4343 before you send a letter.",
        sourceLabel: "Official visitation and commissary page",
        sourceUrl: "https://www.burlesoncountysherifftx.org/visitation-and-commissary"
      },
      {
        title: "Bail and court records",
        body: "Bond labels appear on the roster as the Sheriff's Office lists them. For how to post a bond, call 979-567-4343. For records, fill out the Sheriff's Office open records form and mail, fax, or email it; every request has a fee, and the fees are listed on the form.",
        sourceLabel: "Official records request page",
        sourceUrl: "https://www.burlesoncountysherifftx.org/records-request"
      }
    ],
    faq: [
      {
        question: "When are visits at the Burleson County jail?",
        answer:
          "In-person visits are on Thursdays and Sundays from 1 to 5 p.m. Schedule the visit on HomeWAV at least 24 hours ahead; it only goes on the calendar once the inmate accepts it."
      },
      {
        question: "Can I send a money order to someone in the Burleson County jail?",
        answer:
          "No. The jail stopped accepting money orders on January 1, 2022. Add money through Tiger (tigersnack.com) under Texas, Burleson County."
      },
      {
        question: "What can I bring to a visit in Burleson County?",
        answer:
          "Only your car keys and ID. Purses, wallets, bags, phones and other electronics, pens, lighters, liquids, and food are all prohibited in the visiting area."
      },
      {
        question: "Can someone who was recently released visit an inmate?",
        answer:
          "No. Anyone released from a jail or from the Texas Department of Criminal Justice has to wait 180 days from their release date before visiting an inmate in the Burleson County Jail."
      }
    ]
  },
  "texas/upshur-county": {
    facilityName: "Upshur County Jail",
    address: "405 North Titus, Gilmer, TX 75644",
    phone: "903-843-2541",
    operatedBy: "Upshur County Sheriff's Office",
    reviewedAt: "November 1, 2026",
    overview:
      "The Upshur County Sheriff's Office runs the county jail from the Upshur County Justice Center in Gilmer. The Sheriff's Office answers at 903-843-2541, and office hours are 8 a.m. to 5 p.m. on weekdays.",
    contactSourceLabel: "Official Sheriff's Office page",
    contactSourceUrl: "https://www.countyofupshur.com/page/sheriff",
    sections: [
      {
        title: "Visitation",
        body: "The county site does not post visiting hours or rules for the jail. Call the Sheriff's Office at 903-843-2541 before you go.",
        sourceLabel: "Official Sheriff's Office page",
        sourceUrl: "https://www.countyofupshur.com/page/sheriff"
      },
      {
        title: "Money and commissary",
        body: "The county site does not explain how to put money on an inmate's account. Call the Sheriff's Office at 903-843-2541 to ask.",
        sourceLabel: "Official Sheriff's Office page",
        sourceUrl: "https://www.countyofupshur.com/page/sheriff"
      },
      {
        title: "Phone and mail",
        body: "Letters are scanned, not delivered on paper. Address them to the inmate's name and SO number, Upshur County Jail, P.O. Box 591, Longview, Texas 75606, with a return address. Pages must be no larger than 8.5 by 11 inches, five pages at most, writing on the front only, and one photo per letter, or the whole letter is sent back; mail sent to Longview is destroyed after scanning. Books, magazines, newspapers, legal mail, and medical mail go to the jail itself. Messages and photos can also be sent through an NCIC account (844-724-2076).",
        sourceLabel: "Official NCIC mail rules",
        sourceUrl:
          "https://www.countyofupshur.com/page/open/1390/0/NCIC%20Mail%20Rules%20Upshur%20County%20Tx.pdf"
      },
      {
        title: "Bail and court records",
        body: "The jail portal lists each charge or warrant with its bond, but the county site does not explain how to post bond. Call the Sheriff's Office at 903-843-2541 to ask. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official Sheriff's Office page",
        sourceUrl: "https://www.countyofupshur.com/page/sheriff"
      }
    ],
    faq: [
      {
        question: "Where do I send a letter to an Upshur County inmate?",
        answer:
          "Inmate's name and SO number, Upshur County Jail, P.O. Box 591, Longview, Texas 75606. Letters are scanned and delivered to the inmate electronically."
      },
      {
        question: "Can I send photos to an Upshur County inmate?",
        answer:
          "One photo per letter by mail, or photos through an NCIC messaging account. A letter with more than one photo is sent back."
      },
      {
        question: "How do I visit someone at the Upshur County Jail?",
        answer:
          "The county does not post visiting rules. Call the Sheriff's Office at 903-843-2541."
      },
      {
        question: "How do I find out about bond in Upshur County?",
        answer:
          "The roster shows each bond the portal lists. For how to post it, call the Sheriff's Office at 903-843-2541."
      }
    ]
  },
  "texas/robertson-county": {
    facilityName: "Robertson County Jail",
    address: "1006 W US Hwy 79, Franklin, TX 77856",
    phone: "979-828-3299",
    operatedBy: "Robertson County Sheriff's Office",
    reviewedAt: "October 23, 2026",
    overview:
      "The Robertson County Jail is run by the Sheriff's Office at 1006 W US Hwy 79 in Franklin. The Sheriff's Office answers 979-828-3299 around the clock, and jail questions can also go to jailinfo@robertsoncountysherifftx.org with \"Jail Info\" in the subject.",
    contactSourceLabel: "Official Jail Information page",
    contactSourceUrl: "https://www.robertsoncountysherifftx.org/jail-information",
    sections: [
      {
        title: "Visitation",
        body: "Women can be visited Wednesday and Sunday from 9 to 11 a.m., and men Wednesday and Sunday from 12:30 to 3:30 p.m. You must be on the inmate's visitor list, sign the visitation log on the counter, and you may be asked for photo ID. Each inmate gets one 20-minute visit per visiting day, which can be split among up to five approved visitors, one at a time. Nothing can be brought into the jail, including purses, packages, food, or drinks, and children must be kept under control.",
        sourceLabel: "Official Jail Information page",
        sourceUrl: "https://www.robertsoncountysherifftx.org/jail-information"
      },
      {
        title: "Money and commissary",
        body: "The jail no longer accepts money orders. Deposits and commissary orders go through Lone Star Commissary online (credit or debit card) or the kiosk in the Sheriff's Office front lobby. Over-the-counter medications are not accepted for inmates either.",
        sourceLabel: "Official Jail Information page",
        sourceUrl: "https://www.robertsoncountysherifftx.org/jail-information"
      },
      {
        title: "Phone and mail",
        body: "Mail other than legal or medical mail goes to Robertson County Jail, the inmate's name, SO#, PO Box 591, Longview, Texas 75606, where it is scanned and delivered to the inmate's kiosk; the originals are destroyed and never returned. Letters must fit 8.5 by 11 inches, run no more than 5 pages written on one side only, and hold at most one photo. Legal and medical mail goes to the jail itself. Messages and photos can also be sent through NCIC (ncic.com), and phone accounts are set up through NCIC Inmate Communications.",
        sourceLabel: "Official Jail Information page",
        sourceUrl: "https://www.robertsoncountysherifftx.org/jail-information"
      },
      {
        title: "Bail and court records",
        body: "The roster shows the bond listed for each booking. The Sheriff's Office does not post how bonds are paid, so call 979-828-3299 to ask. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official Jail Information page",
        sourceUrl: "https://www.robertsoncountysherifftx.org/jail-information"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Robertson County Jail?",
        answer:
          "Women: Wednesday and Sunday, 9 to 11 a.m. Men: Wednesday and Sunday, 12:30 to 3:30 p.m. You must be on the inmate's visitor list."
      },
      {
        question: "Where do I send mail to a Robertson County inmate?",
        answer:
          "Robertson County Jail, the inmate's name, SO#, PO Box 591, Longview, Texas 75606. Legal and medical mail goes to the jail instead."
      },
      {
        question: "How do I put money on a Robertson County inmate's account?",
        answer:
          "Through Lone Star Commissary online or the kiosk in the Sheriff's Office lobby. Money orders are no longer accepted."
      },
      {
        question: "How do I set up phone calls with a Robertson County inmate?",
        answer: "Create an account through NCIC Inmate Communications."
      }
    ]
  },
  "texas/angelina-county": {
    facilityName: "Angelina County Jail",
    address: "2311 E. Lufkin Ave., Lufkin, TX 75901",
    phone: "936-634-2724",
    operatedBy: "Angelina County Sheriff's Office",
    reviewedAt: "October 18, 2026",
    overview:
      "The Angelina County Sheriff's Office runs the county jail at 2311 E. Lufkin Ave. in Lufkin, which opened in 2003. It holds people charged with everything from Class C misdemeanors to capital murder. The jail division's main line is 936-634-2724, and the Sheriff's Office can be reached at 936-634-3331 or by mail at P.O. Box 114, Lufkin, TX 75902.",
    contactSourceLabel: "Official Sheriff's Office page",
    contactSourceUrl: "https://www.angelinacounty.net/sheriff/",
    sections: [
      {
        title: "Visitation",
        body: "Visiting hours are split by housing. Men visit Tuesday and Thursday from 7 to 10 p.m., Wednesday from 2 to 5:30 p.m., and Sunday from 8 to 11 a.m. Women visit Tuesday and Thursday from 6 to 7 p.m., Wednesday from 12:30 to 2 p.m., and Sunday from 1 to 2:30 p.m. Sign-up opens 30 minutes before each period and closes 30 minutes before it ends, first come, first served. Visits last 30 minutes, with no more than two visits a week and two visitors in the room at once. Visitors 17 and older need a state-issued ID or driver's license, and anyone younger must come with an adult. There are no contact visits.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.angelinacounty.net/jailvisit/"
      },
      {
        title: "Money and commissary",
        body: "Inmates buy food, hygiene items, clothing, and shoes from the commissary instead of receiving them from home. Money has to reach an inmate's account before 8 a.m. on Tuesday, orders are placed by phone before 10 a.m. Tuesday, and they are handed out on Wednesday. Money found in a letter is taken out and put on the inmate's commissary account. Inmates with less than $50 who buy nothing from commissary can ask for an indigent order.",
        sourceLabel: "Official jail information page",
        sourceUrl: "https://www.angelinacounty.net/jailinfo/"
      },
      {
        title: "Phone and mail",
        body: "Personal mail goes to the inmate's name and SO number, Angelina County Jail, PO Box 591, Longview, TX 75606, where it is scanned and sent to the inmate's kiosk. Letters can be no more than five pages, written on the front only, with one photo per mailing, and need a return address. Packages are not accepted, except a Bible mailed directly from a church. Inmates cannot receive incoming calls, only voicemail. Their outgoing calls cost $0.16 a minute with no connection fee. Prepaid collect accounts are set up with NCIC at 1-800-943-2189.",
        sourceLabel: "Official jail information page",
        sourceUrl: "https://www.angelinacounty.net/jailinfo/"
      },
      {
        title: "Bail and court records",
        body: "The Angelina County Bail Bond Board licenses the bondsmen who can write bonds in the county; its page lists the licensed companies and their phone numbers, most of them on E. Lufkin Ave. near the jail. The bond on each charge appears on the roster, and jail staff at 936-634-2724 can answer questions about a release. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official Bail Bond Board page",
        sourceUrl: "https://www.angelinacounty.net/bailbond/"
      }
    ],
    faq: [
      {
        question: "When are visiting hours at the Angelina County Jail?",
        answer:
          "Men visit Tuesday and Thursday 7 to 10 p.m., Wednesday 2 to 5:30 p.m., and Sunday 8 to 11 a.m. Women visit Tuesday and Thursday 6 to 7 p.m., Wednesday 12:30 to 2 p.m., and Sunday 1 to 2:30 p.m."
      },
      {
        question: "Where do I mail a letter to an Angelina County inmate?",
        answer:
          "Write the inmate's name and SO number, then Angelina County Jail, PO Box 591, Longview, TX 75606. Keep it to five pages, front side only, with one photo and a return address."
      },
      {
        question: "When does money need to be on an Angelina County inmate's account?",
        answer:
          "Before 8 a.m. on Tuesday. Inmates order commissary by phone before 10 a.m. that day, and orders are handed out on Wednesday."
      },
      {
        question: "How do I find a bondsman in Angelina County?",
        answer:
          "The Angelina County Bail Bond Board lists every licensed bond company with its phone number. Each charge's bond amount is shown on the jail roster."
      }
    ]
  },
  "texas/tom-green-county": {
    facilityName: "Tom Green County Detention Center",
    address: "4382 N US Highway 277, San Angelo, TX 76905",
    phone: "325-659-6597",
    operatedBy: "Tom Green County Sheriff's Office",
    reviewedAt: "October 15, 2026",
    overview:
      "The Tom Green County Sheriff's Office runs the detention center at 4382 N US Highway 277 in San Angelo. Shannon Medical Center provides inmates' medical care, and the jail's medical department takes calls at 325-659-6434.",
    contactSourceLabel: "Official jail information page",
    contactSourceUrl: "https://www.tomgreencountysheriff.org/jail-information",
    sections: [
      {
        title: "Visitation",
        body: "Face-to-face visits go by the first letter of the inmate's last name: A-E on Monday, F-J on Tuesday, K-O on Wednesday, P-R on Thursday, and S-Z on Friday. Sign up from 8:30 to 9:30 a.m. or 6:30 to 7:30 p.m.; visits run 9 to 11 a.m. and 7 to 9 p.m. and last 20 minutes. Bring a driver's license, state ID, or military ID. Visitors under 17 come only to the evening session with an adult. Shorts, sleeveless tops, and phones are not allowed. Video visits from home are booked through NCIC at $0.35 a minute.",
        sourceLabel: "Official jail information page",
        sourceUrl: "https://www.tomgreencountysheriff.org/jail-information"
      },
      {
        title: "Money and commissary",
        body: 'Commissary orders are processed on Monday, so money has to be on the account by 10 p.m. Sunday. Deposit online through TouchPay (choose Tom Green, facility 276903), by phone at 866-204-1603 with a Visa or Mastercard, at the kiosk in the jail lobby, or by mailing a money order made out to "Inmate Trust Fund." Care packages can be ordered through iCare. Current prescription medication in its original container can be dropped off at the lobby information window; call 325-659-6434 first.',
        sourceLabel: "Official jail information page",
        sourceUrl: "https://www.tomgreencountysheriff.org/jail-information"
      },
      {
        title: "Phone and mail",
        body: "Personal mail goes to a scanning center, not the jail: the inmate's name and SO number, Tom Green County Jail, PO Box 591, Longview, Texas 75606. Letters are scanned and shown on the kiosk in the inmate's cell. Keep it to 5 pages, one side only, and one photo per envelope, with a return address. Legal and medical mail goes to the detention center itself. Holding-cell phones are collect-call only; NCIC (1-844-724-2076) runs inmate calls and can block a number.",
        sourceLabel: "Official jail information page",
        sourceUrl: "https://www.tomgreencountysheriff.org/jail-information"
      },
      {
        title: "Bail and court records",
        body: "A cash bond has to be paid in full at the bonding window in the jail lobby; amounts over $5,000 must be a cashier's check. The lobby kiosk also takes cash, credit, and debit cards for bonds. A surety bond is posted through a bonding company approved by the Tom Green County Bail Bond Board, which charges a fee. Cash bond money is returned only after the case ends and the judge orders it.",
        sourceLabel: "Official jail information page",
        sourceUrl: "https://www.tomgreencountysheriff.org/jail-information"
      }
    ],
    faq: [
      {
        question: "What are the visiting days at Tom Green County Jail?",
        answer:
          "It depends on the inmate's last name: A-E Monday, F-J Tuesday, K-O Wednesday, P-R Thursday, S-Z Friday. Sign up 8:30-9:30 a.m. or 6:30-7:30 p.m.; visits are 20 minutes."
      },
      {
        question: "How do I put money on an inmate's account in Tom Green County?",
        answer:
          'Use TouchPay online (facility 276903), call 866-204-1603, use the lobby kiosk, or mail a money order payable to "Inmate Trust Fund." Deposit by 10 p.m. Sunday for that week\'s commissary.'
      },
      {
        question: "What is the mailing address for Tom Green County Jail?",
        answer:
          "Inmate name and SO number, Tom Green County Jail, PO Box 591, Longview, Texas 75606. Legal and medical mail goes directly to 4382 N US Highway 277, San Angelo, TX 76905."
      },
      {
        question: "How do I post bond at the Tom Green County jail?",
        answer:
          "Pay a cash bond in full at the lobby bonding window (cashier's check over $5,000) or at the lobby kiosk, or hire a bonding company approved by the Tom Green County Bail Bond Board."
      }
    ]
  },
  "oklahoma/custer-county": {
    facilityName: "Custer County Jail",
    address: "300 North 7th Ave., Arapaho, OK 73620",
    phone: "580-323-1616",
    operatedBy: "Custer County Sheriff's Office",
    reviewedAt: "October 31, 2026",
    overview:
      "The Custer County Sheriff's Office runs the county jail in Arapaho. The Sheriff's Office is at 580-323-1616, administration is open 8:30 a.m. to 4:30 p.m. on weekdays, and dispatch answers around the clock.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.custercountysheriff.com/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video and are recorded, through Prodigy Solutions. Sign up on the Prodigy website with a valid ID and a plain headshot photo, and book every visit, online or on-site, at least 24 hours ahead. Each inmate gets one 15-minute visit a week. On-site visits use the kiosk in the visitation room, two visitors per machine, and are free: weekdays from 4:30 to 6:30 p.m. and Saturday from 9 a.m. to 5 p.m. Phones, cameras, lighters, tobacco, and e-cigarettes are not allowed, and anyone released from this jail cannot visit for six months.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.custercountysheriff.com/visitation"
      },
      {
        title: "Money and commissary",
        body: "Add money at the kiosk in the Sheriff's Office lobby, open 24 hours; before 8 a.m., after 4 p.m., or on weekends, push the button at the door to be let in. Money can also be added online with a credit card, or by mailing a money order with the inmate's name on it to PO Box 40, Arapaho, OK 73620, addressed to the inmate. Money orders are not accepted at the front desk. For questions, call 580-323-1616 from 8:30 a.m. to 4:30 p.m. on weekdays.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.custercountysheriff.com/commissary"
      },
      {
        title: "Phone and mail",
        body: "Address letters to Custer County Jail, the inmate's name, 300 North 7th Ave., Arapaho, OK 73620, with the full name and address of both sender and inmate. Use a #10 envelope or smaller with no more than 50 cents of postage, and no drawings, stickers, or perfume on it, or the letter is sent back. Photos can be no larger than 4 by 6 inches, and Polaroids are not accepted. No greeting cards, staples, blank paper, envelopes, stamps, or printed social media posts. The site does not explain inmate phone calls; call the jail at 580-323-1616.",
        sourceLabel: "Official inmate mail page",
        sourceUrl: "https://www.custercountysheriff.com/inmate-mail"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts, and the Sheriff's site does not explain how to post bond. Call the Sheriff's Office at 580-323-1616 to ask about a bond and how to post it. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official contact page",
        sourceUrl: "https://www.custercountysheriff.com/contact-us"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Custer County Jail?",
        answer:
          "Visits are by video through Prodigy and must be booked 24 hours ahead. On-site kiosk visits are free, weekdays 4:30 to 6:30 p.m. and Saturday 9 a.m. to 5 p.m."
      },
      {
        question: "How do I put money on a Custer County inmate's account?",
        answer:
          "Use the 24-hour lobby kiosk, deposit online with a credit card, or mail a money order with the inmate's name to PO Box 40, Arapaho, OK 73620."
      },
      {
        question: "Where do I send a letter to a Custer County inmate?",
        answer:
          "Custer County Jail, inmate's name, 300 North 7th Ave., Arapaho, OK 73620, in a #10 envelope or smaller."
      },
      {
        question: "How do I find out a bond amount in Custer County?",
        answer: "The roster does not list bond amounts. Call the Sheriff's Office at 580-323-1616."
      }
    ]
  },
  "oklahoma/jackson-county": {
    facilityName: "Jackson County Jail",
    address: "600 S Main St., Altus, OK 73521",
    phone: "580-482-0408",
    operatedBy: "Jackson County Sheriff's Office",
    reviewedAt: "October 31, 2026",
    overview:
      "The Jackson County Sheriff's Office runs the county jail on South Main Street in Altus. The Sheriff's main line is 580-482-0408, and administrative hours are 8 a.m. to 4 p.m. on weekdays.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.jacksoncountyso.com/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video through Prodigy; there are no in-person visits. Set up a Prodigy account, verify your identity with a copy of your driver's license and a profile photo, and add money to a prepaid account. Approval takes 3 to 5 business days, and every visit must be booked at least 24 hours ahead. Visitors must be 18 or come with a parent or legal guardian, and all visits are monitored and recorded. Prodigy support is at 866-700-4545.",
        sourceLabel: "Official mail and visitation page",
        sourceUrl: "https://www.jacksoncountyso.com/inmate-mail-visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary and deposits go through Prodigy Solutions. Add money online, or at the lobby kiosk at the jail, open 24 hours, with cash or a card. Orders must be in by Monday at 5 a.m. for Tuesday delivery.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.jacksoncountyso.com/commissary-web-deposits"
      },
      {
        title: "Phone and mail",
        body: "Address letters to c/o Jackson County Sheriff's Office, the inmate's name, 600 S Main St., Altus, OK 73521, with your first and last name and return address, or the letter is sent back. All mail is opened and checked. No newspapers, magazines, Polaroids, pens, stamps, envelopes, blank paper, or musical cards, and no more than 3 to 5 photos per letter; only items that can be scanned are processed. For phone calls, call the jail at 580-482-0408.",
        sourceLabel: "Official mail and visitation page",
        sourceUrl: "https://www.jacksoncountyso.com/inmate-mail-visitation"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts. Call the Sheriff's Office at 580-482-0408 to ask about a bond. The Sheriff's Office lists registered bondsmen; a bond that is not filled out or notarized properly will not be accepted by the court clerk, and the defendant can be arrested again. Bonds need case numbers once charges are filed. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://www.jacksoncountyso.com/bondsmen"
      }
    ],
    faq: [
      {
        question: "Can I visit someone at the Jackson County Jail in person?",
        answer:
          "No. All visits are by video through Prodigy, need approval first, and must be booked at least 24 hours ahead."
      },
      {
        question: "How do I put money on a Jackson County inmate's account?",
        answer:
          "Deposit online through Prodigy, or use the lobby kiosk at the jail, which takes cash and cards. Commissary orders are due Monday at 5 a.m."
      },
      {
        question: "Where do I send a letter to a Jackson County inmate?",
        answer:
          "c/o Jackson County Sheriff's Office, inmate's name, 600 S Main St., Altus, OK 73521."
      },
      {
        question: "How do I find out a bond amount in Jackson County?",
        answer:
          "The roster does not list bond amounts. Call the Sheriff's Office at 580-482-0408, and see the Sheriff's list of registered bondsmen if you plan to use one."
      }
    ]
  },
  "oklahoma/major-county": {
    facilityName: "Major County Jail",
    address: "500 E Broadway #4, Fairview, OK 73737",
    phone: "580-227-4471",
    operatedBy: "Major County Sheriff's Office",
    reviewedAt: "October 31, 2026",
    overview:
      "The Major County Sheriff's Office runs the county jail in Fairview. The main line is 580-227-4471; press 2 for the jail. Administration is open 8:30 a.m. to 4:30 p.m. on weekdays, and dispatch answers around the clock.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.majorcosheriff.com/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video through City Tele Coin, either online from home or at the jail's kiosk. Visits at the jail are by appointment only on Sundays from 2 to 4 p.m., closed on holidays, and last 15 minutes, with one visit every seven days per inmate. Visitors must be 18 with a state photo ID, or come with an adult who has one, and each visitor gets a records and warrant check. Phones, cameras, food, drinks, and tobacco are not allowed past the lobby. Inmates who cannot pay may ask for a free online visit.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.majorcosheriff.com/visitation"
      },
      {
        title: "Money and commissary",
        body: "Each inmate has a commissary account through Jail ATM, and family can add money or order commissary online. An inmate can spend up to $200 a week. Orders are placed on Thursdays and must be called in by 9 a.m. that day.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.majorcosheriff.com/inmate-commissary"
      },
      {
        title: "Phone and mail",
        body: "Every envelope needs the first and last name and full address of both sender and inmate. Photos must be printed on paper and no larger than 4 by 6 inches. No greeting cards, stickers, metal, scents, blank paper, envelopes, stamps, or printed social media posts or clippings. The site does not list a separate mailing address or explain inmate phone calls; call the jail at 580-227-4471, option 2, before sending mail. Messages can also be sent through City Tele Coin.",
        sourceLabel: "Official visitation and mail page",
        sourceUrl: "https://www.majorcosheriff.com/visitation"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts. Call the jail at 580-227-4471, option 2, to ask about a bond. The Sheriff's Office lists registered bondsmen; a bond that is not filled out or notarized properly will not be accepted by the court clerk, and the defendant can be arrested again. Bonds need case numbers once charges are filed. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://www.majorcosheriff.com/bondsmen"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Major County Jail?",
        answer:
          "Visits are by video through City Tele Coin. At the jail, visits are by appointment on Sundays from 2 to 4 p.m. and last 15 minutes."
      },
      {
        question: "How do I put money on a Major County inmate's account?",
        answer:
          "Add money or order commissary online through Jail ATM. Orders must be called in by 9 a.m. on Thursday, up to $200 a week."
      },
      {
        question: "How do I send mail to a Major County inmate?",
        answer:
          "Put the full name and address of both sender and inmate on the envelope, and call the jail at 580-227-4471, option 2, to confirm where to send it."
      },
      {
        question: "How do I find out a bond amount in Major County?",
        answer:
          "The roster does not list bond amounts. Call the jail at 580-227-4471, option 2, and see the Sheriff's list of registered bondsmen if you plan to use one."
      }
    ]
  },
  "oklahoma/greer-county": {
    facilityName: "Greer County Jail",
    address: "105 S. Pennsylvania Ave., Mangum, OK 73554",
    phone: "580-782-3065",
    operatedBy: "Greer County Sheriff's Office",
    reviewedAt: "October 31, 2026",
    overview:
      "The Greer County Sheriff's Office runs the county jail in Mangum, in use since 1920. It holds men and women and has room for up to 43 people. The Sheriff's main line is 580-782-3065, and the office is open 8 a.m. to 4 p.m. on weekdays.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.greercountysheriff.org/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video through City Tele Coin; there are no in-person visits. Create an account on the City Tele Coin website or app and choose the Greer County facility. Visitors must be 18 or come with a parent or legal guardian. Every visit is monitored and recorded, and the jail can end a visit at any time or take away visiting privileges for breaking the rules.",
        sourceLabel: "Official mail and visitation page",
        sourceUrl: "https://www.greercountysheriff.org/mail-visitation-rules"
      },
      {
        title: "Money and commissary",
        body: "Each inmate has a commissary account through JailATM. Family can add money or order commissary online through JailATM. Orders are due by Tuesday at 7 a.m.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.greercountysheriff.org/commissary-web-deposits"
      },
      {
        title: "Phone and mail",
        body: "Address letters to c/o Greer County Sheriff's Office, the inmate's name, 105 S. Pennsylvania Ave., Mangum, OK 73554, with your first and last name and return address, or the letter is sent back. All mail is opened and checked. No newspapers, magazines, Polaroids, stamps, envelopes, blank paper, or musical cards, and no more than 3 to 5 photos per letter; only items that can be scanned are processed. Messages can also be sent through City Tele Coin. For phone calls, call the jail at 580-782-3065.",
        sourceLabel: "Official mail and visitation page",
        sourceUrl: "https://www.greercountysheriff.org/mail-visitation-rules"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts. Call the Sheriff's Office at 580-782-3065 to ask about a bond. The Sheriff's Office lists registered bondsmen; a bond that is not filled out or notarized properly will not be accepted by the court clerk, and the defendant can be arrested again. Bonds need case numbers once charges are filed. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://www.greercountysheriff.org/bondsmen"
      }
    ],
    faq: [
      {
        question: "Can I visit someone at the Greer County Jail in person?",
        answer:
          "No. All visits are by video through City Tele Coin. Visitors must be 18 or come with a parent or legal guardian."
      },
      {
        question: "How do I put money on a Greer County inmate's account?",
        answer:
          "Add money or order commissary online through JailATM. Commissary orders are due Tuesday by 7 a.m."
      },
      {
        question: "Where do I send a letter to a Greer County inmate?",
        answer:
          "c/o Greer County Sheriff's Office, inmate's name, 105 S. Pennsylvania Ave., Mangum, OK 73554."
      },
      {
        question: "How do I find out a bond amount in Greer County?",
        answer:
          "The roster does not list bond amounts. Call the Sheriff's Office at 580-782-3065, and see the Sheriff's list of registered bondsmen if you plan to use one."
      }
    ]
  },
  "oklahoma/love-county": {
    facilityName: "Love County Justice Center",
    address: "8339 US Highway 77, Marietta, OK 73448",
    phone: "580-276-3150",
    operatedBy: "Love County Sheriff's Office",
    reviewedAt: "October 30, 2026",
    overview:
      "The Love County Sheriff's Office runs the Love County Justice Center, the county jail on US Highway 77 in Marietta. The main line is 580-276-3150; press 2 for the jail. Dispatch answers around the clock at 580-276-5898, and administration is open 8:30 a.m. to 4:30 p.m. on weekdays.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.lovecosheriff.com/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video and are recorded, through Prodigy Solutions. Sign up on the Prodigy website with a valid ID and a plain headshot photo, and book every visit, online or on-site, at least 24 hours ahead. Each inmate gets one 15-minute visit a week. On-site visits use the kiosk in the visitation room, two visitors per machine, and are free: weekdays from 2 to 6:30 p.m., and Saturday and Sunday from 8:30 a.m. to 6:30 p.m. Laptops, tablets, lighters, tobacco, and e-cigarettes are not allowed.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.lovecosheriff.com/visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary is run by Benchmark. Add money with cash or a card at the lobby kiosk, open 24 hours a day, or online. Orders must be in by Monday at 8 a.m. for that week's delivery. For questions, call 580-276-3150, option 2, from 8:30 a.m. to 4:30 p.m. on weekdays.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.lovecosheriff.com/commissary"
      },
      {
        title: "Phone and mail",
        body: "Address letters to the inmate's name, Love County Justice Center, 8339 US-77, Marietta, OK 73448, with the full name and address of both sender and inmate. Photos can be no larger than 4 by 6 inches, and Polaroids are not accepted. No greeting cards, stickers, staples, scents, blank paper, envelopes, stamps, or printed social media posts. Softcover books must come new from a publisher or a store such as Amazon or Barnes & Noble. The site does not explain inmate phone calls; call the jail at 580-276-3150, option 2.",
        sourceLabel: "Official inmate mail page",
        sourceUrl: "https://www.lovecosheriff.com/inmate-mail"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts. Call the jail at 580-276-3150, option 2, to ask about a bond. The Sheriff's Office lists registered bondsmen; a bond that is not filled out or notarized properly will not be accepted by the court clerk, and the defendant can be arrested again. Bonds need case numbers once charges are filed. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://www.lovecosheriff.com/bondsmen"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Love County jail?",
        answer:
          "Visits are by video through Prodigy and must be booked 24 hours ahead. On-site kiosk visits are free, weekdays 2 to 6:30 p.m. and weekends 8:30 a.m. to 6:30 p.m."
      },
      {
        question: "How do I put money on a Love County inmate's account?",
        answer:
          "Use the lobby kiosk, which takes cash and cards and is open 24 hours, or deposit online. Commissary orders are due Monday at 8 a.m."
      },
      {
        question: "Where do I send a letter to a Love County inmate?",
        answer: "Inmate's name, Love County Justice Center, 8339 US-77, Marietta, OK 73448."
      },
      {
        question: "How do I find out a bond amount in Love County?",
        answer:
          "The roster does not list bond amounts. Call the jail at 580-276-3150, option 2, and see the Sheriff's list of registered bondsmen if you plan to use one."
      }
    ]
  },
  "oklahoma/ottawa-county": {
    facilityName: "Ottawa County Jail",
    address: "28 B St SE, Miami, OK 74354",
    phone: "918-542-2806",
    operatedBy: "Ottawa County Sheriff's Office",
    reviewedAt: "October 30, 2026",
    overview:
      "The Ottawa County Sheriff's Office runs the county jail in Miami. The Sheriff's main line is 918-542-2806 and the non-emergency number is 918-542-5585. Administration is open Monday through Thursday from 9 a.m. to 5 p.m. and Friday from 9 a.m. to 3 p.m.; dispatch answers around the clock.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.ottawacountysook.gov/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video and are recorded, through Prodigy Solutions. Sign up on the Prodigy website with a valid ID and a plain headshot photo, and book every visit, online or on-site, at least 24 hours ahead. Each inmate gets one 15-minute visit a week. On-site visits use the lobby kiosk, Monday through Friday from 9 a.m. to 5 p.m., two visitors per machine, and are free. Phones, cameras, lighters, tobacco, and e-cigarettes are not allowed, and anyone released from this jail cannot visit for 90 days.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.ottawacountysook.gov/visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary and deposits go through Prodigy. Money orders are not accepted: add money online with a credit or debit card, or use the Prodigy kiosk in the lobby, which also takes cash. Orders must be in by Tuesday at 10 a.m.; later orders wait until the next week. Money left on the account at release can only be collected by the inmate.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.ottawacountysook.gov/commissary"
      },
      {
        title: "Phone and mail",
        body: "Mail goes to Prodigy Solutions, then the inmate's name, PO Box 1498, Chickasha, OK 73018, with the full name and address of both sender and inmate on the envelope. Photos must be on photo paper and no larger than 4 by 6 inches. No lipstick, scents, stickers, or metal, and no printed social media posts or newspaper clippings. Former inmates cannot write to anyone in the jail for six months after release. The site does not explain inmate phone calls; call the jail at 918-542-2806.",
        sourceLabel: "Official inmate mail page",
        sourceUrl: "https://www.ottawacountysook.gov/inmate-mail"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts. Call the jail at 918-542-2806 to ask about a bond. The Sheriff's Office lists registered bondsmen; a bond that is not filled out or notarized properly will not be accepted by the court clerk, and the defendant can be arrested again. Bonds need case numbers once charges are filed. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://www.ottawacountysook.gov/bondsmen"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Ottawa County Jail?",
        answer:
          "Visits are by video through Prodigy and must be booked 24 hours ahead. On-site visits at the lobby kiosk run Monday through Friday, 9 a.m. to 5 p.m., and are free."
      },
      {
        question: "How do I put money on an Ottawa County inmate's account?",
        answer:
          "Deposit online through Prodigy with a card, or use the lobby kiosk, which takes cash and cards. Money orders are not accepted."
      },
      {
        question: "Where do I send a letter to an Ottawa County inmate?",
        answer: "Prodigy Solutions, inmate's name, PO Box 1498, Chickasha, OK 73018."
      },
      {
        question: "How do I find out a bond amount in Ottawa County?",
        answer:
          "The roster does not list bond amounts. Call the jail at 918-542-2806, and see the Sheriff's list of registered bondsmen if you plan to use one."
      }
    ]
  },
  "oklahoma/muskogee-county": {
    facilityName: "Muskogee County Jail",
    address: "122 South 3rd Street, Muskogee, OK 74401",
    phone: "918-682-7851",
    operatedBy: "Muskogee County Sheriff's Office",
    reviewedAt: "October 29, 2026",
    overview:
      "The Muskogee County Sheriff's Office runs the county jail on South 3rd Street in Muskogee. The jail's line is 918-682-7851; the Sheriff's Office at 220 State Street answers at 918-687-0202, with administration open 8:30 a.m. to 4:30 p.m. on weekdays.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.muskogeeso.org/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "Family and friends visit online only, through NCIC Inmate Communications; there are no in-person visits for personal visitors, so do not come to the jail to visit. Create an account on the NCIC website and follow its steps to schedule a visit. Visits can be restricted or suspended for security or discipline. In-person visits are limited to attorneys and other approved professionals, who should call the jail to arrange access.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.muskogeeso.org/visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary orders close at lockdown on Wednesday night and are usually delivered on Friday, or the next business day after a holiday. Add money at the lobby kiosk, which takes cash or credit cards, online through the commissary company's website, or by mailing a money order with the inmate's name.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.muskogeeso.org/commissary"
      },
      {
        title: "Phone and mail",
        body: "Since September 24, 2026, mail sent straight to the jail is returned. Send letters to the inmate's name and SO number, Muskogee County Jail, PO Box 591, Longview, Texas 75606, with a full return address. Each letter is scanned for the inmate: no more than five pages up to 8.5 by 11 inches, writing on the front only, and one photo per mailing, or the whole letter is sent back. Do not send legal or medical mail, magazines, books, or money orders to Longview. Messages, photos, and documents can also be sent through the NCIC messaging system for 25 to 35 cents each.",
        sourceLabel: "Official inmate mail page",
        sourceUrl: "https://www.muskogeeso.org/inmate-mail"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts, and the Sheriff's site does not explain how to post bond. Call the jail at 918-682-7851 to ask about a bond and how to post it. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official contact page",
        sourceUrl: "https://www.muskogeeso.org/contact-us"
      }
    ],
    faq: [
      {
        question: "Can I visit someone at the Muskogee County Jail in person?",
        answer:
          "No. Family and friends visit online only through NCIC. In-person visits are limited to attorneys and approved professionals."
      },
      {
        question: "How do I put money on a Muskogee County inmate's account?",
        answer:
          "Use the lobby kiosk (cash or card), deposit online through the commissary company, or mail a money order with the inmate's name. Commissary orders close Wednesday night."
      },
      {
        question: "Where do I send a letter to a Muskogee County inmate?",
        answer:
          "Inmate's name and SO number, Muskogee County Jail, PO Box 591, Longview, Texas 75606. Mail sent directly to the jail is returned."
      },
      {
        question: "How do I find out a bond amount in Muskogee County?",
        answer: "The roster does not list bond amounts. Call the jail at 918-682-7851."
      }
    ]
  },
  "oklahoma/sequoyah-county": {
    facilityName: "Sequoyah County Jail",
    address: "119 South Oak Street, Sallisaw, OK 74955",
    phone: "918-776-9028",
    operatedBy: "Sequoyah County Sheriff's Office",
    reviewedAt: "October 27, 2026",
    overview:
      "The Sequoyah County Sheriff's Office in Sallisaw runs the county jail. The jail's own line is 918-776-9028; the Sheriff's Office main number is 918-775-1214 and dispatch is 918-775-9155.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://scsok.org/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "Video visits are open seven days a week from 8 a.m. to 10:30 p.m. through City Tele Coin: set up a direct-pay account on the City Tele Coin website or app and choose the Sequoyah County facility; the live hotline is 318-746-1114. For visits at the jail, register in the lobby with a passport or government photo ID. Only one adult visits at a time, juveniles need a parent, guardian, or custodian with them, and each visit lasts 15 minutes. Food, drinks, bags, phones, and cameras are not allowed in the visitation area, and visitors may be searched.",
        sourceLabel: "Official mail and visitation page",
        sourceUrl: "https://scsok.org/inmate-mail-visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary is run by Benchmark Commissary Services, and orders are due by Friday at 4 p.m. Money orders are not accepted: add money online with a debit or credit card, or use the kiosk in the jail lobby, the only way to leave money at the jail. Money left on the account at release can only be collected by the inmate; after a weekend release, it can be picked up Tuesday through Friday, 8:30 a.m. to 4:30 p.m.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://scsok.org/inmate-commissary"
      },
      {
        title: "Phone and mail",
        body: "Inmate calls go through City Tele Coin; set up a prepaid account online or at 318-746-1114. Staff open and inspect general mail and may read it, and mail can be returned, kept with the inmate's property, or sent to the District Attorney if it breaks the rules. Photos must be 4 by 6 inches or smaller, unframed, not from an instant camera, and not sexual or gang-related. Legal mail is opened only in front of the inmate. Call the jail at 918-776-9028 to confirm the mailing address.",
        sourceLabel: "Official mail and visitation page",
        sourceUrl: "https://scsok.org/inmate-mail-visitation"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts. Call the jail at 918-776-9028 to ask about a bond. The Sheriff's Office lists registered bondsmen; a bond that is not filled out or notarized properly will not be accepted by the court clerk, and the defendant can be arrested again. Bonds need case numbers once charges are filed. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://scsok.org/bondsmen"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Sequoyah County Jail?",
        answer:
          "Video visits run daily from 8 a.m. to 10:30 p.m. through a City Tele Coin account. At the jail, register in the lobby with a photo ID; visits last 15 minutes and one adult visits at a time."
      },
      {
        question: "How do I put money on a Sequoyah County inmate's account?",
        answer:
          "Deposit online with a debit or credit card, or use the kiosk in the jail lobby. Money orders are not accepted. Commissary orders are due by Friday at 4 p.m."
      },
      {
        question: "How do inmates make phone calls in Sequoyah County?",
        answer:
          "Calls go through City Tele Coin. Set up a prepaid account online or by calling 318-746-1114."
      },
      {
        question: "How do I find out a bond amount in Sequoyah County?",
        answer:
          "The roster does not list bond amounts. Call the jail at 918-776-9028, and see the Sheriff's list of registered bondsmen if you plan to use one."
      }
    ]
  },
  "oklahoma/canadian-county": {
    facilityName: "Canadian County Jail",
    address: "304 N. Evans, El Reno, OK 73036",
    phone: "405-422-3188",
    operatedBy: "Canadian County Sheriff's Office",
    reviewedAt: "October 26, 2026",
    overview:
      "The Canadian County Jail in El Reno has 194 beds and holds both people awaiting trial and people serving sentences. It has long held more people than it has beds for, so some inmates are housed in other counties' jails, such as Grant, Dewey, Washita, Ellis, and Pottawatomie. The Sheriff's Office main line, 405-262-3434, is at 208 West Rogers.",
    contactSourceLabel: "Official jail information page",
    contactSourceUrl: "https://ccsheriff.net/jail-information",
    sections: [
      {
        title: "Visitation",
        body: "Family and friends visit by video through Prodigy: create your own account at prodigysales.com, or call Prodigy support at 866-700-4545 for help. Remote visits are not allowed from 11 a.m. to 1 p.m., 5 to 7 p.m., or 10 p.m. to 7 a.m. Visitors must be 18 or come with a parent or legal guardian, and the dress code bars things like short shorts, halter tops, and see-through clothing. Anyone released from this jail cannot visit for six months. Out-of-state family can ask the Jail Administrator for a one-time special visit with at least 24 hours' notice. Attorneys schedule visits through Judicial Services at 405-295-6216 or 405-434-2829.",
        sourceLabel: "Official mail and visitation page",
        sourceUrl: "https://ccsheriff.net/inmate-mail-visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary and deposits are handled by Prodigy Solutions, and orders are due each Tuesday. Money orders are not accepted. Add money online with a debit or credit card, or use the kiosk in the jail lobby, which takes cash and cards. Money left on the account at release can only be collected by the inmate.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://ccsheriff.net/inmate-commissary"
      },
      {
        title: "Phone and mail",
        body: "Address letters to Canadian County Jail, the inmate's name and PID number, 304 N. Evans, El Reno, Oklahoma 73036. Mail is scanned and read on the Prodigy kiosk, except legal mail, and originals are not returned. Up to three photos per envelope, none larger than 4 by 6 inches and no Polaroids; no stamps, stickers, blank paper or envelopes, staples, clippings, perfume, or anything printed from the internet. Each adult mails their own signed letter. Inmates can get two paperback books a month shipped straight from an online bookseller. Anyone released from the jail cannot write to an inmate for six months without the Jail Administrator's approval.",
        sourceLabel: "Official mail and visitation page",
        sourceUrl: "https://ccsheriff.net/inmate-mail-visitation"
      },
      {
        title: "Bail and court records",
        body: "The inmate search does not show bond amounts. Call the jail at 405-422-3188 to ask about a bond and how to post it; the Sheriff's Office also keeps a list of licensed bondsmen. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://ccsheriff.net/bondsmen"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Canadian County Jail?",
        answer:
          "Set up your own video visitation account with Prodigy at prodigysales.com. Remote visits are blocked from 11 a.m. to 1 p.m., 5 to 7 p.m., and 10 p.m. to 7 a.m."
      },
      {
        question: "How do I put money on a Canadian County inmate's account?",
        answer:
          "Deposit online through Prodigy with a debit or credit card, or use the kiosk in the jail lobby, which takes cash and cards. Money orders are not accepted."
      },
      {
        question: "Where do I send a letter to a Canadian County inmate?",
        answer:
          "Canadian County Jail, the inmate's name and PID number, 304 N. Evans, El Reno, Oklahoma 73036. Mail is scanned for the inmate and originals are not returned."
      },
      {
        question: "How do I find out a bond amount in Canadian County?",
        answer:
          "The roster does not list bond amounts. Call the jail at 405-422-3188, and see the Sheriff's list of licensed bondsmen if you plan to use one."
      }
    ]
  },
  "oklahoma/carter-county": {
    facilityName: "Carter County Jail",
    address: "100 South Washington, Ardmore, OK 73401",
    phone: "580-223-6014",
    operatedBy: "Carter County Sheriff's Office",
    reviewedAt: "October 25, 2026",
    overview:
      "The Carter County Sheriff's Office in Ardmore runs the county jail. Its administration office is open 9 a.m. to 4 p.m., Monday through Friday, and dispatch answers around the clock at the main line, 580-223-6014.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.cartercountysheriff.us/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "Personal visits and inmate phone service both go through NCIC Inmate Communication Systems. Create an account on the NCIC website, choose the Carter County facility and the inmate, then pick a date and time for a video visit. The same account is used for calls and to add money to an inmate's phone account. Attorney and counsel visits are scheduled with the jail administrator.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.cartercountysheriff.us/visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary is run by Tiger Commissary, which sells food, clothing, and hygiene items. Family and friends order online from the Tiger website by searching the inmate's last name; orders have to be in by Sunday at 4:30 p.m. and are handed out on Wednesday. Tiger also takes online deposits to an inmate's account.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.cartercountysheriff.us/commissary"
      },
      {
        title: "Phone and mail",
        body: "Every envelope needs the full first and last name and full address of both the sender and the inmate. Photos are accepted on photo paper up to 4 by 6 inches, as long as they are not graphic or suggestive. Do not send blank paper, envelopes, or stamps, stickers or anything metallic, printed social media pages or newspaper clippings, or anything with lipstick or scent. Mail that breaks these rules gets a rejection notice. For questions, or to confirm the mailing address, contact the jail administrator through the main line.",
        sourceLabel: "Official inmate mail page",
        sourceUrl: "https://www.cartercountysheriff.us/inmate-phones-mail"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office posts a list of licensed bondsmen registered in Carter County. A bond that is not filled out or notarized properly will not be accepted or filed by the court clerk, and the defendant can be arrested again; bonds also need case numbers once charges are filed. The inmate search does not show bond amounts, so call 580-223-6014 to ask. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official bondsmen page",
        sourceUrl: "https://www.cartercountysheriff.us/bondsmen"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Carter County Jail?",
        answer:
          "Set up an account with NCIC Inmate Communication Systems, choose the Carter County facility and the inmate, and book a video visit. Attorneys schedule visits with the jail administrator."
      },
      {
        question: "How do I put money on a Carter County inmate's account?",
        answer:
          "Use Tiger Commissary online. You can order commissary items, due by Sunday at 4:30 p.m. and delivered Wednesday, or make a deposit. Phone money goes through NCIC."
      },
      {
        question: "What can I mail to a Carter County inmate?",
        answer:
          "Letters with full names and addresses for sender and inmate, and photos on photo paper no bigger than 4 by 6. No blank paper, stamps, stickers, clippings, or scented items."
      },
      {
        question: "How do I find out a bond amount in Carter County?",
        answer:
          "The roster does not list bond amounts. Call the Sheriff's Office at 580-223-6014, and see the Sheriff's list of registered bondsmen if you plan to use one."
      }
    ]
  },
  "oklahoma/seminole-county": {
    facilityName: "Seminole County Jail",
    address: "211 E. 2nd Street, Wewoka, OK 74884",
    phone: "405-257-5445",
    operatedBy: "Seminole County Sheriff's Office",
    reviewedAt: "October 11, 2026",
    overview:
      "The Seminole County Sheriff's Office runs the county jail from its office at 211 E. 2nd Street in Wewoka, which is also the jail's mailing address. The main number is 405-257-5445, and the contact page lists the jail at 405-257-6235.",
    contactSourceLabel: "Official contact page",
    contactSourceUrl: "https://www.seminolecosheriff.com/contact-us",
    sections: [
      {
        title: "Visitation",
        body: "All personal visits go through NCIC Inmate Communication Systems. Create an NCIC account, select the Seminole County facility, then the inmate, and pick a date and time. The Sheriff's Office does not post visiting hours, so the open times are the ones NCIC shows when you book. Attorneys and counsel schedule their visits with the jail administrator.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.seminolecosheriff.com/visitation"
      },
      {
        title: "Money and commissary",
        body: "Commissary is run by Benchmark Commissary Services, and orders must be in by 4 p.m. on Friday. Money goes on an inmate's account as an online deposit with a credit or debit card. Money orders are not accepted. Money left on the account at release goes only to the inmate; after a weekend release it can be picked up Tuesday to Friday, 8:30 a.m. to 4:30 p.m.",
        sourceLabel: "Official commissary page",
        sourceUrl: "https://www.seminolecosheriff.com/commissary"
      },
      {
        title: "Phone and mail",
        body: "Address letters to the inmate's name, care of the Seminole County Sheriff's Office, 211 E. 2nd, Wewoka, OK 74884. Put your own first and last name and return address on every letter, or it will be sent back. All mail is opened and checked for contraband, and only items that can be scanned are processed. Do not send newspapers, magazines, Polaroids, more than 3 to 5 photos, pens, pencils, stamps, envelopes, blank paper, or musical cards. Inmates cannot write to other inmates. The Sheriff's Office does not post phone rules online, so call 405-257-5445.",
        sourceLabel: "Official inmate mail page",
        sourceUrl: "https://www.seminolecosheriff.com/inmate-mail"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office does not post bond instructions online. Call 405-257-5445 for the bond on a booking and how to post it. Report requests go to the administrative assistant, by email or in person during business hours. Some reports can be emailed, some need a subpoena, and the first copy is free to victims.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.seminolecosheriff.com/faqs"
      }
    ],
    faq: [
      {
        question: "How do I schedule a visit at the Seminole County jail?",
        answer:
          "Make an account with NCIC Inmate Communication Systems, choose the Seminole County facility and the inmate, and book an open date and time. Attorneys schedule through the jail administrator instead."
      },
      {
        question: "How do I address a letter to a Seminole County inmate?",
        answer:
          "Write the inmate's name, then c/o Seminole County Sheriff's Office, 211 E. 2nd, Wewoka, OK 74884. Your first and last name and return address must be on it, or it will be returned."
      },
      {
        question: "Can I send a money order to an inmate in Seminole County?",
        answer:
          "No. The jail does not accept money orders. Add money online with a credit or debit card instead."
      },
      {
        question: "When is the commissary order deadline in Seminole County?",
        answer:
          "Commissary orders through Benchmark Commissary Services must be placed by 4 p.m. on Friday."
      }
    ]
  },
  "minnesota/otter-tail-county": {
    facilityName: "Otter Tail County Jail",
    address: "416 South Mill Street, Fergus Falls, MN 56537",
    phone: "218-998-8556",
    operatedBy: "Otter Tail County Sheriff's Office",
    reviewedAt: "October 11, 2026",
    overview:
      "The Otter Tail County Jail in Fergus Falls was built in 1987 and holds up to 111 people. Besides the county's own sentenced and unsentenced inmates, it houses people for other counties, the Department of Corrections, Immigration, and the U.S. Marshals. The jail's line is 218-998-8556; the Sheriff's Office is at 218-998-8555.",
    contactSourceLabel: "Official county jail page",
    contactSourceUrl: "https://ottertailcounty.gov/public-safety-law/detention/county-jail/",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video and are scheduled through an NCIC account, which has to be approved before you can visit. On-site video visits at the jail are free: Wednesday and Thursday 2 to 4:30 p.m. and 6:30 to 10:30 p.m., and Saturday 9:30 to 11:30 a.m. and 2 to 4:30 p.m. Off-site video visits run daily from 8 to 11:30 a.m., 12:30 to 4:30 p.m., and 6:30 to 10:30 p.m.",
        sourceLabel: "Official county jail page",
        sourceUrl: "https://ottertailcounty.gov/public-safety-law/detention/county-jail/"
      },
      {
        title: "Money and commissary",
        body: "Nothing may be brought in for an inmate. Canteen money buys snacks, pop, writing materials, and extra hygiene items from vending machines. Add it with cash or a card at the kiosk in the jail's public lobby, with a card online through Inmate Canteen, or by mailing a money order. People convicted of a crime are billed $20 a day for their stay after release and have 90 days to pay or set up payments.",
        sourceLabel: "Official jail FAQ page",
        sourceUrl: "https://ottertailcounty.gov/public-safety-law/detention/jail-faqs/"
      },
      {
        title: "Phone and mail",
        body: "Inmates use wall phones and tablets from NCIC; fund a prepaid account at 1-800-943-2189 or through NCIC. Since July 21, 2025, regular mail goes to a scanning center: Inmate Name and PIN#, Otter Tail County Jail, PO Box 591, Longview, Texas 75606. Include the inmate's name, jail or booking number, and your return address. Letters can be up to 5 pages, letter size, written on the front only, with one photo per mailing. Mail sent to Longview is scanned, then destroyed and never returned. Legal and medical mail, magazines, newspapers, and books go to the jail in Fergus Falls instead. NCIC messages cost $0.25, and photo messages $0.35.",
        sourceLabel: "Official mail guidelines",
        sourceUrl: "https://ottertailcounty.gov/wp-content/uploads/2018/07/New-Mail-Guidelines.pdf"
      },
      {
        title: "Bail and court records",
        body: "Within 48 hours of arrest, a judge sees the inmate or reviews the arrest at a first appearance hearing. These hearings are held at 11 a.m. on business days in the Courthouse and are open to the public. The judge can release the inmate, set bail or bond, or keep them in custody. Court Administration schedules first appearances, and you can call the jail at 218-998-8556 before 11 a.m. to ask whether the inmate is going to court that day.",
        sourceLabel: "Official jail FAQ page",
        sourceUrl: "https://ottertailcounty.gov/public-safety-law/detention/jail-faqs/"
      }
    ],
    faq: [
      {
        question: "Where do I mail a letter to an Otter Tail County inmate?",
        answer:
          "Regular mail goes to Inmate Name and PIN#, Otter Tail County Jail, PO Box 591, Longview, Texas 75606, where it is scanned and delivered electronically. Legal and medical mail goes to the jail itself in Fergus Falls."
      },
      {
        question: "When can I visit someone in the Otter Tail County Jail?",
        answer:
          "Free on-site video visits run Wednesday and Thursday 2 to 4:30 p.m. and 6:30 to 10:30 p.m., and Saturday 9:30 to 11:30 a.m. and 2 to 4:30 p.m. Off-site video visits run daily in three blocks between 8 a.m. and 10:30 p.m. Schedule either kind through NCIC."
      },
      {
        question: "How do I put money on an inmate's canteen account in Otter Tail County?",
        answer:
          "Use the kiosk in the jail's public lobby (cash or card), pay online through Inmate Canteen, or mail a money order."
      },
      {
        question: "When does a new arrestee see a judge in Otter Tail County?",
        answer:
          "Within 48 hours, at a first appearance hearing held at 11 a.m. on business days in the Courthouse. Call the jail at 218-998-8556 before 11 a.m. to ask whether the inmate is on that day's list."
      }
    ]
  },
  "minnesota/sherburne-county": {
    facilityName: "Sherburne County Jail",
    address: "13880 Business Center Drive, Elk River, MN 55330",
    phone: "763-765-3800",
    operatedBy: "Sherburne County Sheriff's Office",
    reviewedAt: "October 11, 2026",
    overview:
      "The Sherburne County Jail in Elk River is a 732-bed regional jail. Besides people held by Sherburne County, it houses detainees for Immigration and Customs Enforcement, the U.S. Marshals, the Bureau of Indian Affairs, and other agencies, and holds more than 500 federal detainees on an average day. Call the jail at 763-765-3800.",
    contactSourceLabel: "Official posting bail page",
    contactSourceUrl: "https://www.co.sherburne.mn.us/906/Posting-Bail-Bond",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video and must be scheduled ahead through NCIC; walk-ins are not allowed. On-site video visits at Door I of the Sherburne County Government Center are free, one 30-minute visit a day, Monday to Friday at 8:30, 9:30, and 10:30 a.m., 12:30 p.m., and 3:30 p.m. Weekend and holiday times are currently unavailable. Bring a government photo ID, and leave phones, other electronics, and tobacco behind; no storage is provided. Remote visits cost $0.27 a minute, must be booked 24 hours ahead, and run 8:30 a.m. to 8:50 p.m., up to five a day.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.co.sherburne.mn.us/419/Visitation"
      },
      {
        title: "Money and commissary",
        body: "Money goes on an inmate's account through Access Corrections: online, by phone at 866-345-1884, or with cash or a card at the kiosks in the jail lobby and the video visitation area. Each method charges a fee. Money orders and checks sent by mail are returned or placed in the inmate's property. The account pays for commissary items such as snacks, pop, haircuts, and stamps, and it is closed at release or transfer with a check or debit card issued to the inmate.",
        sourceLabel: "Official inmate accounts page",
        sourceUrl: "https://www.co.sherburne.mn.us/313/Inmate-Accounts"
      },
      {
        title: "Phone and mail",
        body: "Inmates call out through NCIC prepaid accounts (account.ncic.com or 1-800-943-2189) at $0.16 a minute in the U.S.; they cannot receive calls. If an inmate has called you before, you can leave a voicemail at 800-943-2189 for $1.50. Mail must carry the inmate's name and SPN and your name and return address on the front. Each letter may hold up to five items, including at most four photos no larger than 4 by 6 inches, nothing larger than 8.5 by 11. Inmates receive copies, and originals are destroyed after 30 days. Do not send cash, checks, money orders, stamps, blank paper, books, newspapers, or magazines. NCIC messages cost $0.25, or $0.35 with a photo.",
        sourceLabel: "Official phone and mail page",
        sourceUrl: "https://www.co.sherburne.mn.us/314/Inmate-Phone-Email-Provider-Mail"
      },
      {
        title: "Bail and court records",
        body: "Bail can be paid 24 hours a day in the jail lobby at Door D. The Sheriff's Office takes only cash in the exact bail amount, with no checks or cards, and you must show a current government photo ID. To ask about bail by phone, call the jail at 763-765-3800 with the inmate's full name and date of birth ready.",
        sourceLabel: "Official posting bail page",
        sourceUrl: "https://www.co.sherburne.mn.us/906/Posting-Bail-Bond"
      }
    ],
    faq: [
      {
        question: "How do I post bail at the Sherburne County Jail?",
        answer:
          "Come to the jail lobby at Door D, open 24 hours, with cash in the exact amount and a current government photo ID. Checks and cards are not accepted. Call 763-765-3800 first to confirm the amount."
      },
      {
        question: "When are on-site visits at the Sherburne County Jail?",
        answer:
          "Free 30-minute video visits are held Monday to Friday at 8:30, 9:30, and 10:30 a.m., 12:30 p.m., and 3:30 p.m., at Door I of the Government Center. Schedule through NCIC; walk-ins are not allowed."
      },
      {
        question: "Can I mail money to an inmate in Sherburne County?",
        answer:
          "No. Money orders and checks sent by mail are returned or put in the inmate's property. Use Access Corrections online, by phone at 866-345-1884, or at the jail lobby kiosk."
      },
      {
        question: "How do I find someone held by ICE at the Sherburne County Jail?",
        answer:
          "The jail houses ICE detainees. The Sheriff's Office points families to ICE's online detainee locator, which shows people currently in ICE custody and those released from it in the past 60 days."
      }
    ]
  },
  "minnesota/kandiyohi-county": {
    facilityName: "Kandiyohi County Jail",
    address: "2201 23rd St. NE, Willmar, MN 56201",
    phone: "320-214-6700",
    operatedBy: "Kandiyohi County Sheriff's Office",
    reviewedAt: "October 12, 2026",
    overview:
      "The Kandiyohi County Sheriff's Office runs the county jail at 2201 23rd St. NE in Willmar, which also houses ICE detainees for the St. Paul field office. The jail's main line is 320-214-6700; inmate information is extension 3600, and programs staff are at extensions 3616, 3665, and 3633.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.kcmn.us/departments/sheriff/departments/jail.php",
    sections: [
      {
        title: "Visitation",
        body: "Family and friends visit by video after registering at team3.inmatecanteen.com with an email address and ID number; visitors must be 18 or older, and anyone on probation needs written approval from their probation officer. Visits run daily, including weekends and holidays, from 8 a.m. to 9 p.m., except 11 a.m. to 12:30 p.m. and 4:30 to 6:30 p.m. Each inmate gets 30 minutes every 8 hours. From home it costs $0.39 a minute; at the stations in the jail lobby it is free, but there are no lobby visits after 4:30 p.m. on Fridays. ICE detainees and state prison inmates can also have at least one-hour, behind-the-glass visits on Saturdays and Sundays, one a day, with ID.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.kcmn.us/departments/sheriff/departments/jail.php"
      },
      {
        title: "Money and commissary",
        body: "Bring cash to the money kiosk at the jail entrance; it takes bills only, no coins, and the deposit reaches the inmate's account right away. Money can also be added online at inmatecanteen.com. Do not choose the Communications Account if the money is meant for the inmate's own account. Inmates can buy phone cards through the canteen.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.kcmn.us/departments/sheriff/departments/jail.php"
      },
      {
        title: "Phone and mail",
        body: "The jail does not take phone calls for inmates and relays only emergency messages, at 320-214-6700 ext. 3600. To receive calls, set up a prepaid account with Securus at 1-800-844-6591, or buy prepaid phone cards from Securus or Inmate Canteen. Inmates can also send a limited number of text messages and receive non-confidential messages on tablets through Securus. The mail rules the jail posts are written for ICE detainees: include the last four digits of the detainee's A-number and your name and address, and do not mail cash. All incoming mail is opened and inspected for contraband.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.kcmn.us/departments/sheriff/departments/jail.php"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office does not post bail steps for county inmates online, so call the jail at 320-214-6700. For ICE detainees, delivery bonds are posted at ICE bond acceptance offices, Monday to Friday from 9 a.m. to 3 p.m., by money order, cashier's check, or certified check; bonds of $10,000 or more need a single cashier's or certified check payable to the U.S. Department of Homeland Security or Immigration and Customs Enforcement.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.kcmn.us/departments/sheriff/departments/jail.php"
      }
    ],
    faq: [
      {
        question: "When are video visits at the Kandiyohi County Jail?",
        answer:
          "Every day from 8 a.m. to 9 p.m., except 11 a.m. to 12:30 p.m. and 4:30 to 6:30 p.m. Register first at team3.inmatecanteen.com. Lobby visits are free; visits from home cost $0.39 a minute."
      },
      {
        question: "How do I put money on a Kandiyohi County inmate's account?",
        answer:
          "Use the bills-only kiosk at the jail entrance in Willmar, or deposit online at inmatecanteen.com. Avoid the Communications Account if the money should go to the inmate."
      },
      {
        question: "Can I call an inmate at the Kandiyohi County Jail?",
        answer:
          "No. The jail does not take calls for inmates and passes on emergency messages only, at 320-214-6700 ext. 3600. Fund a Securus prepaid account (1-800-844-6591) so the inmate can call you."
      },
      {
        question: "Does the Kandiyohi County Jail hold ICE detainees?",
        answer:
          "Yes. The jail houses ICE detainees for the St. Paul field office. For an ICE detainee's case, ICE asks callers to use (612) 843-8600 with the person's full name, date of birth, and country of birth ready."
      }
    ]
  },
  "minnesota/washington-county": {
    facilityName: "Washington County Jail",
    address: "15015 62nd St. N., Stillwater, MN 55082",
    phone: "651-430-7900",
    operatedBy: "Washington County Sheriff's Office",
    reviewedAt: "October 15, 2026",
    overview:
      "The Washington County Jail is a 228-bed direct-supervision jail in the Law Enforcement Center in Stillwater, open since June 1993. It holds men and women, both awaiting trial and sentenced, and runs a separate eight-day holding unit for juveniles. The jail has its own kitchen, laundry, and medical unit with a dentist's office.",
    contactSourceLabel: "Official inmate information page",
    contactSourceUrl: "https://washingtoncountymn.gov/3214/Inmate-Information",
    sections: [
      {
        title: "Visitation",
        body: "You have to be on the inmate's visiting list, and staff cannot tell you who is on it. In-person visits are Friday through Monday from 6 to 10 p.m., and Saturday and Sunday from 8:30 to 10:30 a.m.; families with children get priority on weekend visits. Bring a government photo ID with your date of birth and expect a metal detector. Video visits through InmateCanteen.com cost $0.39 a minute and need approval from Jail Administration. Call 651-430-7900 before you go to make sure visiting has not been canceled.",
        sourceLabel: "Official inmate information page",
        sourceUrl: "https://washingtoncountymn.gov/3214/Inmate-Information"
      },
      {
        title: "Money and commissary",
        body: "Put money on an inmate's account at the kiosk in the jail lobby, with cash ($2.00 fee, no monthly limit) or a credit card ($8.95 fee, $150 per card each month), or online at InmateCanteen.com ($8.95 fee). Deposits for one inmate are capped at $300 every 14 days. Do not mail money. Prescription medication can be dropped off with jail staff once the jail nurse approves it.",
        sourceLabel: "Official inmate information page",
        sourceUrl: "https://washingtoncountymn.gov/3214/Inmate-Information"
      },
      {
        title: "Phone and mail",
        body: "Address letters to the inmate's full name, Washington County Jail, 15015 62nd St. N., P.O. Box 3801, Stillwater, MN 55082. Mail is opened, scanned, and delivered electronically; the originals go into the inmate's property. Inmates cannot make collect calls. Calls are paid from a debit account that friends and family fund at InmateCanteen.com, which also handles emails ($0.16) and photos ($0.32).",
        sourceLabel: "Official inmate information page",
        sourceUrl: "https://washingtoncountymn.gov/3214/Inmate-Information"
      },
      {
        title: "Bail and court records",
        body: "Bail on Washington County cases is posted at Court Administration in the courthouse on weekdays from 8 a.m. to 4:15 p.m., and at the Jail Administration window in the Law Enforcement Center after hours and on weekends. The lobby kiosk takes bail around the clock, with a $1,000 limit on credit cards. In person, bring cash or a certified cashier's check for the exact amount; approved bonding agents can also post bonds. Receiving the court update, processing, and release can take four to six hours.",
        sourceLabel: "Official inmate information page",
        sourceUrl: "https://washingtoncountymn.gov/3214/Inmate-Information"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Washington County Jail?",
        answer:
          "In person, Friday through Monday from 6 to 10 p.m. and weekends from 8:30 to 10:30 a.m. You must be on the inmate's visiting list. Video visits are available through InmateCanteen.com at $0.39 a minute."
      },
      {
        question: "How do I put money on an inmate's account in Washington County?",
        answer:
          "Use the lobby kiosk at the Law Enforcement Center in Stillwater (cash or card) or InmateCanteen.com. No more than $300 can go to one inmate every 14 days, and money sent by mail is not accepted."
      },
      {
        question: "What is the mailing address for Washington County Jail?",
        answer:
          "Inmate's full name, Washington County Jail, 15015 62nd St. N., P.O. Box 3801, Stillwater, MN 55082. Letters are scanned and delivered to the inmate electronically."
      },
      {
        question: "Where do I post bail in Washington County?",
        answer:
          "At Court Administration in the courthouse on weekdays until 4:15 p.m., or at the jail's lobby kiosk and Jail Administration window after hours. Call 651-430-7900 first on weekends or after 4 p.m."
      }
    ]
  },
  "minnesota/dakota-county": {
    facilityName: "Dakota County Jail",
    address: "1580 Highway 55, Hastings, MN 55033",
    phone: "651-438-4800",
    operatedBy: "Dakota County Sheriff's Office",
    reviewedAt: "October 16, 2026",
    overview:
      "The Dakota County Jail is a 263-bed direct-supervision jail in the Law Enforcement Center at 1580 Highway 55 in Hastings. Correctional deputies staff each housing unit around the clock. Jail information is at 651-438-4800, and the Sheriff's Office main line is 651-438-4700.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://dakotacountymn.gov/residents/public-safety-justice/jail",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video at the kiosks in the Law Enforcement Center in Hastings, daily from 7:30 to 9:45 a.m., 3 to 4:45 p.m., and 7 to 9:45 p.m. A visit lasts up to 20 minutes and can't start after the end time. Visitors must be 18 or older, or come with an adult, and may be asked for photo ID. Video visits from home and email messages are set up through Inmate Canteen. All visits can be monitored or recorded.",
        sourceLabel: "Official jail visitation page",
        sourceUrl: "https://dakotacountymn.gov/residents/public-safety-justice/jail/visitation"
      },
      {
        title: "Money and commissary",
        body: "Deposit cash or a credit card at the kiosk in the jail lobby at 1580 Highway 55, which is open 24 hours and credits the account right away, or deposit online through Inmate Canteen. Money orders made out to the inmate can also be mailed to the jail's P.O. box. Inmates use their funds for canteen orders such as postage-paid envelopes and snacks, and for calls, texts, and email. Turnkey Corrections handles account questions at 715-952-9622.",
        sourceLabel: "Official mail and money page",
        sourceUrl: "https://dakotacountymn.gov/residents/public-safety-justice/jail/mail-money"
      },
      {
        title: "Phone and mail",
        body: "Address letters to the inmate's name, Dakota County Law Enforcement Center, P.O. Box 247J, Hastings, MN 55033. Letters, photos, and plain greeting cards are accepted. Stamps, envelopes, blank paper, newspapers, books, magazines, cash, checks, and cards with glitter, glue, or music are not. Calls, texts, and email run through accounts that family funds at Inmate Canteen.",
        sourceLabel: "Official mail and money page",
        sourceUrl: "https://dakotacountymn.gov/residents/public-safety-justice/jail/mail-money"
      },
      {
        title: "Bail and court records",
        body: "Cash bail on Dakota County charges is paid at District Court, 1560 Highway 55 in Hastings, weekdays from 8 a.m. to 4:30 p.m. After 4:30 p.m. and on weekends and holidays, the jail lobby takes bail in cash, in the exact amount. Bail on another county's warrant is taken only while the person is held in the Dakota County Jail. A bonding agent can post a bond instead of cash bail.",
        sourceLabel: "Official posting bail page",
        sourceUrl: "https://dakotacountymn.gov/residents/public-safety-justice/jail/posting-bail"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Dakota County Jail?",
        answer:
          "Video visits at the Law Enforcement Center in Hastings run daily from 7:30 to 9:45 a.m., 3 to 4:45 p.m., and 7 to 9:45 p.m., up to 20 minutes each. Visits from home are set up through Inmate Canteen."
      },
      {
        question: "How do I put money on an inmate's account in Dakota County?",
        answer:
          "Use the 24-hour kiosk in the jail lobby at 1580 Highway 55 in Hastings (cash or card), deposit online through Inmate Canteen, or mail a money order made out to the inmate."
      },
      {
        question: "What is the mailing address for Dakota County Jail?",
        answer:
          "Inmate's name, Dakota County Law Enforcement Center, P.O. Box 247J, Hastings, MN 55033. Do not send stamps, envelopes, blank paper, books, magazines, or cash."
      },
      {
        question: "Where do I post bail in Dakota County?",
        answer:
          "At District Court, 1560 Highway 55 in Hastings, on weekdays from 8 a.m. to 4:30 p.m. After hours and on weekends, the jail lobby takes exact-amount cash bail. A bonding agent can post a bond instead."
      }
    ]
  },
  "minnesota/benton-county": {
    facilityName: "Benton County Jail",
    address: "581 Highway 23, Foley, MN 56329",
    phone: "320-968-8180",
    operatedBy: "Benton County Sheriff's Office",
    reviewedAt: "October 20, 2026",
    overview:
      "The Benton County Sheriff's Office Jail Division holds up to 102 inmates in Foley, and its staff also provide court security and transport prisoners. The Sheriff's Office is at 581 Highway 23 in Foley. Jail administration can be reached at 320-968-8180, Monday through Friday from 8 a.m. to 4 p.m.",
    contactSourceLabel: "Official Jail Division page",
    contactSourceUrl: "https://www.bentoncountymn.gov/220/Jail-Division",
    sections: [
      {
        title: "Visitation",
        body: "Visiting is Tuesday from 8 to 10 p.m., Thursday from 1 to 4 p.m., and Saturday from 8:30 to 11:30 a.m., by appointment only. Call 320-968-8180 on a weekday between 8 a.m. and 4 p.m., at least 24 hours ahead. You must already be on the inmate's approved visitor list, which the inmate requests with your full name, date of birth, address, and phone number. Visits last 20 minutes, and no visits start in the last 15 minutes of a period. Adults need government ID; anyone under 18 must come with a parent or legal guardian, who brings a birth certificate.",
        sourceLabel: "Official Jail Division page",
        sourceUrl: "https://www.bentoncountymn.gov/220/Jail-Division"
      },
      {
        title: "Money and commissary",
        body: "A TurnKey Corrections kiosk in the jail lobby takes cash and credit card deposits to an inmate's account. Deposits can also be made online through the Inmate Canteen website, which requires an account.",
        sourceLabel: "Official Jail Division page",
        sourceUrl: "https://www.bentoncountymn.gov/220/Jail-Division"
      },
      {
        title: "Phone and mail",
        body: "Address letters to Benton County Jail, the inmate's name, P.O. Box 159, Foley, MN 56329. Letters, cards, and drawings must come through the U.S. Postal Service and cannot be dropped off at visits. To leave a phone message, call 320-818-0338, enter the first three letters of the inmate's last name, and speak for up to 20 seconds.",
        sourceLabel: "Official Jail Division page",
        sourceUrl: "https://www.bentoncountymn.gov/220/Jail-Division"
      },
      {
        title: "Bail and court records",
        body: "The roster shows the bonds set for each person, including when none is allowed. The county does not post how bonds are paid, so call jail administration at 320-968-8180 to ask. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official Jail Division page",
        sourceUrl: "https://www.bentoncountymn.gov/220/Jail-Division"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Benton County Jail?",
        answer:
          "Tuesday 8 to 10 p.m., Thursday 1 to 4 p.m., and Saturday 8:30 to 11:30 a.m., by appointment. Call 320-968-8180 at least 24 hours ahead; you must be on the inmate's approved visitor list."
      },
      {
        question: "How do I put money on a Benton County inmate's account?",
        answer:
          "Use the TurnKey kiosk in the jail lobby (cash or credit card) or deposit online through the Inmate Canteen website."
      },
      {
        question: "What is the mailing address for the Benton County Jail?",
        answer:
          "Benton County Jail, the inmate's name, P.O. Box 159, Foley, MN 56329. Mail must come through the U.S. Postal Service."
      },
      {
        question: "Can I leave a message for a Benton County inmate?",
        answer:
          "Yes. Call 320-818-0338, enter the first three letters of the inmate's last name, and leave a message of up to 20 seconds."
      }
    ]
  },
  "minnesota/freeborn-county": {
    facilityName: "Freeborn County Adult Detention Center",
    address: "411 Broadway S, Albert Lea, MN 56007",
    phone: "507-377-4683",
    operatedBy: "Freeborn County Sheriff's Office",
    reviewedAt: "October 21, 2026",
    overview:
      "The Freeborn County Adult Detention Center is a 138-bed direct supervision jail in the Freeborn County Government Center at 411 Broadway S in Albert Lea. It is run by the Sheriff's Office and also holds federal ICE detainees. Master Control answers at 507-377-4683 and the Intake Unit at 507-377-4681.",
    contactSourceLabel: "Official Adult Detention Center page",
    contactSourceUrl: "https://www.freeborncountymn.gov/296/Adult-Detention-Center",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video. Visiting is free from the stations in the Law Enforcement Center lobby of the Government Center, open Monday through Friday until 4:30 p.m. You can also visit from home through Inmate Canteen (inmatecanteen.com) for a fee. To see someone in the Intake/Release or Segregation units, use the lobby phone to reach Master Control, or call the Intake Unit at 507-377-4681 to set up a remote visit. People in the Intake Unit can't have visits until they have made a first appearance before a Freeborn County judge. Minors must be supervised the whole time, cell phones are not allowed in the visiting rooms, and there is a dress code: no sleeveless or tank tops, hats, shorts, miniskirts, see-through clothing, or camouflage.",
        sourceLabel: "Official Detainee Visitation sheet",
        sourceUrl: "https://www.freeborncountymn.gov/DocumentCenter/View/9666/Detainee-Visitation"
      },
      {
        title: "Money and commissary",
        body: "The TurnKey kiosk in the Law Enforcement Center lobby takes cash and credit cards; it does not take personal checks or coins. Money orders made out to the detainee can be mailed in. Card deposits can also be made online through Inmate Canteen (secure.inmatecanteen.com), which charges a processing fee.",
        sourceLabel: "Official Detainee Money sheet",
        sourceUrl: "https://www.freeborncountymn.gov/DocumentCenter/View/7335/Detainee-Money"
      },
      {
        title: "Phone and mail",
        body: "Address letters to the detainee's name, PO Box 170, Albert Lea, MN 56007. Mail must come through the U.S. Postal Service and is checked for contraband. Detainees can get letters, plain greeting cards, and up to three photos, but no Polaroids. Phone cards are sold through Reliance Telephone (reliancetelephone.com); to accept collect calls, call 800-896-3201 to set up your number. The jail's inmate voicemail line is 507-391-9296.",
        sourceLabel: "Official Adult Detention Center page",
        sourceUrl: "https://www.freeborncountymn.gov/296/Adult-Detention-Center"
      },
      {
        title: "Bail and court records",
        body: "New arrests go to court Monday through Friday at 11 a.m., usually the day after the arrest and sometimes the second day. There is no court on weekends, holidays, or evenings. People released after their first appearance usually leave between 2 and 3 p.m. The county does not post how bail is paid, so call Master Control at 507-377-4683 to ask. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official Adult Detention Center page",
        sourceUrl: "https://www.freeborncountymn.gov/296/Adult-Detention-Center"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Freeborn County jail?",
        answer:
          "Visits are by video only. Use the free stations in the Law Enforcement Center lobby, Monday through Friday until 4:30 p.m., or visit from home through Inmate Canteen for a fee."
      },
      {
        question: "How do I put money on a Freeborn County detainee's account?",
        answer:
          "Use the TurnKey kiosk in the Law Enforcement Center lobby (cash or credit card), mail a money order made out to the detainee, or deposit online through Inmate Canteen."
      },
      {
        question: "What is the mailing address for the Freeborn County jail?",
        answer:
          "The detainee's name, PO Box 170, Albert Lea, MN 56007. Send it by U.S. mail; Polaroid photos are not accepted."
      },
      {
        question: "Why isn't someone on the Freeborn County list?",
        answer:
          "The county posts a new list on weekday mornings, so people booked since then won't show yet. ICE detainees are not on the county's list; the county points to the ICE online detainee locator for them."
      }
    ]
  },
  "minnesota/cottonwood-county": {
    facilityName: "Cottonwood County Jail",
    address: "902 5th Avenue, Windom, MN 56101",
    phone: "507-831-1375",
    operatedBy: "Cottonwood County Sheriff's Office",
    reviewedAt: "October 22, 2026",
    overview:
      "The Cottonwood County Jail is part of the Sheriff's Office building at 902 5th Avenue in Windom. Enter the Sheriff's Office lobby and go to the front window, where jail staff can help. Jail administration, including Jail Administrator Jason Rupp, can be reached at 507-831-1375.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl:
      "https://www.cottonwoodcountymn.gov/departments/courts___legal/sheriff/jail.php",
    sections: [
      {
        title: "Visitation",
        body: "Visits are free video visits from a kiosk in the Law Enforcement Center: Sunday 8 to 11 a.m. and 1 to 4 p.m., Thursday 1 to 4 p.m. and 7 to 9 p.m., and Saturday 8 to 10 a.m. Sign up at least 24 hours ahead through the Reliance Telephone visitation scheduler. Visitors must be family members 18 or older, though an inmate may also ask for two visitors who aren't family; immediate family means parents, siblings, spouse, children, and grandparents, not in-laws. An inmate's underage children can visit with an adult on the visiting list and must bring a birth certificate. Everyone over 18 needs a government photo ID; work, school, and check-cashing IDs are not accepted. Each visitor gets 20 minutes per visiting day.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.cottonwoodcountymn.gov/departments/courts___legal/sheriff/jail.php"
      },
      {
        title: "Money and commissary",
        body: "The kiosk at the jail takes cash and credit cards for deposits to an inmate's account. Money orders and cashier's checks made out to the inmate can be mailed in; personal checks are not accepted. Online deposits go through JailATM. Staff can't discuss an inmate's account with anyone but the inmate.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.cottonwoodcountymn.gov/departments/courts___legal/sheriff/jail.php"
      },
      {
        title: "Phone and mail",
        body: "Address mail to the inmate's name, Cottonwood County Jail, 902 5th Avenue, Windom, MN 56101. Only U.S. Postal Service mail is delivered, and all of it is inspected. The jail doesn't accept stamps or envelopes dropped off by visitors; inmates buy them through commissary. Inmate phones only take $10 Reliance phone cards, sold online through Reliance Telephone, and collect calls can be set up at 1-800-896-3201. Staff don't take messages, but you can leave one on the inmate message line at 507-407-2026; those messages are not confidential.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.cottonwoodcountymn.gov/departments/courts___legal/sheriff/jail.php"
      },
      {
        title: "Bail and court records",
        body: 'The roster lists each bail amount set by the court or a warrant, and "ROR" means release on recognizance. The Sheriff\'s Office does not post how bail is paid, so call the jail at 507-831-1375 to ask. A roster entry is a record of arrest, not a finding of guilt.',
        sourceLabel: "Official Jail Roster page",
        sourceUrl:
          "https://www.cottonwoodcountymn.gov/departments/courts___legal/sheriff/jail_roster.php"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Cottonwood County Jail?",
        answer:
          "Free video visits run Sunday 8 to 11 a.m. and 1 to 4 p.m., Thursday 1 to 4 p.m. and 7 to 9 p.m., and Saturday 8 to 10 a.m. Sign up at least 24 hours ahead."
      },
      {
        question: "What is the mailing address for the Cottonwood County Jail?",
        answer:
          "The inmate's name, Cottonwood County Jail, 902 5th Avenue, Windom, MN 56101. Send it through the U.S. Postal Service."
      },
      {
        question: "How do I put money on a Cottonwood County inmate's account?",
        answer:
          "Use the kiosk at the jail (cash or credit card), mail a money order or cashier's check made out to the inmate, or deposit online through JailATM."
      },
      {
        question: "Can I leave a message for a Cottonwood County inmate?",
        answer: "Yes. Call the inmate message line at 507-407-2026. Messages are not confidential."
      }
    ]
  },
  "minnesota/clearwater-county": {
    facilityName: "Clearwater County Jail",
    address: "213 Main Ave. N., Bagley, MN 56621",
    phone: "218-694-6226",
    operatedBy: "Clearwater County Sheriff's Office",
    reviewedAt: "October 31, 2026",
    overview:
      "The Clearwater County Sheriff's Office runs the county jail in Bagley, which holds adult men and women, both awaiting trial and sentenced. The Sheriff's Office is at 213 Main Avenue North and answers at 218-694-6226.",
    contactSourceLabel: "Official Sheriff's Office page",
    contactSourceUrl: "https://clearwatercountymn.gov/sheriff",
    sections: [
      {
        title: "Visitation",
        body: "Visits are non-contact and last 15 to 20 minutes. Visiting hours are Tuesday 6:30 to 8:30 p.m., Friday 8 to 10 a.m., and Saturday 12:30 to 4:30 p.m. Call to book a visit by noon the day before. Bring a photo ID; visitors get a warrant check, a dress code applies, and minors must come with a parent or guardian. Each inmate can have up to four visits a week. People on felony probation or felony release conditions, and anyone held at this jail in the last six months, cannot visit.",
        sourceLabel: "Official jail page",
        sourceUrl:
          "https://clearwatercountymn.gov/index.asp?SEC=4EDE8BC4-9827-4EA4-A98B-0F31978FDB51"
      },
      {
        title: "Money and commissary",
        body: "Deposit money online through Inmate Canteen, or in person at the TurnKey kiosk in the jail lobby, which takes cash and credit cards.",
        sourceLabel: "Official jail page",
        sourceUrl:
          "https://clearwatercountymn.gov/index.asp?SEC=4EDE8BC4-9827-4EA4-A98B-0F31978FDB51"
      },
      {
        title: "Phone and mail",
        body: "Leave a voicemail for an inmate at 218-214-7070 with your name, call-back number, and the inmate's name; inmates hear messages during their phone time. Phone cards of $20, $50, or $100 can be bought through Reliance Telephone. Address letters to Clearwater County Jail, the inmate's full name, 213 Main Ave. N., Dept. 101, Bagley, MN 56621.",
        sourceLabel: "Official jail page",
        sourceUrl:
          "https://clearwatercountymn.gov/index.asp?SEC=4EDE8BC4-9827-4EA4-A98B-0F31978FDB51"
      },
      {
        title: "Bail and court records",
        body: "The inmate list does not show bail amounts, and the county site does not explain how to post bail. Call the Sheriff's Office at 218-694-6226 to ask about bail. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official Sheriff's Office page",
        sourceUrl: "https://clearwatercountymn.gov/sheriff"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Clearwater County Jail?",
        answer:
          "Tuesday 6:30 to 8:30 p.m., Friday 8 to 10 a.m., and Saturday 12:30 to 4:30 p.m. Call to book by noon the day before and bring a photo ID."
      },
      {
        question: "How do I put money on a Clearwater County inmate's account?",
        answer:
          "Deposit online through Inmate Canteen, or use the TurnKey kiosk in the jail lobby, which takes cash and credit cards."
      },
      {
        question: "Where do I send a letter to a Clearwater County inmate?",
        answer:
          "Clearwater County Jail, inmate's full name, 213 Main Ave. N., Dept. 101, Bagley, MN 56621."
      },
      {
        question: "How do I find out about bail in Clearwater County?",
        answer: "The inmate list does not show bail. Call the Sheriff's Office at 218-694-6226."
      }
    ]
  },
  "minnesota/redwood-county": {
    facilityName: "Redwood County Jail",
    address: "303 E 3rd Street, Redwood Falls, MN 56283",
    phone: "507-637-1313",
    operatedBy: "Redwood County Sheriff's Office",
    reviewedAt: "October 23, 2026",
    overview:
      "The Redwood County Jail is at 303 East 3rd Street in Redwood Falls, connected to the Redwood County Law Enforcement Center; use the entrance on the east side of the building. The jail's number is 507-637-1313, and the Jail Administrator can be reached at 507-637-1343.",
    contactSourceLabel: "Official Sheriff's Office page",
    contactSourceUrl: "https://redwoodcounty-mn.gov/departments/sheriffs-office/",
    sections: [
      {
        title: "Visitation",
        body: "Visiting hours are Saturday 1:30 to 4:30 p.m., Monday 6 to 9 p.m., Tuesday 1:30 to 4:30 p.m., and Friday 1:30 to 4:30 p.m. Visits are by video in the jail lobby and last up to 20 minutes, once a day with any one visitor, and each inmate can have two adult visitors a day. Children under 18 can visit immediate family only during the Saturday period, and children 15 and younger must come with an adult family member. Visitors are registered, may be asked for ID, and are subject to a frisk search; anyone who appears to be under the influence is turned away.",
        sourceLabel: "Official Sheriff's Office page",
        sourceUrl: "https://redwoodcounty-mn.gov/departments/sheriffs-office/"
      },
      {
        title: "Money and commissary",
        body: "Deposits for an inmate can be made day or night at the kiosk in the jail entrance, or online through JailATM (deposits.jailatm.com).",
        sourceLabel: "Official Sheriff's Office page",
        sourceUrl: "https://redwoodcounty-mn.gov/departments/sheriffs-office/"
      },
      {
        title: "Phone and mail",
        body: "Phone cards for inmates are sold online through Reliance Telephone. Letters, pictures, and anything else for an inmate must come through the U.S. Postal Service; personal items and food can't be dropped off. The Sheriff's Office mailing address is P.O. Box 47, Redwood Falls, MN 56283; call the jail at 507-637-1313 to confirm how to address mail to an inmate.",
        sourceLabel: "Official Sheriff's Office page",
        sourceUrl: "https://redwoodcounty-mn.gov/departments/sheriffs-office/"
      },
      {
        title: "Bail and court records",
        body: "The roster lists the bail set for each person when there is one. The Sheriff's Office does not post how bail is paid, so call the jail at 507-637-1313 to ask. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official In Custody page",
        sourceUrl: "https://redwoodcounty-mn.gov/departments/sheriffs-office/in-custody/"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Redwood County Jail?",
        answer:
          "Saturday 1:30 to 4:30 p.m., Monday 6 to 9 p.m., Tuesday 1:30 to 4:30 p.m., and Friday 1:30 to 4:30 p.m. Visits are by video in the jail lobby, up to 20 minutes."
      },
      {
        question: "Can children visit an inmate at the Redwood County Jail?",
        answer:
          "Only during the Saturday visiting period, and only to visit immediate family. Children 15 and younger must come with an adult family member."
      },
      {
        question: "How do I put money on a Redwood County inmate's account?",
        answer:
          "Use the kiosk in the jail entrance, open day and night, or deposit online through JailATM."
      },
      {
        question: "Where is the Redwood County Jail?",
        answer:
          "At 303 East 3rd Street in Redwood Falls, connected to the Law Enforcement Center. Use the east entrance. The jail's number is 507-637-1313."
      }
    ]
  },
  "minnesota/nobles-county": {
    facilityName: "Nobles County Jail",
    address: "1530 Airport Ste 200, Worthington, MN 56187",
    phone: "507-295-5290",
    operatedBy: "Nobles County Sheriff's Office",
    reviewedAt: "October 20, 2026",
    overview:
      "The Nobles County Jail is in the Prairie Justice Center in Worthington. The jail's phone number is 507-295-5290, and other questions go to the Sheriff's Office at 507-295-5400. Jail staff will not share anything about an inmate's account with anyone but the inmate, and the jail does not take messages for inmates.",
    contactSourceLabel: "Official jail information guide",
    contactSourceUrl: "https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/",
    sections: [
      {
        title: "Visitation",
        body: "Visiting hours are Sunday from 9 to 11 a.m. and 7 to 10 p.m., Tuesday from 7 to 10 p.m., and Thursday from 9 to 11 a.m. Every visitor has to register with Reliance Telephone first and book at least four hours before the visiting period, online or at 507-295-5378. Visits last 20 minutes, up to twice a day and four times a week. Bring photo ID. A child under 18 may visit only a parent or legal guardian, must come with a parent or guardian, and needs a birth certificate or guardianship papers; siblings under 18 cannot visit.",
        sourceLabel: "Official jail information guide",
        sourceUrl: "https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/"
      },
      {
        title: "Money and commissary",
        body: "Deposits can be made online at jailatm.com or at the kiosk in the main entrance of the Prairie Justice Center, which takes cash and credit cards. The jail also takes money orders and cashier's checks payable to the Nobles County Jail with the inmate's name on them, during visitation or by mail. Personal checks are not accepted.",
        sourceLabel: "Official jail information guide",
        sourceUrl: "https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/"
      },
      {
        title: "Phone and mail",
        body: "Leave a message for an inmate at 507-407-2017; these messages are not confidential. Inmates call out with Reliance phone cards of $10 or $20, sold at the jail or at reliancetelephone.com, and collect calls can be set up at 800-896-3201. Mail must come through the U.S. Postal Service to the inmate's name, Nobles County Jail, 1530 Airport Ste 200, Worthington, MN 56187. Personal mail is copied for the inmate and the original destroyed. Photos, books, and magazines are not allowed.",
        sourceLabel: "Official jail information guide",
        sourceUrl: "https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office does not post how to post bail. Call the jail at 507-295-5290 to ask about an inmate's bail and how to pay it. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official jail information guide",
        sourceUrl: "https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/"
      }
    ],
    faq: [
      {
        question: "When are visiting hours at the Nobles County Jail?",
        answer:
          "Sunday 9 to 11 a.m. and 7 to 10 p.m., Tuesday 7 to 10 p.m., and Thursday 9 to 11 a.m. Register with Reliance Telephone and book at least four hours ahead."
      },
      {
        question: "How do I put money on a Nobles County inmate's account?",
        answer:
          "Online at jailatm.com, at the kiosk in the Prairie Justice Center entrance, or with a money order or cashier's check payable to the Nobles County Jail. Personal checks are not accepted."
      },
      {
        question: "What is the mailing address for the Nobles County Jail?",
        answer:
          "The inmate's name, Nobles County Jail, 1530 Airport Ste 200, Worthington, MN 56187. Mail is copied and the originals destroyed."
      },
      {
        question: "Can I leave a message for a Nobles County inmate?",
        answer:
          "Yes, through the inmate message line at 507-407-2017. Messages are not confidential, and jail staff do not take messages."
      }
    ]
  },
  "minnesota/hennepin-county": {
    facilityName: "Hennepin County Adult Detention Center",
    address: "401 South 4th Avenue, Suite 100, Minneapolis, MN 55415",
    phone: "612-348-5112",
    operatedBy: "Hennepin County Sheriff's Office",
    reviewedAt: "October 19, 2026",
    overview:
      "The Hennepin County jail, also called the Adult Detention Center, holds adults accused of crimes before trial in downtown Minneapolis. It is split between two buildings across the street from each other: the Public Safety Facility at 401 South 4th Avenue and Minneapolis City Hall at 350 South 5th Street, both just north of the Government Plaza light rail station. The jail information line is 612-348-5112. The Sheriff's Office warns that it never calls families asking for payment.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.hennepinsheriff.org/jail-warrants/jail",
    sections: [
      {
        title: "Visitation",
        body: "Visits are 20 minutes by video monitor in room 235 on the second floor of the Public Safety Facility, seven days a week from 7 to 11:30 a.m., 2:30 to 5:30 p.m., and 7:30 to 9:30 p.m. On-site visits are free. Create a visitor profile with Securus Friends & Family, wait for jail staff to approve it, and book at least 24 hours ahead. A detainee can have visitors once a day and up to three times a week. Arrive 10 minutes early with a photo ID; visitors under 18 must come with an adult. Detainees can also make paid video calls to approved Securus accounts.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.hennepinsheriff.org/jail-warrants/jail"
      },
      {
        title: "Money and commissary",
        body: "Cash can go into the deposit machine in the Public Safety Facility lobby at any hour, or in the City Hall visiting area weekdays from 7 a.m. to 5 p.m. You need the detainee's exact name and personal identification number (PAK), which is on the roster posted in each lobby. Online deposits go through Access Corrections (choose Hennepin County Adult Detention Center in Downtown Minneapolis). Cash or a money order can also be mailed to 401 S. 4th Ave., Suite 100, Minneapolis, MN 55415. Detainees pay 10% of each withdrawal, up to $10.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.hennepinsheriff.org/jail-warrants/jail"
      },
      {
        title: "Phone and mail",
        body: "Detainees can call out, but you cannot call in to them. Questions about collect-call bills, or to block calls, go to Correctional Billing Services. Mail goes through the U.S. Postal Service to the detainee's full name, Hennepin County Public Safety Facility, 401 South 4th Avenue, Minneapolis, MN 55415. Packages have to come straight from a publisher, mail-order bookseller, attorney, or court official, unless they hold something the detainee needs for court or release, such as clothing.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.hennepinsheriff.org/jail-warrants/jail"
      },
      {
        title: "Bail and court records",
        body: "Bail is posted 24 hours a day at the in-custody records window in the Public Safety Facility, after weapons screening. Bring the case or warrant number and the exact amount in cash; the jail makes no change, has no cash machine, and does not take checks or cards. A bonding agency can post a bond instead, but the jail will not refer you to one. For bail information by phone, call 612-348-5112 with the detainee's full name and date of birth. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.hennepinsheriff.org/jail-warrants/jail"
      }
    ],
    faq: [
      {
        question: "How do I visit someone in the Hennepin County jail?",
        answer:
          "Set up a Securus Friends & Family visitor profile, wait for jail approval, and book a 20-minute video visit at least 24 hours ahead. Visits are in room 235 of the Public Safety Facility, 401 South 4th Avenue."
      },
      {
        question: "How do I put money on a Hennepin County detainee's account?",
        answer:
          "Use the cash deposit machine at the Public Safety Facility (any hour) or City Hall (weekdays 7 a.m. to 5 p.m.), deposit online through Access Corrections, or mail cash or a money order to 401 S. 4th Ave., Suite 100, Minneapolis, MN 55415."
      },
      {
        question: "Where do I post bail in Hennepin County?",
        answer:
          "At the in-custody records window in the Public Safety Facility, 24 hours a day. Bring the exact amount in cash and the case or warrant number."
      },
      {
        question: "What is the mailing address for the Hennepin County jail?",
        answer:
          "The detainee's full name, Hennepin County Public Safety Facility, 401 South 4th Avenue, Minneapolis, MN 55415."
      }
    ]
  },
  "minnesota/winona-county": {
    facilityName: "Winona County Detention Center",
    address: "203 W. 3rd St., Winona, MN 55987",
    phone: "507-457-6503",
    operatedBy: "Winona County Sheriff's Office",
    reviewedAt: "October 18, 2026",
    overview:
      "The Winona County Detention Center is the county's new jail at 203 W. 3rd St. in Winona, next to the Sheriff's Office at 201 W. 3rd St. It has 53 cells with 80 beds and runs a Sentence-to-Serve program, with Huber work release still being set up. The detention center's phone number is 507-457-6503.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.winonacounty.gov/314/Jail",
    sections: [
      {
        title: "Visitation",
        body: "On-site visiting is Tuesday from noon to 4 p.m., Saturday from 8 a.m. to noon, and Sunday from 6 to 10 p.m. at 203 W. 3rd St. Each person in custody can have two 20-minute visits per visiting day, and the two visits cannot be from the same person. Bring a photo ID, keep children supervised, dress appropriately, and leave electronic devices out of the visiting rooms. Staff can end a visit at any time for safety.",
        sourceLabel: "Official visiting and mailing page",
        sourceUrl: "https://www.winonacounty.gov/316/Inmate-Visiting-Mailing-Procedures"
      },
      {
        title: "Money and commissary",
        body: "The county does not post how to put money on an inmate's account. People in custody can send five free pre-set texts a day from a rented device to ask family and friends for funds. Call the detention center at 507-457-6503 to ask how deposits are made.",
        sourceLabel: "Official visiting and mailing page",
        sourceUrl: "https://www.winonacounty.gov/316/Inmate-Visiting-Mailing-Procedures"
      },
      {
        title: "Phone and mail",
        body: "Send mail to the inmate's name, Winona County Detention Center, 203 W. 3rd Street, Winona, MN 55987. Calls go through Reliance Telephone and are collect, and every call except one to an attorney may be recorded. To set up a phone account or buy a phone card, contact Reliance Telephone at 800-896-3201. Staff do not transfer personal calls to inmates or pass along messages.",
        sourceLabel: "Official visiting and mailing page",
        sourceUrl: "https://www.winonacounty.gov/316/Inmate-Visiting-Mailing-Procedures"
      },
      {
        title: "Bail and court records",
        body: "Bail is posted at the courthouse reception desk, 171 West 3rd Street, Monday through Friday from 8 a.m. to 4 p.m., or at the jail's North Lobby, 203 West 3rd Street, on nights and weekends. Questions about court dates and fines go to Winona County Court Administration at 507-615-5183. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.winonacounty.gov/Faq.aspx?QID=152"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Winona County jail?",
        answer:
          "Tuesday noon to 4 p.m., Saturday 8 a.m. to noon, and Sunday 6 to 10 p.m. Each person in custody gets two 20-minute visits per visiting day. Bring a photo ID."
      },
      {
        question: "What is the mailing address for the Winona County jail?",
        answer:
          "The inmate's name, Winona County Detention Center, 203 W. 3rd Street, Winona, MN 55987."
      },
      {
        question: "How do I set up phone calls with a Winona County inmate?",
        answer:
          "Calls are collect through Reliance Telephone. Set up an account or buy a phone card at 800-896-3201."
      },
      {
        question: "Where do I post bail in Winona County?",
        answer:
          "At the courthouse reception desk, 171 West 3rd Street, weekdays 8 a.m. to 4 p.m., or at the jail's North Lobby, 203 West 3rd Street, on nights and weekends."
      }
    ]
  },
  "minnesota/clay-county": {
    facilityName: "Clay County Correctional Facility",
    address: "800 9th St. N., Moorhead, MN 56560",
    phone: "218-299-5163",
    operatedBy: "Clay County Sheriff's Office",
    reviewedAt: "October 18, 2026",
    overview:
      "The Clay County Correctional Facility in Moorhead is a 220-bed jail that holds men and women at minimum, medium, and maximum custody levels, with an 18-bed behavioral and mental health unit. It is licensed by the Minnesota Department of Corrections. The public lobby is Door 1, open 8 a.m. to 4:30 p.m., and the facility's phone number is 218-299-5163.",
    contactSourceLabel: "Official Correctional Facility page",
    contactSourceUrl: "https://claycountymn.gov/223/Correctional-Facility",
    sections: [
      {
        title: "Visitation",
        body: "Public visits are by video only, on Reliance kiosks, and must be booked with Reliance Telephone at least 20 hours ahead and by 10 p.m. the night before. Visiting runs Monday through Thursday from 9 a.m. to 7:30 p.m. and Friday from 9 a.m. to 4:30 p.m., with time slots set by floor and by odd or even day. Each visit lasts about 20 minutes, and most inmates get two a week. Check in at the public lobby at least 10 minutes early with a photo ID if you are 18 or older. Two adults, or one adult with a child in their care, can visit together.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://claycountymn.gov/1501/Schedule-an-Inmate-Visit-or-Video-Visita"
      },
      {
        title: "Money and commissary",
        body: "Inmate accounts are run by Turnkey. You can add money online through Inmate Canteen or at the Turnkey kiosk in the public lobby, which charges $2 for a cash deposit and 10% for a card. Money orders can be mailed, but checks are not accepted. Deposits first pay any fees the inmate owes before they can be spent on commissary or phone time.",
        sourceLabel: "Official inmate information page",
        sourceUrl: "https://claycountymn.gov/1498/Find-Inmate-Contact-Funds-Visiting-and-P"
      },
      {
        title: "Phone and mail",
        body: "Mail goes through the U.S. Postal Service to the inmate's full name, C/O Clay County Correctional Facility, 800 9th St. N., Moorhead, MN 56560, with a return address. Soft-cover books have to come straight from a retailer, and Polaroids, clippings, and scented mail are not allowed. Calls run through Reliance Telephone, which sells phone time at 800-896-3201. Inmates can call out from 7:30 a.m. to 10:15 p.m. and can check a free voicemail line at 218-303-1674.",
        sourceLabel: "Official inmate information page",
        sourceUrl: "https://claycountymn.gov/1498/Find-Inmate-Contact-Funds-Visiting-and-P"
      },
      {
        title: "Bail and court records",
        body: "Bail is posted in the public lobby. Press the intercom, say who you are bailing out and how much, and wait for staff before you put money into the Turnkey kiosk. If the court order allows it, a bail bondsman can post the bond instead. Release takes several steps after bail is paid, so the person may not walk out right away. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official bail page",
        sourceUrl: "https://claycountymn.gov/1493/How-to-Post-Bail-at-the-Correctional-Fac"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Clay County jail?",
        answer:
          "Book a video visit with Reliance Telephone at least 20 hours ahead. Visits run Monday through Thursday 9 a.m. to 7:30 p.m. and Friday 9 a.m. to 4:30 p.m. Check in at the lobby 10 minutes early with a photo ID."
      },
      {
        question: "How do I put money on a Clay County inmate's account?",
        answer:
          "Deposit online through Inmate Canteen or at the Turnkey kiosk in the jail lobby, or mail a money order. Checks are not accepted."
      },
      {
        question: "What is the mailing address for the Clay County jail?",
        answer:
          "Inmate's full name, C/O Clay County Correctional Facility, 800 9th St. N., Moorhead, MN 56560. Every letter needs a return address."
      },
      {
        question: "How do I post bail in Clay County?",
        answer:
          "Come to the jail's public lobby, press the intercom, and say who you are bailing out and the amount. Staff will tell you when to pay at the Turnkey kiosk."
      }
    ]
  },
  "iowa/johnson-county": {
    facilityName: "Johnson County Jail",
    address: "511 S. Capitol St., Iowa City, IA 52240",
    phone: "319-356-6025",
    operatedBy: "Johnson County Sheriff's Office",
    reviewedAt: "October 14, 2026",
    overview:
      "The Johnson County Sheriff's Office runs the county jail at 511 S. Capitol St. in Iowa City; its mailing address is PO Box 2540, Iowa City, IA 52244. Jail staff answer questions about an inmate at 319-356-6025, and the jail division's line is 319-356-6020, ext. 5. The Sheriff's roster also includes people boarded in other counties' jails; this page shows only those held at the Johnson County Jail.",
    contactSourceLabel: "Official jail division page",
    contactSourceUrl: "https://johnsoncountyiowa.gov/sheriff/jail-division",
    sections: [
      {
        title: "Visitation",
        body: "Visiting days depend on the first letter of the inmate's last name: A through L on Monday, Wednesday, and Friday; M through Z on Tuesday, Thursday, and Sunday. Visits run 1 to 3 p.m. or 6 to 9 p.m., last 20 minutes in total, and an inmate can have one session a day. Bring a photo ID and sign the log; anyone under 18 must come with a parent or legal guardian. Video visits from home are set up through TEAM3.InmateCanteen.com.",
        sourceLabel: "Official jail division page",
        sourceUrl: "https://johnsoncountyiowa.gov/sheriff/jail-division"
      },
      {
        title: "Money and commissary",
        body: "Canteen accounts run through Inmate Canteen at team3.inmatecanteen.com. Create a user with a valid email address and a password of at least 10 characters; the mobile app no longer works. Anyone with an old inmatecanteen.com account can log in there and is moved to the new site with their balance. Someone reporting to serve a sentence should bring cash only for the accommodation fee.",
        sourceLabel: "Official inmate canteen guide",
        sourceUrl: "https://johnsoncountyiowa.gov/sheriff/jail-division"
      },
      {
        title: "Phone and mail",
        body: "Address letters to the inmate's name at PO Box 2540, Iowa City, IA 52244, with your full name and address as the return address. Letters with stickers, lipstick, perfume, or anything else applied to them are refused. The jail does not accept packages, and books or magazines must come directly from the publisher. For questions about an inmate, call jail staff at 319-356-6025.",
        sourceLabel: "Official jail FAQ",
        sourceUrl: "https://johnsoncountyiowa.gov/sheriff/jail-division-faq"
      },
      {
        title: "Bail and court records",
        body: "Jail staff at 319-356-6025 can tell you whether someone is in custody, what charges they are held on, the bond required for release, and any scheduled release date. They cannot give court information; for that, ask the inmate's attorney or use Iowa Courts Online. People reporting for a sentence bring four sets of all-white underwear, socks, T-shirts, and bras without underwire, cash for the accommodation fee, and medication only in its prescribed bottles; piercings must be removed.",
        sourceLabel: "Official jail FAQ",
        sourceUrl: "https://johnsoncountyiowa.gov/sheriff/jail-division-faq"
      }
    ],
    faq: [
      {
        question: "What day can I visit an inmate at the Johnson County Jail?",
        answer:
          "It depends on the inmate's last name: A through L on Monday, Wednesday, and Friday; M through Z on Tuesday, Thursday, and Sunday. Visits run 1 to 3 p.m. or 6 to 9 p.m. and last 20 minutes."
      },
      {
        question: "Where do I mail a letter to a Johnson County inmate?",
        answer:
          "Write the inmate's name, then PO Box 2540, Iowa City, IA 52244, and put your full name and address on the return address. No stickers, lipstick, or perfume on the letter or envelope."
      },
      {
        question: "What should I bring when reporting to serve a sentence in Johnson County?",
        answer:
          "Four sets of all-white underwear, socks, T-shirts, and bras without underwire, cash for the accommodation fee, and any medication in its prescribed bottles. Piercings must be removed before you arrive."
      },
      {
        question: "What can Johnson County jail staff tell me about an inmate?",
        answer:
          "Call 319-356-6025. Staff can say whether the person is in custody, what charges they are held on, the bond required for release, and any scheduled release date, but not court information."
      }
    ]
  },
  "iowa/polk-county": {
    facilityName: "Polk County Jail",
    address: "1985 NE 51st Place, Des Moines, IA 50313",
    phone: "515-323-5400",
    operatedBy: "Polk County Sheriff's Office",
    reviewedAt: "October 16, 2026",
    overview:
      "The Polk County Jail opened in November 2008 on 40 acres just north of Des Moines. It is the largest jail in Iowa, a 1,500-bed direct-supervision facility with its own kitchen, laundry, and medical services, built so it can add another 1,000 beds. Inmates with federal charges are left off the Sheriff's public listing.",
    contactSourceLabel: "Official detention page",
    contactSourceUrl: "https://www.polkcountyiowa.gov/county-sheriff/detention/",
    sections: [
      {
        title: "Visitation",
        body: "Every visitor has to register with ICSolutions at least 24 hours before the first visit. On-site visits are Sunday from 8:30 to 10:30 a.m. and 12:30 to 2:30 p.m., and Monday through Thursday from 8:30 to 10:30 a.m. and 1 to 2:30 p.m.; there are no on-site public visits Friday or Saturday. Remote video visits run daily from 8:30 a.m. to 9:30 p.m., except 11 a.m. to noon, 3 to 4 p.m., and 5 to 6 p.m., cost $0.25 a minute, and last up to 25 minutes. All visits are recorded.",
        sourceLabel: "Official visiting page",
        sourceUrl: "https://www.polkcountyiowa.gov/county-sheriff/how-do-i/visiting-an-inmate/"
      },
      {
        title: "Money and commissary",
        body: "Deposits to an inmate's commissary account, and CarePack orders, are made through Access Corrections at accesscatalog.com. Money for phone calls goes into a separate ICSolutions account. The Sheriff's Office does not accept packages or other property for inmates, and property for people in custody is released only Monday through Friday, 8 a.m. to 3:45 p.m.",
        sourceLabel: "Official jail how-do-I page",
        sourceUrl: "https://www.polkcountyiowa.gov/county-sheriff/how-do-i/jail-how-do-i/"
      },
      {
        title: "Phone and mail",
        body: "Mail has to come through the U.S. Postal Service with the sender's full name and address on the envelope, addressed to the inmate's complete name, Polk County Jail, 1985 NE 51st Place, Des Moines, IA 50313-2517. Each inmate may keep up to five photos, 4 by 6 inches or smaller, sent by mail; Polaroids are not accepted. Family can leave a 30-second voicemail for an inmate through ICSolutions for $0.25.",
        sourceLabel: "Official jail how-do-I page",
        sourceUrl: "https://www.polkcountyiowa.gov/county-sheriff/how-do-i/jail-how-do-i/"
      },
      {
        title: "Bail and court records",
        body: "The Sheriff's Office does not post bail steps on its jail pages. Pretrial release can be reached at 515-875-5750, and court dates, times, and rooms come from the Clerk of Court at 515-286-3765. Jail court hearings can be watched on closed-circuit television in the jail lobby. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official jail how-do-I page",
        sourceUrl: "https://www.polkcountyiowa.gov/county-sheriff/how-do-i/jail-how-do-i/"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Polk County Jail?",
        answer:
          "On-site visits are Sunday through Thursday mornings and early afternoons; remote video visits run daily from 8:30 a.m. to 9:30 p.m. with three one-hour breaks. Register with ICSolutions at least 24 hours ahead."
      },
      {
        question: "How do I put money on an inmate's account in Polk County?",
        answer:
          "Commissary deposits and CarePacks go through Access Corrections at accesscatalog.com. Money for phone calls is added separately through ICSolutions."
      },
      {
        question: "What is the mailing address for Polk County Jail?",
        answer:
          "Inmate's complete name, Polk County Jail, 1985 NE 51st Place, Des Moines, IA 50313-2517. Include your full name and return address, or the letter is sent back."
      },
      {
        question: "Who do I call about a Polk County inmate's court date or release?",
        answer:
          "Call the Clerk of Court at 515-286-3765 for court dates, times, and rooms, and Pretrial Release at 515-875-5750. The jail's main line is 515-323-5400."
      }
    ]
  },
  "iowa/woodbury-county": {
    facilityName: "Woodbury County Jail",
    address: "3701 28th Street, Sioux City, IA 51105",
    phone: "712-279-6040",
    operatedBy: "Woodbury County Sheriff's Office",
    reviewedAt: "October 17, 2026",
    overview:
      "The Woodbury County Jail sits inside the Law Enforcement Center in Sioux City, which was finished in 2024. It holds up to 498 people, both awaiting trial and serving sentences, along with federal prisoners kept under a contract with the U.S. Marshals Service. Jail Administration is open 8 a.m. to 3 p.m., Monday through Friday.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.woodburycountyiowa.gov/sheriff/jail/",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video, Monday through Friday, from 10 to 11 a.m. and from 12:30 to 3:15 p.m. Check in at Jail Administration between 9:45 and 10:25 a.m. for the morning block, or between noon and 2:40 p.m. for the afternoon. There are no visits on holidays. Someone who was recently arrested has to wait 90 days after a serious or aggravated misdemeanor arrest and one year after a felony arrest; after a simple misdemeanor, they can visit the next day.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.woodburycountyiowa.gov/sheriff/jail/"
      },
      {
        title: "Money and commissary",
        body: "Jail Administration no longer takes cash. Deposits go through the ATM in the Law Enforcement Center vestibule, open around the clock, or online through Inmate Canteen. Property from home is not accepted either; inmates buy what they need through their commissary account. Soft-cover Bibles are taken weekdays from 8 a.m. to 3:15 p.m., and on Wednesdays you can drop off up to two new soft-cover books with a receipt. Bring ID to the Jail Administration window.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.woodburycountyiowa.gov/sheriff/jail/"
      },
      {
        title: "Phone and mail",
        body: "Inmate calls are collect through NCIC; set up an account by calling 1-800-943-2189. Personal mail goes to PO Box 591, Longview, TX 75606, where it is scanned for the inmate and then destroyed, photos included. Mail sent anywhere else is returned, and mail without a return name and address is destroyed. Verified attorneys send legal mail, marked as legal mail, to the inmate's name, Woodbury County Jail, PO Box 3083, Sioux City, IA 51102.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.woodburycountyiowa.gov/sheriff/jail/"
      },
      {
        title: "Bail and court records",
        body: "Call 712-279-6040 to confirm a bond amount and the conditions of release. A cash bond is posted with the Woodbury County Clerk of Court, Monday through Friday from 8 a.m. to 4:30 p.m., and at the jail after hours. Approved bondsmen are listed in the local yellow pages. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.woodburycountyiowa.gov/sheriff/jail/"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Woodbury County Jail?",
        answer:
          "Video visits run Monday through Friday from 10 to 11 a.m. and 12:30 to 3:15 p.m. Check in at Jail Administration from 9:45 to 10:25 a.m. or noon to 2:40 p.m. No visits on holidays."
      },
      {
        question: "How do I put money on a Woodbury County inmate's account?",
        answer:
          "Use the ATM in the Law Enforcement Center vestibule, which is open 24/7, or deposit online through Inmate Canteen. Jail Administration does not take money."
      },
      {
        question: "Where do I send a letter to a Woodbury County inmate?",
        answer:
          "PO Box 591, Longview, TX 75606. The letter is scanned for the inmate and then destroyed, so do not send originals you want back. Include your name and return address."
      },
      {
        question: "How do I post bond in Woodbury County?",
        answer:
          "Call 712-279-6040 to confirm the amount. Pay a cash bond at the Clerk of Court on weekdays from 8 a.m. to 4:30 p.m., or at the jail after hours."
      }
    ]
  },
  "iowa/clinton-county": {
    facilityName: "Clinton County Jail",
    address: "241 Seventh Avenue North, Clinton, IA 52732",
    phone: "563-242-9211",
    operatedBy: "Clinton County Sheriff's Office",
    reviewedAt: "October 25, 2026",
    overview:
      "The Clinton County Jail is in the Law Center on Seventh Avenue North in Clinton, the same building as the Sheriff's Office. Besides people arrested in the county, it holds people for other agencies, such as neighboring sheriff's offices. The business office is open 8 a.m. to 4 p.m., Monday through Friday, and stays open over lunch.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.clintoncounty-ia.gov/sheriff/jail/",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video and are recorded. They run Monday through Friday from 1 to 3:30 p.m., first come, first served, with no visits on holidays. An inmate has to be in general population first and gets two 30-minute visits a week. Create an account on inmatecanteen.com, then sign in at the lobby kiosk and pick the inmate. Adults need a valid state ID, children must come with a parent, grandparent, or legal guardian, and no more than four people can visit at once. Phones and other electronic devices stay in the car, and staff can end a visit over clothing they consider inappropriate.",
        sourceLabel: "Official visitation page",
        sourceUrl: "https://www.clintoncounty-ia.gov/sheriff/visitation/"
      },
      {
        title: "Money and commissary",
        body: "Staff do not take cash or personal checks. Put money on an inmate's account at the cashier machine in the Law Center lobby, which takes debit and credit cards and cash (no $1 bills) for a small fee, or online at inmatecanteen.com. The jail accepts only legal documents and up to five photos no larger than 3 by 5 inches, with no Polaroids; hygiene items are bought through commissary. Money in the account is released only for attorney fees, the inmate's own fines or bond, commissary, and work release payments.",
        sourceLabel: "Official inmate property page",
        sourceUrl: "https://www.clintoncounty-ia.gov/sheriff/inmate_property/"
      },
      {
        title: "Phone and mail",
        body: "Inmates make audio and video calls, texts, and email from tablets between 5 a.m. and 9:45 p.m., every day, and calls may be monitored. Calls are person to person only; three-way calls can cost an inmate phone privileges for good. Staff will not take messages for inmates, so write a letter instead. To block collect calls or sort out a billing problem, call 715-952-9622. Address mail to Clinton County Jail, the inmate's name, P.O. Box 2957, Clinton, IA 52733, with your full name and address on the envelope. Letters without a return address are sent back, and greeting cards larger than 6 by 9 inches go into the inmate's property until release.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.clintoncounty-ia.gov/sheriff/jail/"
      },
      {
        title: "Bail and court records",
        body: "The jail portal lists each charge, warrant, or hold with its bond: cash only, cash or surety, or no bond. Call the Sheriff's Office at 563-242-9211 to confirm an amount and how to post it. An inmate can also have money from their own account released to post their own bond. A listing is a record of a hold, not a finding of guilt.",
        sourceLabel: "Official inmate money page",
        sourceUrl: "https://www.clintoncounty-ia.gov/sheriff/inmate_money/"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Clinton County Jail?",
        answer:
          "Video visits run Monday through Friday from 1 to 3:30 p.m., first come, first served, except holidays. You need an inmatecanteen.com account to sign in at the lobby kiosk, and each inmate gets two 30-minute visits a week."
      },
      {
        question: "How do I put money on a Clinton County inmate's account?",
        answer:
          "Use the cashier machine in the Law Center lobby, which takes cards and cash but not $1 bills, or deposit online at inmatecanteen.com. Staff do not accept cash or personal checks."
      },
      {
        question: "Where do I send a letter to a Clinton County inmate?",
        answer:
          "Clinton County Jail, the inmate's name, P.O. Box 2957, Clinton, IA 52733. Put your full name and return address on the envelope, or the letter is sent back."
      },
      {
        question: "How do I find out a bond amount in Clinton County?",
        answer:
          "The roster shows the bond listed for each charge or hold. Call the Sheriff's Office at 563-242-9211 to confirm it and ask how to post it."
      }
    ]
  },
  "iowa/wapello-county": {
    facilityName: "Wapello County Jail",
    address: "330 W 2nd St, Ottumwa, IA 52501",
    phone: "641-684-4350",
    operatedBy: "Wapello County Sheriff's Office",
    reviewedAt: "November 1, 2026",
    overview:
      "The Wapello County Sheriff's Office runs the 148-bed county jail in the joint Wapello County and City of Ottumwa Law Enforcement Center at 330 W 2nd St in Ottumwa. The jail answers at 641-684-4350 around the clock.",
    contactSourceLabel: "Official Sheriff and Jail page",
    contactSourceUrl: "https://www.wapellocounty.org/sheriff_and_jail/",
    sections: [
      {
        title: "Visitation",
        body: "Visits at the jail are Monday through Thursday, 6:30 to 9 p.m., by phone and video monitor in the jail lobby. You must be on the inmate's visitor list and bring a state photo ID; to get on the list, write the inmate a letter asking to be added. Each inmate gets 30 minutes of visits a week in total, and children must be supervised. Remote video visits run through Prodigy; Prodigy's number is 866-700-4545.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.wapellocounty.org/sheriff_and_jail/jail/"
      },
      {
        title: "Money and commissary",
        body: "The jail does not take cash or personal checks, and nothing can be dropped off. Mail a money order or cashier's check to the inmate, send money by card through Smart Deposit (866-394-0490) or Western Union (800-634-3422), or use the kiosk in the jail lobby.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.wapellocounty.org/sheriff_and_jail/faq/"
      },
      {
        title: "Phone and mail",
        body: "Inmate calls go through Prodigy and cost 30 cents a minute, or 15 cents a text message. Inmates pay from their commissary account, and family can add phone money at 866-797-5578 or online. To block calls from the jail, call the jail or Prodigy. The site does not list a separate mailing address; mail to the jail at 330 W 2nd St, Ottumwa, IA 52501, and call 641-684-4350 to confirm.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.wapellocounty.org/sheriff_and_jail/jail/"
      },
      {
        title: "Bail and court records",
        body: "The jail portal lists each charge, warrant, or hold with its bond, but the county site does not explain how to post bond. Call the jail at 641-684-4350 to ask. A listing is a record of a booking, not a finding of guilt.",
        sourceLabel: "Official Sheriff and Jail page",
        sourceUrl: "https://www.wapellocounty.org/sheriff_and_jail/"
      }
    ],
    faq: [
      {
        question: "When can I visit someone at the Wapello County Jail?",
        answer:
          "Monday through Thursday, 6:30 to 9 p.m., by video in the jail lobby. You must be on the inmate's visitor list and bring a state photo ID."
      },
      {
        question: "How do I put money on a Wapello County inmate's account?",
        answer:
          "Mail a money order or cashier's check, send money through Smart Deposit or Western Union, or use the lobby kiosk. Cash and personal checks are not accepted."
      },
      {
        question: "How much do inmate phone calls cost in Wapello County?",
        answer: "Calls through Prodigy cost 30 cents a minute, and text messages 15 cents each."
      },
      {
        question: "How do I find out about bond in Wapello County?",
        answer:
          "The roster shows each bond the portal lists. For how to post it, call the jail at 641-684-4350."
      }
    ]
  },
  "iowa/marshall-county": {
    facilityName: "Marshall County Jail",
    address: "2369 Jessup Avenue, Marshalltown, IA 50158",
    phone: "641-754-6380",
    operatedBy: "Marshall County Sheriff's Office",
    reviewedAt: "October 25, 2026",
    overview:
      "The Marshall County Jail is a direct-supervision jail with 200 beds, opened in July 2000 on the former Marshall County Care Facility site in Marshalltown. Besides people arrested in the county, it holds people for other agencies, such as neighboring sheriff's offices and federal authorities. The Sheriff's business office is open 8 a.m. to 4:30 p.m., Monday through Friday.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.marshallcountysheriff.com/jail/",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video only, either from the jail lobby or remotely through the CIDNET system, which needs data bought by someone outside the jail. Every visitor has to be approved first by sending a copy of a state photo ID through the CIDNET public portal; approval can take 3 to 5 business days. Book a visit at least 24 hours ahead through the portal or by calling 641-754-6380. Visits run 1 to 9 p.m. daily, except during meals and other jail services, last up to 30 minutes, and are recorded. Children under 16 must be the inmate's child, stepchild, sibling, or grandchild, with proof, and come with a parent or legal guardian.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.marshallcountysheriff.com/jail/"
      },
      {
        title: "Money and commissary",
        body: "Commissary orders go out once a week. Money for an inmate's commissary account can be put in the kiosk in the front lobby, which takes cash, Mastercard, and Visa, or deposited online at jailatm.com. Visitors may not bring packages or parcels into the jail building.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.marshallcountysheriff.com/jail/"
      },
      {
        title: "Phone and mail",
        body: "Staff will not pass on messages to inmates; the Sheriff's Office suggests writing the inmate a letter instead. Call the jail at 641-754-6380 to confirm the mailing address and any mail rules before you send anything. To get a notice when someone is moved or released, register with the Iowa VINELink network.",
        sourceLabel: "Official FAQ",
        sourceUrl: "https://www.marshallcountysheriff.com/faq/"
      },
      {
        title: "Bail and court records",
        body: "The jail portal lists each charge, warrant, or hold with its bond: cash only, cash or surety, cash in the defendant's name only, or no bond. Call the jail at 641-754-6380 to confirm an amount and how to post it. A listing is a record of a hold, not a finding of guilt.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.marshallcountysheriff.com/jail/"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Marshall County Jail?",
        answer:
          "Get approved first by sending a copy of your state photo ID through the CIDNET public portal, which can take 3 to 5 business days. Then book a video visit at least 24 hours ahead online or at 641-754-6380. Visits run 1 to 9 p.m. daily and last up to 30 minutes."
      },
      {
        question: "How do I put money on a Marshall County inmate's account?",
        answer:
          "Use the kiosk in the jail's front lobby, which takes cash, Mastercard, and Visa, or deposit online at jailatm.com. Commissary orders go out once a week."
      },
      {
        question: "Can I leave a message for a Marshall County inmate?",
        answer:
          "No. Staff do not pass on messages, so write the inmate a letter. Call 641-754-6380 to confirm the address first."
      },
      {
        question: "How do I find out a bond amount in Marshall County?",
        answer:
          "The roster shows the bond listed for each charge or hold. Call the jail at 641-754-6380 to confirm it and ask how to post it."
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
  },
  "arkansas/sharp-county": {
    facilityName: "Sharp County Detention Center",
    address: "84 Arnhart Street, Ash Flat, AR 72513",
    phone: "870-994-7329",
    operatedBy: "Sharp County Sheriff's Office",
    reviewedAt: "October 14, 2026",
    overview:
      "The Sharp County Detention Center sits directly behind the county courthouse on Arnhart Street in Ash Flat. About 1,100 people were booked there last year, and it holds about 72 on an average day. Ten full-time and four part-time officers staff the jail, and medical staff handle inmates' health care.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.sharpcountysheriff.com/jail",
    sections: [
      {
        title: "Visitation",
        body: "Visits take place in the Sheriff's Office lobby, Monday through Friday from 8 a.m. to 4 p.m., except holidays, and have to be scheduled at least 24 hours ahead. Every inmate gets one free kiosk visit a week. Visitors and their vehicles can be searched while on the property, and passing prohibited items to an inmate is a felony.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.sharpcountysheriff.com/jail"
      },
      {
        title: "Money and commissary",
        body: "Deposits for an inmate's commissary account have to be cash, a cashier's check, or an approved money order. The money goes into the inmate trust fund, and any balance left is paid out by check at release. Food, hygiene items, and clothing can also be ordered for an inmate through Tiger Commissary by choosing the Sharp County Detention Center. Current prescription medicine is accepted only in its original bottle with the directions on it.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.sharpcountysheriff.com/jail"
      },
      {
        title: "Phone and mail",
        body: "Write to the inmate by name, c/o Sharp County Detention Center, P.O. Box 157, Ash Flat, AR 72513. Phone calls, video calls, messages, and movies go through NCIC Inmate Communications; the family sets up the account at ncic.com.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.sharpcountysheriff.com/jail"
      },
      {
        title: "Bail and court records",
        body: "Most warrants carry a bond set by the court, and it has to be posted before release; on a \"No Bond\" warrant the person stays in until seeing a judge. The Sheriff's Office takes cash or a surety bond from a licensed bail bonding company, and generally does not accept own-recognizance or property bonds. Traffic tickets are paid at the District Court Clerk's Office next to the jail, weekdays 8 a.m. to 4 p.m., or by mail to P.O. Box 2, Ash Flat, AR 72513.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.sharpcountysheriff.com/faq"
      }
    ],
    faq: [
      {
        question: "What are the visiting hours at Sharp County Jail?",
        answer:
          "Monday through Friday, 8 a.m. to 4 p.m., except holidays, in the Sheriff's Office lobby in Ash Flat. Schedule the visit at least 24 hours ahead. Each inmate also gets one free kiosk visit a week."
      },
      {
        question: "How do I put money on an inmate's account in Sharp County?",
        answer:
          "Bring cash, a cashier's check, or an approved money order to the detention center at 84 Arnhart Street. To order food, hygiene items, or clothing instead, use Tiger Commissary and pick the Sharp County Detention Center."
      },
      {
        question: "What is the mailing address for Sharp County Jail?",
        answer:
          "Inmate's name, c/o Sharp County Detention Center, P.O. Box 157, Ash Flat, AR 72513."
      },
      {
        question: "What kind of bond does the Sharp County Sheriff accept?",
        answer:
          'Cash, or a surety bond written by a licensed bail bonding company. The Sheriff\'s Office generally does not accept own-recognizance or property bonds, and a "No Bond" warrant means waiting to see a judge.'
      }
    ]
  },
  "arkansas/izard-county": {
    facilityName: "Izard County Detention Facility",
    address: "300 Circle Drive, Melbourne, AR 72556",
    phone: "870-368-4203",
    operatedBy: "Izard County Sheriff's Department",
    reviewedAt: "October 19, 2026",
    overview:
      "The Izard County Detention Facility and Dispatch Center at 300 Circle Drive in Melbourne opened in 2003 and also houses the Sheriff's Department and the District Clerk. The jail holds up to 34 inmates plus four state Act 309 inmates, separated by sex and by violent or non-violent charges. People are held there until they post bond or are sentenced, and those sentenced to the Arkansas Department of Correction wait there for a bed.",
    contactSourceLabel: "Official detention and dispatch page",
    contactSourceUrl: "https://www.izardcountysheriff.org/detention-dispatch-center",
    sections: [
      {
        title: "Visitation",
        body: "Visiting is on Sunday from 8 a.m. to 4 p.m., by appointment only. Call 870-368-4203 by 5 p.m. on Wednesday to book. Each inmate gets one 15-minute visit with up to four visitors, and every visitor needs a valid photo ID, such as an Arkansas driver's license or ID card. Property is not released during visiting hours.",
        sourceLabel: "Official detention and dispatch page",
        sourceUrl: "https://www.izardcountysheriff.org/detention-dispatch-center"
      },
      {
        title: "Money and commissary",
        body: "The Sheriff's Department does not post how to put money on an inmate's account. Call the jail at 870-368-4203 before sending or dropping off money.",
        sourceLabel: "Official detention and dispatch page",
        sourceUrl: "https://www.izardcountysheriff.org/detention-dispatch-center"
      },
      {
        title: "Phone and mail",
        body: "The Sheriff's Department does not post mail or phone rules for inmates. For questions about an inmate's property or anything else at the jail, call 870-368-4203 and ask for the jail.",
        sourceLabel: "Official detention and dispatch page",
        sourceUrl: "https://www.izardcountysheriff.org/detention-dispatch-center"
      },
      {
        title: "Bail and court records",
        body: "The roster shows the bond listed for each booking, but the Sheriff's Department does not post how bonds are paid. Call 870-368-4203 to confirm the amount and how to post it. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official inmate roster",
        sourceUrl: "https://www.izardcountysheriff.org/roster-choose"
      }
    ],
    faq: [
      {
        question: "When can I visit an inmate at the Izard County jail?",
        answer:
          "Sunday from 8 a.m. to 4 p.m., by appointment only. Call 870-368-4203 by 5 p.m. on Wednesday to book a visit."
      },
      {
        question: "How long is a visit at the Izard County jail?",
        answer:
          "One 15-minute visit per inmate, with up to four visitors. Every visitor needs a valid photo ID."
      },
      {
        question: "Where is the Izard County jail?",
        answer:
          "At the Izard County Detention Facility and Dispatch Center, 300 Circle Drive, Melbourne, AR 72556. The phone number is 870-368-4203."
      },
      {
        question: "How do I find out an inmate's bond in Izard County?",
        answer:
          "The bond for each booking is shown on the roster. Call the Sheriff's Department at 870-368-4203 to confirm it and ask how to post it."
      }
    ]
  },
  "arkansas/carroll-county": {
    facilityName: "Carroll County Detention Center",
    address: "205 Hailey Road, Berryville, AR 72616",
    phone: "870-423-2901",
    operatedBy: "Carroll County Sheriff's Office",
    reviewedAt: "November 1, 2026",
    overview:
      "The Carroll County Sheriff's Office and its jail share a building off Highway 62 on Hailey Road in Berryville. Call 870-423-2901 around the clock and press 1 for the jail; administrative hours are 8 a.m. to 4:30 p.m. on weekdays. The jail's email is jail@carrollcountysheriff.net.",
    contactSourceLabel: "Official FAQ page",
    contactSourceUrl: "https://www.carrollcountysheriffar.gov/frequently-asked-questions",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video through Smart Communications. Set up an account on the Smart Communications website to schedule a video visit with an inmate.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.carrollcountysheriffar.gov/detention-center"
      },
      {
        title: "Money and commissary",
        body: "Add money online with a card through Tiger Commissary, or use the kiosk in the Sheriff's Office lobby, which takes cash and cards. The window also takes cash or money orders during regular business hours, but not on weekends or holidays. Family can order food, clothes, and other items for an inmate through Tiger Commissary.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.carrollcountysheriffar.gov/detention-center"
      },
      {
        title: "Phone and mail",
        body: "Inmate phone calls are paid for through a Smart Communications account. Letters do not go to the jail: address them to Smart Communications, Carroll County Detention Center, the inmate's name and booking number, P.O. Box 9119, Seminole, Florida 33775-9119. The booking number is on the inmate roster.",
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.carrollcountysheriffar.gov/frequently-asked-questions"
      },
      {
        title: "Bail and court records",
        body: 'Most warrants carry a bond set by the court; on a "No Bond" warrant the person stays in custody until seeing a judge. The Sheriff\'s Office takes cash or a surety bond from a licensed bail bonding company, and generally does not accept release on own recognizance or a property bond. Call 870-423-2901 for warrant and bond information. A listing is a record of a booking, not a finding of guilt.',
        sourceLabel: "Official FAQ page",
        sourceUrl: "https://www.carrollcountysheriffar.gov/frequently-asked-questions"
      }
    ],
    faq: [
      {
        question: "How do I visit someone at the Carroll County Detention Center?",
        answer: "Visits are by video. Set up a Smart Communications account to schedule one."
      },
      {
        question: "How do I put money on a Carroll County inmate's account?",
        answer:
          "Deposit online through Tiger Commissary, use the lobby kiosk, or bring cash or a money order to the window during business hours."
      },
      {
        question: "Where do I send a letter to a Carroll County inmate?",
        answer:
          "Smart Communications, Carroll County Detention Center, inmate's name and booking number, P.O. Box 9119, Seminole, Florida 33775-9119."
      },
      {
        question: "How is bond posted in Carroll County?",
        answer:
          "The Sheriff's Office takes cash or a surety bond from a licensed bail bonding company. Call 870-423-2901 for details."
      }
    ]
  },
  "arkansas/cross-county": {
    facilityName: "Cross County Jail and Detention Center",
    address: "1600 South Falls Blvd, Wynne, AR 72396",
    phone: "870-238-5700",
    operatedBy: "Cross County Sheriff's Office",
    reviewedAt: "October 21, 2026",
    overview:
      "The Cross County Sheriff's Office runs the county jail and detention center in Wynne, with 14 jailers and 10 dispatcher/matrons under Jail Administrator L.N. Hagler. Men are housed by security risk, women separately, and there are isolation and holding cells. The jail holds people awaiting trial, people serving sentences, and people waiting for transport to the Arkansas Department of Corrections. The Sheriff's Office is at 1600 South Falls Blvd in Wynne, and its non-emergency line, 870-238-5700, is answered 24 hours a day.",
    contactSourceLabel: "Official jail page",
    contactSourceUrl: "https://www.crosscountysheriff.org/jail",
    sections: [
      {
        title: "Visitation",
        body: "The Sheriff's Office does not post visiting hours or rules. Call 870-238-5700 before you go to ask whether and when you can visit.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.crosscountysheriff.org/jail"
      },
      {
        title: "Money and commissary",
        body: "Money for an inmate's account and commissary orders go through City Tele Coin (citytelecoin.com), the service the jail page points to.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.crosscountysheriff.org/jail"
      },
      {
        title: "Phone and mail",
        body: "The Sheriff's Office does not post mail or phone rules for inmates. Call 870-238-5700 before sending anything to the jail.",
        sourceLabel: "Official jail page",
        sourceUrl: "https://www.crosscountysheriff.org/jail"
      },
      {
        title: "Bail and court records",
        body: "Most warrants carry a bond set by the court, which has to be posted before release. The Sheriff's Office takes cash or a surety bond from a licensed bail bonding company; it does not accept release on own recognizance or property bonds. Someone held on a no-bond warrant stays in jail until they see a judge. The roster does not show bond amounts, so call 870-238-5700 to ask. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official frequently asked questions",
        sourceUrl: "https://www.crosscountysheriff.org/frequently-asked-questions"
      }
    ],
    faq: [
      {
        question: "Where is the Cross County jail?",
        answer:
          "In Wynne. The Cross County Sheriff's Office is at 1600 South Falls Blvd, Wynne, AR 72396, and its non-emergency line, 870-238-5700, is answered 24 hours a day."
      },
      {
        question: "How do I put money on a Cross County inmate's account?",
        answer:
          "Through City Tele Coin, which handles both account deposits and commissary orders for the jail."
      },
      {
        question: "How is bail posted in Cross County?",
        answer:
          "With cash or a surety bond from a licensed bail bonding company. The Sheriff's Office does not take property bonds or release on own recognizance."
      },
      {
        question: "Can I visit an inmate at the Cross County jail?",
        answer:
          "The Sheriff's Office does not post visiting rules. Call 870-238-5700 to ask before you go."
      }
    ]
  },
  "arkansas/lonoke-county": {
    facilityName: "Lonoke County Jail",
    address: "440 Dee Dee Lane, Lonoke, AR 72086",
    phone: "501-676-6494",
    operatedBy: "Lonoke County Sheriff's Office",
    reviewedAt: "October 23, 2026",
    overview:
      "The Lonoke County Jail is at 440 Dee Dee Lane in Lonoke, run by the Sheriff's Office. It holds people awaiting trial, people serving sentences, and people waiting for transport to the Arkansas Department of Corrections, with separate housing for men by security level, for women, and for isolation. The jail's number is 501-676-6494; the Sheriff's Office answers 501-676-3001 around the clock.",
    contactSourceLabel: "Official Detention page",
    contactSourceUrl: "https://www.lonokeso.org/styled-2/Detention.html",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video through the jail's kiosk system; there are no in-person visits. Visits are set up through Smart Jail (smartjail.com), which also handles emails and photos sent to inmates.",
        sourceLabel: "Official Detention page",
        sourceUrl: "https://www.lonokeso.org/styled-2/Detention.html"
      },
      {
        title: "Money and commissary",
        body: "Money for an inmate's account can be deposited through City Tele Coin (citytelecoin.com) or at the kiosk in the jail lobby, which takes cash and credit cards. Hygiene items, food, calling cards, and mail supplies are bought through commissary.",
        sourceLabel: "Official Detention page",
        sourceUrl: "https://www.lonokeso.org/styled-2/Detention.html"
      },
      {
        title: "Phone and mail",
        body: "Calling cards are sold through commissary, and emails and photos can be sent through Smart Jail. The Sheriff's Office does not post a mailing address format for letters, so call the jail at 501-676-6494 before sending mail.",
        sourceLabel: "Official Detention page",
        sourceUrl: "https://www.lonokeso.org/styled-2/Detention.html"
      },
      {
        title: "Bail and court records",
        body: "The roster shows the bond amounts listed for each person. The Sheriff's Office does not post how bonds are paid, so call the jail at 501-676-6494 to ask. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official Jail Roster page",
        sourceUrl: "https://www.lonokeso.org/JailLog/JailLog.html"
      }
    ],
    faq: [
      {
        question: "Can I visit someone in person at the Lonoke County Jail?",
        answer:
          "No. All visits are by video through the jail's kiosk system, set up through Smart Jail."
      },
      {
        question: "How do I put money on a Lonoke County inmate's account?",
        answer:
          "Deposit through City Tele Coin online, or use the kiosk in the jail lobby, which takes cash and credit cards."
      },
      {
        question: "Where is the Lonoke County Jail?",
        answer:
          "At 440 Dee Dee Lane, Lonoke, AR 72086. The jail's number is 501-676-6494, and the Sheriff's Office answers 501-676-3001 24 hours a day."
      },
      {
        question: "Can I send an email or photo to a Lonoke County inmate?",
        answer: "Yes, through Smart Jail, the same service used to set up video visits."
      }
    ]
  },
  "arkansas/independence-county": {
    facilityName: "Independence County Jail",
    address: "569 W Main St., Batesville, AR 72501",
    phone: "870-612-6880",
    operatedBy: "Independence County Sheriff's Office",
    reviewedAt: "October 23, 2026",
    overview:
      "The Independence County Jail is at 569 W Main St. in Batesville and is run by the Sheriff's Office, which handles law enforcement for the county and the City of Southside. The jail's number is 870-612-6880; Jail Administrator Jennifer Sanders can be reached at jailadmin@independencesheriff.org.",
    contactSourceLabel: "Official visitation and jail page",
    contactSourceUrl: "https://www.independencesheriff.org/visitationRulesAndSchedule",
    sections: [
      {
        title: "Visitation",
        body: "The Sheriff's Office does not post visiting hours online. Call the jail at 870-612-6880 to ask about visiting before you go.",
        sourceLabel: "Official visitation and jail page",
        sourceUrl: "https://www.independencesheriff.org/visitationRulesAndSchedule"
      },
      {
        title: "Money and commissary",
        body: "The Sheriff's Office points to JailATM (deposits.jailatm.com) for deposits to an inmate's account.",
        sourceLabel: "Official Sheriff's Office website",
        sourceUrl: "https://www.independencesheriff.org/"
      },
      {
        title: "Phone and mail",
        body: "The Sheriff's Office does not post mail or phone rules for inmates. The jail does not accept property for an inmate unless jail administration has approved it. Property is released to approved people on Monday, Thursday, and Friday from 8 a.m. to 3 p.m., once the inmate has filled out a release form; bring a photo ID. Property left more than 30 days after release is destroyed.",
        sourceLabel: "Official visitation and jail page",
        sourceUrl: "https://www.independencesheriff.org/visitationRulesAndSchedule"
      },
      {
        title: "Bail and court records",
        body: "The roster does not list bond amounts, and the Sheriff's Office does not post how bonds are paid. Call the jail at 870-612-6880 to ask. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official visitation and jail page",
        sourceUrl: "https://www.independencesheriff.org/visitationRulesAndSchedule"
      }
    ],
    faq: [
      {
        question: "Where is the Independence County Jail?",
        answer: "At 569 W Main St., Batesville, AR 72501. The jail's number is 870-612-6880."
      },
      {
        question: "How do I put money on an Independence County inmate's account?",
        answer: "The Sheriff's Office points to JailATM for deposits."
      },
      {
        question: "How do I pick up an inmate's property?",
        answer:
          "The inmate must fill out a property release form naming you. Property is released Monday, Thursday, and Friday from 8 a.m. to 3 p.m., and you need a photo ID."
      },
      {
        question: "Can I drop off items for an Independence County inmate?",
        answer: "No, not unless jail administration has approved it first."
      }
    ]
  },
  "arkansas/dallas-county": {
    facilityName: "Dallas County Jail",
    address: "106 South Charlotte, Fordyce, AR 71742",
    phone: "870-352-2002",
    operatedBy: "Dallas County Sheriff's Office",
    reviewedAt: "October 24, 2026",
    overview:
      "The Dallas County Jail in Fordyce opened in October 1999 and can hold 125 inmates. It holds men only; the county does not house women. The Sheriff's Office answers 870-352-2002, Monday through Friday from 8 a.m. to 4:30 p.m.",
    contactSourceLabel: "Official Jail page",
    contactSourceUrl: "https://www.dallascosoar.gov/jail",
    sections: [
      {
        title: "Visitation",
        body: "Video visits can be made from home through NCIC Inmate Communications (account.ncic.com) for $0.30 a minute, using the same account as phone calls and messages. The Sheriff's Office says in-person visiting hours vary, so call 870-352-2002 to ask before you go.",
        sourceLabel: "Official Inmate Phone and Visitation page",
        sourceUrl: "https://www.dallascosoar.gov/general-5"
      },
      {
        title: "Money and commissary",
        body: "Money can be put on an inmate's books at the kiosk in the jail lobby, which may not always be available, or by mailing a money order or cashier's check to the inmate in care of the Dallas County Jail at 106 South Charlotte, Fordyce, AR 71742.",
        sourceLabel: "Official frequently asked questions",
        sourceUrl: "https://www.dallascosoar.gov/faq-s"
      },
      {
        title: "Phone and mail",
        body: "Personal mail goes to the inmate's name, SO#, Dallas County Jail, PO Box 591, Longview, Texas 75606, where it is scanned for the inmate. Envelopes need the inmate's name and booking number and a return address; letters must fit 8.5 by 11 inches, run no more than 5 pages written on the front only, and hold at most one photo. Money orders and legal and medical mail go to the inmate's name, 106 South Charlotte, Fordyce, AR 71742. Inmate calls, messages, and photos go through a prepaid NCIC account (1-800-943-2189); inmates cannot receive incoming calls except voicemail.",
        sourceLabel: "Official Jail page",
        sourceUrl: "https://www.dallascosoar.gov/jail"
      },
      {
        title: "Bail and court records",
        body: "A person can be released on their own recognizance, through a private bonding company, or by posting a property bond or a cash bond, depending on the charge. Call the jail at 870-352-2002 to find out the bond required for a particular person. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official frequently asked questions",
        sourceUrl: "https://www.dallascosoar.gov/faq-s"
      }
    ],
    faq: [
      {
        question: "Where do I send mail to a Dallas County, Arkansas inmate?",
        answer:
          "Personal mail: the inmate's name, SO#, Dallas County Jail, PO Box 591, Longview, Texas 75606. Money orders and legal or medical mail: the inmate's name, 106 South Charlotte, Fordyce, AR 71742."
      },
      {
        question: "How do I put money on a Dallas County inmate's account?",
        answer:
          "Use the kiosk in the jail lobby, or mail a money order or cashier's check to the inmate in care of the Dallas County Jail."
      },
      {
        question: "Can I video visit someone at the Dallas County Jail?",
        answer: "Yes, from home through NCIC Inmate Communications, at $0.30 a minute."
      },
      {
        question: "Does the Dallas County Jail hold women?",
        answer: "No. The Dallas County Jail holds men only."
      }
    ]
  },
  "arkansas/hempstead-county": {
    facilityName: "Hempstead County Detention Center",
    address: "312 South Washington, Hope, AR 71801",
    phone: "870-777-6727",
    operatedBy: "Hempstead County Sheriff's Office",
    reviewedAt: "October 18, 2026",
    overview:
      "The Hempstead County Detention Center in Hope is a 100-bed jail run by the Sheriff's Office and staffed by 21 full-time jailers. It holds people awaiting trial, people arrested on warrants, people serving county sentences, and state inmates waiting for a bed with the Arkansas Department of Corrections, with separate housing for men by security level and for women. The Sheriff's Office is at 312 South Washington, and its phone number is 870-777-6727.",
    contactSourceLabel: "Official detention center page",
    contactSourceUrl: "https://www.hempsteadcountysheriff.org/detention-center",
    sections: [
      {
        title: "Visitation",
        body: "Visits are by video. Each housing pod has a video kiosk, and family members can visit from home seven days a week from 8 a.m. to 8 p.m. through the jail's CTC video visitation service at hempsteadar.citytelecoin.com. Video visits also let relatives under 18 see someone in the jail, which the old in-person rules did not allow.",
        sourceLabel: "Official video visitation page",
        sourceUrl: "https://www.hempsteadcountysheriff.org/visitation"
      },
      {
        title: "Money and commissary",
        body: "The Sheriff's Office does not post how to put money on an inmate's account. Call the Sheriff's Office at 870-777-6727 and ask the jail before sending or dropping off money.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.hempsteadcountysheriff.org/detention-center"
      },
      {
        title: "Phone and mail",
        body: "CTC Communications of Bossier City, Louisiana runs both the jail's inmate phone system and its video visits. The Sheriff's Office does not post mail rules for inmates, so call 870-777-6727 before sending a letter or package.",
        sourceLabel: "Official video visitation page",
        sourceUrl: "https://www.hempsteadcountysheriff.org/visitation"
      },
      {
        title: "Bail and court records",
        body: "The roster shows the bond listed for each booking, but the Sheriff's Office does not post how bonds are paid. Call 870-777-6727 to confirm the amount and how to post it. A roster entry is a record of arrest, not a finding of guilt.",
        sourceLabel: "Official inmate roster",
        sourceUrl: "https://www.hempsteadcountysheriff.org/roster-choose"
      }
    ],
    faq: [
      {
        question: "How do I visit an inmate at the Hempstead County jail?",
        answer:
          "Visits are by video, seven days a week from 8 a.m. to 8 p.m., through CTC at hempsteadar.citytelecoin.com. You can visit from home."
      },
      {
        question: "Can someone under 18 visit an inmate in Hempstead County?",
        answer:
          "Yes, by video. The Sheriff's Office says video visits let family members under 18 see an inmate, which in-person visits did not allow."
      },
      {
        question: "Who runs inmate phone calls at the Hempstead County jail?",
        answer: "CTC Communications, the same company that runs the jail's video visits."
      },
      {
        question: "How do I find out an inmate's bond in Hempstead County?",
        answer:
          "The bond for each booking is shown on the roster. Call the Sheriff's Office at 870-777-6727 to confirm it and ask how to post it."
      }
    ]
  },
  "arkansas/stone-county": {
    facilityName: "Stone County Detention Center",
    address: "1009 Sheriffs Drive, Mountain View, AR 72560",
    phone: "870-269-3825",
    operatedBy: "Stone County Sheriff's Office",
    reviewedAt: "October 16, 2026",
    overview:
      "The Stone County Detention Center is part of the Sheriff's Office complex at 1009 Sheriffs Drive in Mountain View. Built in 1994 and since expanded, it holds up to 40 people in four housing units, one of them for women, both awaiting trial and waiting to be moved to the Arkansas Department of Corrections. Ten full-time detention officers staff the jail.",
    contactSourceLabel: "Official detention center page",
    contactSourceUrl: "https://www.stonecountysheriff.com/detention-center",
    sections: [
      {
        title: "Visitation",
        body: "All visits are by video through the CTC video visitation system. The inmate starts the visit by sending a request from the jail kiosk to the person they want to see, so the jail cannot set one up for you.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.stonecountysheriff.com/detention-center"
      },
      {
        title: "Money and commissary",
        body: "Since February 4, 2025, the jail no longer takes cash for commissary. Money goes on an inmate's account through City Tele-Coin (citytelecoin.com, 318-746-1114, open 7 a.m. to 7 p.m.), and questions about deposits go to City Tele-Coin directly. The jail does not accept clothing, hygiene items, or anything else brought in; those are bought through commissary. Phone cards can also be bought.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.stonecountysheriff.com/detention-center"
      },
      {
        title: "Phone and mail",
        body: "Inmates call out with phone cards bought through commissary, and video visits run through CTC. The Sheriff's Office does not post mail rules for inmates, so call 870-269-3825 before sending anything. The office is open Monday through Friday, 8 a.m. to 4:30 p.m., and the non-emergency line is answered 24 hours.",
        sourceLabel: "Official detention center page",
        sourceUrl: "https://www.stonecountysheriff.com/detention-center"
      },
      {
        title: "Bail and court records",
        body: "Most arrest warrants carry a bond set by the judge. The Sheriff's Office accepts cash, money orders, or a surety bond posted by a licensed bonding company. Some warrants only require a court appearance with no bond. To ask about a warrant, call the Sheriff's Office or the District or Circuit Clerk's office.",
        sourceLabel: "Official Sheriff's Office FAQ",
        sourceUrl: "https://www.stonecountysheriff.com/frequently-asked-questions"
      }
    ],
    faq: [
      {
        question: "Can I visit an inmate at Stone County Jail in person?",
        answer:
          "No. All visits are by CTC video, and the inmate has to send you the visit request from the jail kiosk."
      },
      {
        question: "How do I put money on an inmate's account in Stone County?",
        answer:
          "Use City Tele-Coin at citytelecoin.com or 318-746-1114. The jail stopped taking cash for commissary on February 4, 2025."
      },
      {
        question: "Can I drop off clothes or hygiene items at the Stone County jail?",
        answer:
          "No. The jail does not accept items brought in for inmates; clothing and hygiene items have to be bought through commissary."
      },
      {
        question: "What kind of bond does the Stone County Sheriff accept?",
        answer:
          "Cash, money orders, or a surety bond from a licensed bonding company. Call 870-269-3825 for the bond on a specific warrant."
      }
    ]
  }
};

export function findCountyGuide(state: string, county: string): CountyGuideProfile | undefined {
  return profiles[`${state}/${county}`];
}

export const countyGuideKeys = Object.freeze(Object.keys(profiles));
