export interface LegalPageData {
  slug: string;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  category: 'company' | 'legal' | 'support' | 'programs' | 'trust' | 'platform' | 'compliance';
}

export interface LegalSection {
  heading?: string;
  content: string;
}

const LAST_UPDATED = "April 21, 2026";
const CONTACT_BUSINESS = "marcos@helpthehive.com";
const CONTACT_SUPPORT = "marcos@helpthehive.com";
const CONTACT_PRIVACY = "marcos@helpthehive.com";

export const legalPages: LegalPageData[] = [
  // ─── COMPANY ───
  {
    slug: "about",
    title: "About Help the Hive",
    lastUpdated: LAST_UPDATED,
    category: "company",
    sections: [
      {
        content: `Help the Hive is a technology platform designed to help households save money on groceries, simplify meal planning, and reduce the stress of everyday food budgeting.

Our mission is to make food planning more affordable, efficient, and accessible for everyone.

Help the Hive combines digital planning tools, household preferences, pantry awareness, and budget guidance to help users make smarter food decisions.`
      },
      {
        heading: "The platform helps users",
        content: `• Create personalized meal plans
• Generate grocery lists
• Track pantry items
• Discover relevant recipes
• Organize household food preferences
• Better understand grocery spending`
      },
      {
        content: `Help the Hive is built for individuals, families, students, working households, budget-conscious users, and communities looking for a better way to plan meals without unnecessary complexity.

We believe families should have access to tools that make eating at home feel more manageable, more affordable, and less overwhelming.`
      }
    ]
  },
  {
    slug: "how-it-works",
    title: "How It Works",
    lastUpdated: LAST_UPDATED,
    category: "company",
    sections: [
      {
        content: "Help the Hive uses a guided digital system to simplify household food planning."
      },
      {
        heading: "Step 1: Build Your Household Profile",
        content: `Users enter information such as:
• Household size
• Budget range
• ZIP code
• Dietary preferences
• Allergies or food restrictions
• Pantry basics
• Meal style preferences`
      },
      {
        heading: "Step 2: Receive Personalized Planning",
        content: `The platform uses household information to generate useful planning outputs, which may include:
• Meal suggestions
• Grocery list generation
• Pantry-based recommendations
• Estimated food cost guidance
• Recipe recommendations`
      },
      {
        heading: "Step 3: Organize Your Grocery Process",
        content: `Help the Hive helps users structure grocery buying through:
• Weekly shopping lists
• Pantry awareness
• Meal planning support
• Budget visibility`
      },
      {
        heading: "Step 4: Make Better Ongoing Decisions",
        content: `The platform is designed to improve household planning over time by helping users:
• Reduce food waste
• Repeat successful meals
• Adapt plans to changing budgets
• Stay organized with groceries and pantry items

Help the Hive is designed to support better planning, not to guarantee specific nutritional, financial, or retail outcomes.`
      }
    ]
  },
  {
    slug: "contact",
    title: "Contact",
    lastUpdated: LAST_UPDATED,
    category: "company",
    sections: [
      {
        heading: "Support",
        content: `For general support, technical issues, and account assistance:

📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})`
      },
      {
        heading: "Business",
        content: `For business, partnerships, legal, press, compliance, and platform matters:

📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})

Response times may vary depending on request volume and issue complexity.`
      }
    ]
  },
  {
    slug: "careers",
    title: "Careers",
    lastUpdated: LAST_UPDATED,
    category: "company",
    sections: [
      {
        content: `Help the Hive is committed to building practical tools that help households make smarter decisions around food planning and grocery budgeting.

As we grow, we may open opportunities across product, engineering, operations, design, customer support, partnerships, and program access.

For hiring inquiries, interest in future roles, or talent introductions, contact:

📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      }
    ]
  },
  {
    slug: "press",
    title: "Press",
    lastUpdated: LAST_UPDATED,
    category: "company",
    sections: [
      {
        content: `For press inquiries, interviews, media requests, or public-facing partnerships related to Help the Hive, contact:

📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})

Please include:
• Your name
• Publication or outlet
• Deadline
• Subject of request
• Relevant links or context`
      }
    ]
  },

  // ─── LEGAL ───
  {
    slug: "terms",
    title: "Terms of Service",
    lastUpdated: LAST_UPDATED,
    category: "legal",
    sections: [
      {
        content: "These Terms of Service govern your access to and use of the Help the Hive website, applications, content, and services.\n\nBy accessing or using Help the Hive, you agree to be bound by these Terms. If you do not agree, do not use the platform."
      },
      {
        heading: "1. Services",
        content: `Help the Hive provides digital tools and informational features related to:
• Meal planning
• Grocery budgeting
• Pantry tracking
• Recipe recommendations
• Household food organization
• Discount eligibility workflows
• Budgeting support features

The platform is intended to assist with planning and organization. It does not guarantee financial savings, food availability, price accuracy, or specific nutritional outcomes.`
      },
      {
        heading: "2. Eligibility",
        content: "You must be legally able to use the platform under applicable law. You may not use the platform if prohibited by law or if previously removed for violations."
      },
      {
        heading: "3. User Accounts",
        content: `To access certain features, you may need to create an account. You agree to provide accurate information and keep it current.

You are responsible for:
• Safeguarding your login credentials
• Restricting unauthorized access to your account
• Activity that occurs under your account`
      },
      {
        heading: "4. Acceptable Use",
        content: `You agree not to:
• Violate laws or regulations
• Misuse the platform
• Upload malicious code
• Scrape or reverse engineer the platform where prohibited
• Interfere with platform functionality
• Impersonate another person or organization
• Submit false verification documents
• Use the platform for fraud or abuse`
      },
      {
        heading: "5. Pricing, Availability, and Estimates",
        content: `Help the Hive provides two types of pricing information: **Verified Pricing** from direct retailer partnerships, and **Estimated Pricing** based on public data sources, user submissions, and algorithmic estimates. Estimated Pricing is clearly labeled within the app. Actual in-store prices may vary by store, retailer, location, date, and promotion.

You acknowledge and agree that:
• Help the Hive pricing is for planning purposes only
• Actual prices depend on store, location, date, and promotions
• We are not liable for differences between estimated and in-store prices
• You should verify prices at the store before making purchase decisions

We do not guarantee:
• Pricing accuracy
• Product availability
• Promotion validity
• Nutritional completeness
• Medical suitability
• Financial outcomes`
      },
      {
        heading: "6. User Content",
        content: "You may submit information, household data, uploaded documents, pantry information, and other content to the platform. You retain ownership of your content, but you grant Help the Hive a limited license to use, host, process, and display that content as needed to operate and improve the platform.\n\nYou represent that you have the rights necessary to submit any content you provide."
      },
      {
        heading: "7. SNAP/WIC Self-Attestation (Optional)",
        content: `Help the Hive is 100% free for everyone regardless of eligibility — there is no paid tier, paywall, subscription, or verification gate. We do not require identity documents, eligibility proof, or any verification to access any feature.

**Food assistance self-attestation.** If you optionally tell us you receive SNAP, WIC, or other food assistance benefits, we use that signal only to surface relevant educational resources and budget-friendly meal plans.

**SNAP benefit tracker.** If you enable the optional SNAP benefit tracker, you manually enter your monthly benefit amount. Help the Hive does NOT connect to EBT portals, store EBT card numbers, store PINs, or process benefit transactions.`
      },
      {
        heading: "8. Pricing",
        content: `**Help the Hive is 100% free for everyone, with no subscriptions, no paywalls, and no premium tiers.** All core features — meal planning, grocery lists, pantry tools, Fridge Chef, budget insights, and Instacart checkout handoff — are available at no cost to every user.

We do not charge for the app, do not collect payment information, and do not offer in-app purchases. Help the Hive is funded through optional Instacart affiliate commissions, sponsored brand placements, institutional licensing, and grants. None of these affect what you pay (which is nothing) or your access to features.`
      },
      {
        heading: "9. Retailer & Third-Party Partnerships",
        content: `The Service integrates with third-party services including Instacart, recipe databases, and payment processors. You are subject to those services' terms and privacy policies. We may receive affiliate commissions when you complete transactions through partner links.`
      },
      {
        heading: "10. No Medical Advice",
        content: `Help the Hive provides general meal planning and nutritional information only. It is NOT medical advice. Consult a qualified healthcare provider for dietary recommendations or medical conditions. Nutritional information is estimated and may vary.`
      },
      {
        heading: "11. Suspension and Termination",
        content: `We may suspend, restrict, or terminate access to the platform at our discretion for reasons including:
• Suspected fraud
• Violation of these Terms
• Misuse of discounts or benefits
• Platform abuse
• Legal or security concerns`
      },
      {
        heading: "12. Intellectual Property",
        content: `All Help the Hive content is owned by Help the Hive and protected by IP laws. "Help the Hive" and "Fridge Chef" are our trademarks. You receive a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes.`
      },
      {
        heading: "13. Disclaimer of Warranties",
        content: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. We do not warrant that pricing is accurate, that recipes will meet your dietary needs, that the Service will be uninterrupted, or that results will meet your expectations.'
      },
      {
        heading: "14. Limitation of Liability",
        content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, HELP THE HIVE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. Our total aggregate liability shall not exceed the greater of $100 or the amount you paid us in the preceding 12 months.`
      },
      {
        heading: "15. Indemnification",
        content: `You agree to defend, indemnify, and hold harmless Help the Hive from any claims arising from your violation of these Terms, your submitted content, your violation of third-party rights, or your misuse of the Service.`
      },
      {
        heading: "16. Dispute Resolution & Arbitration",
        content: `**Informal resolution first.** Contact ${CONTACT_BUSINESS} and allow 60 days for informal resolution.

**Binding arbitration.** Disputes will be resolved through binding arbitration administered by the American Arbitration Association (AAA) in Los Angeles, California, under AAA Consumer Arbitration Rules. You waive the right to a jury trial and to participate in class actions.

**Exceptions.** You may bring claims in small claims court or seek injunctive relief for IP violations.

**Governing law:** These Terms are governed by the laws of the State of California, without regard to conflict of law principles.`
      },
      {
        heading: "17. Account Deletion",
        content: `You may request deletion of your account and associated personal data at any time by contacting us or using the account deletion option in your app settings.

Upon deletion:
• Your account will be deactivated and personal data will be scheduled for deletion
• Some information may be retained as required by law, for fraud prevention, or to resolve disputes
• Help the Hive does not charge users — there are no subscriptions to cancel

Account deletion requests will be processed within 30 days of the request.`
      },
      {
        heading: "18. End User License Agreement (EULA)",
        content: `This agreement serves as the End User License Agreement (EULA) for the Help the Hive mobile application distributed through the Apple App Store and Google Play Store.

By downloading or using the Help the Hive app, you agree to the terms set forth in this document.

• The app is licensed, not sold, to you for personal, non-commercial use
• You may not copy, modify, distribute, sell, or lease any part of the app
• You may not reverse engineer or attempt to extract the source code
• This license is effective until terminated by you or Help the Hive
• Apple and Google are not responsible for the app or its content
• Apple and Google have no obligation to provide maintenance or support for the app`
      },
      {
        heading: "19. Apple & Google Acknowledgment",
        content: `If you download or use Help the Hive through the Apple App Store or Google Play Store, the following applies:

• These Terms are between you and Help the Hive, not Apple Inc. or Google LLC
• Apple and Google are not responsible for the app, its content, or any claims related to its use
• Apple and Google have no obligation to provide maintenance or support for the app
• Apple and Google are third-party beneficiaries of these Terms and may enforce them against you
• In the event of any failure of the app to conform to any applicable warranty, you may notify Apple or Google for a refund of the purchase price (if any); to the maximum extent permitted by law, Apple and Google have no other warranty obligations with respect to the app`
      },
      {
        heading: "20. Changes to These Terms",
        content: `We may update these Terms. We will update the "Last Updated" date, notify you of material changes via in-app message or email, and give 30 days' notice before material changes take effect.`
      },
      {
        heading: "21. Contact",
        content: `Questions about these Terms may be sent to:\n\n📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      }
    ]
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    lastUpdated: LAST_UPDATED,
    category: "legal",
    sections: [
      {
        content: `This Privacy Policy explains how Help the Hive collects, uses, and protects your personal information across our mobile application, website (helpthehive.com), and related services.`
      },
      {
        heading: "1. Information We Collect",
        content: `**Information you provide directly:**
• Account details: name, email address, password (hashed)
• Household information: household size, ZIP code, dietary preferences
• Budget information: weekly grocery budget, preferred store
• Optional SNAP tracker: your monthly SNAP benefit amount (manually entered)
• Pantry inventory: items you tell us are in your kitchen
• Price corrections: prices you report seeing in stores
• User-generated content: feedback, reviews, support messages

**Information collected automatically:**
• Device information: device type, operating system, app version, device identifier (IDFA/AAID if permitted)
• Usage data: features used, time spent, interactions
• Approximate location: ZIP code level
• Crash reports and diagnostics (anonymized)

**Information collected from third parties:**
• Apple App Store / Google Play Store: app install confirmations only (we have no subscriptions)
• Retailer partners: order confirmations when you use "Order via [Partner]" features

**Information we do NOT collect:**
• Your EBT card number, PIN, or account login
• Your Social Security Number
• Your bank account or credit card details (processed by Apple/Google)
• Precise GPS location without your explicit permission
• Biometric data`
      },
      {
        heading: "2. How We Use Your Information",
        content: `We use your information to:
• Provide the Service
• Personalize your experience
• Process payments (via Apple/Google)
• Communicate with you
• Improve the Service
• Prevent fraud and enforce our Terms
• Comply with legal obligations
• Conduct research and reporting (anonymized aggregate only)

**We do NOT use your information to:**
• Sell it to third parties
• Share your SNAP status with anyone outside Help the Hive
• Determine credit or lending decisions
• Target you based on financial hardship`
      },
      {
        heading: "3. Apple App Tracking Transparency (ATT)",
        content: `On iOS, Help the Hive complies with Apple's App Tracking Transparency framework. If we collect data to track you across apps or websites owned by other companies, we will:
• Request your permission via the ATT prompt before any tracking begins
• Explain why we're asking for permission
• Function properly even if you decline tracking

**Help the Hive does not currently track users across other companies' apps or websites.** We collect data within our own app only. If this changes in the future, we will update this policy and show you the ATT prompt.`
      },
      {
        heading: "4. How We Share Your Information",
        content: `**Service providers:** Cloud hosting, analytics, customer support, email delivery. These providers are contractually required to protect your data.

**Retailer partnerships:** When you tap "Send to Instacart" or similar, your grocery list is shared with that partner to populate your cart. We do NOT share your full user profile.

**Aggregated/anonymized data:** May be shared with partners, investors, or grant funders. Cannot be linked to you personally.

**Legal requirements:** If required by law, court order, or to protect rights/safety.

**Business transfers:** If Help the Hive is acquired, your information may be transferred. We will notify you.

**We do NOT sell your personal information.**`
      },
      {
        heading: "5. SNAP & Benefit Information — Special Protections",
        content: `If you use our optional SNAP benefit tracker:
• We store: monthly benefit amount, self-reported usage, deposit date
• We do NOT store: EBT card numbers, PINs, SSN, or any state portal credentials
• Encrypted storage, limited access, never shared without explicit consent`
      },
      {
        heading: "6. Cookies and Similar Technologies (Web)",
        content: `Our website (helpthehive.com) uses cookies and similar technologies to keep you logged in, remember your preferences, analyze usage, and improve performance.

**Cookie categories we use:**
• **Strictly necessary:** Required for the site to function
• **Performance:** Help us understand how visitors use the site
• **Functionality:** Remember your preferences
• **Marketing:** Limited use; we do not sell cookie data

You can control cookies through your browser settings. Blocking strictly necessary cookies may break site functionality.`
      },
      {
        heading: "7. Data Security",
        content: `Industry-standard security measures including:
• Encryption in transit (TLS 1.3) and at rest (AES-256)
• Access controls with principle of least privilege
• Regular security audits
• Secure cloud infrastructure with SOC 2 compliance
• Breach notification within 72 hours as required by law`
      },
      {
        heading: "8. Your Rights & Choices",
        content: `**All users:**
• Access: view your data within the app
• Export: request a full data export from ${CONTACT_PRIVACY}
• Correct: edit your profile in Settings
• Delete: delete your account in Settings (completed within 30 days; backups within 90 days)
• Opt out: turn off notifications, unsubscribe from emails, disable SNAP tracker

**California residents (CCPA/CPRA):**
• Right to know what personal information we collect
• Right to delete
• Right to correct
• Right to opt out of sale or sharing (we don't sell, but this right is codified)
• Right to limit use of sensitive personal information
• Right to non-discrimination
• Authorized agent: you may designate someone to make requests on your behalf

**EU/UK residents (GDPR/UK GDPR):** All CCPA rights plus the right to data portability, restrict processing, object to processing, withdraw consent, and file a complaint with a supervisory authority.

**Virginia, Colorado, Connecticut, Utah residents:** Rights similar to CCPA under state privacy laws.

**To exercise any rights:** ${CONTACT_PRIVACY}`
      },
      {
        heading: "9. Children's Privacy (COPPA)",
        content: `Help the Hive is not directed to children under 13. We do not knowingly collect personal information from children under 13. For users 13–18, we recommend parental involvement.

If we discover we have collected information from a child under 13, we delete it promptly. Parents can contact ${CONTACT_PRIVACY} with concerns.`
      },
      {
        heading: "10. Data Retention",
        content: `| Data Type | Retention Period |
|---|---|
| Account information | While account active + 30 days after deletion |
| Meal plans and grocery lists | While account active + 30 days |
| SNAP tracker data | Immediate deletion on opt-out |
| Price corrections (anonymized) | Retained indefinitely |
| Usage analytics (anonymized) | 24 months |
| Payment records | 7 years (legal requirement) |
| Support conversations | 2 years |`
      },
      {
        heading: "11. International Users",
        content: `Help the Hive is operated from the United States. Data is transferred to and processed in the US. For EU/UK users, we rely on Standard Contractual Clauses for international transfers.`
      },
      {
        heading: "12. Third-Party Services",
        content: `The Service integrates with third parties (Instacart, Apple, Google). Their privacy practices are governed by their own policies.`
      },
      {
        heading: "13. Research & Grant Reporting",
        content: `When we participate in research or grant reporting:
• Only anonymized, aggregate data is shared
• No individual user can be identified
• Personal data is never sold or shared with funders
• Direct user research requires explicit consent`
      },
      {
        heading: "14. App Store and Play Store Data Practices",
        content: `When you use Help the Hive through the Apple App Store or Google Play Store:
• Data collection and usage are governed by this Privacy Policy
• Apple and Google may collect additional data per their own privacy policies
• Help the Hive contains no in-app purchases or subscriptions
• We do not share your personal data with Apple or Google beyond what is required for app functionality`
      },
      {
        heading: "15. Account Deletion",
        content: `You can delete your account in Settings or by contacting ${CONTACT_PRIVACY}. We will delete or anonymize your personal data within 30 days, and remove residual backups within 90 days. Some information may be retained as required by law, for fraud prevention, or to resolve disputes.`
      },
      {
        heading: "16. Changes to This Policy",
        content: `We will update the "Last Updated" date, notify you of material changes, and give 30 days' notice before material changes take effect.`
      },
      {
        heading: "17. Contact",
        content: `**Privacy questions:** [${CONTACT_PRIVACY}](mailto:${CONTACT_PRIVACY})\n\n**Legal:** [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      }
    ]
  },
  {
    slug: "data-collection",
    title: "Data Collection Policy",
    lastUpdated: LAST_UPDATED,
    category: "legal",
    sections: [
      {
        content: "Help the Hive collects information necessary to run the platform, improve the user experience, and support planning tools."
      },
      {
        heading: "Categories of Data We May Collect",
        content: `• Account information
• Household information
• Budget inputs
• Pantry and grocery information
• Dietary preferences
• Allergy / restriction information
• Discount eligibility information
• Device and usage data
• Support communications`
      },
      {
        heading: "Why We Collect Data",
        content: `We collect data to:
• Generate recommendations
• Personalize features
• Support account functionality
• Improve recommendation quality
• Prevent abuse and fraud
• Maintain security
• Improve performance and usability

We limit collection to what is reasonably useful for the operation and improvement of the platform.`
      }
    ]
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    lastUpdated: LAST_UPDATED,
    category: "legal",
    sections: [
      {
        content: "Help the Hive uses cookies and similar technologies to improve functionality, remember preferences, support security, and understand how the platform is used."
      },
      {
        heading: "Types of Cookies We May Use",
        content: `• Essential cookies
• Authentication cookies
• Performance cookies
• Analytics cookies
• Preference cookies`
      },
      {
        heading: "Why We Use Cookies",
        content: `Cookies may help us:
• Keep users signed in
• Remember settings
• Improve reliability
• Understand platform usage
• Maintain security
• Improve site and app performance

Users can manage cookies through browser settings, but disabling certain cookies may affect functionality.`
      }
    ]
  },
  {
    slug: "data-security",
    title: "Data Security Policy",
    lastUpdated: LAST_UPDATED,
    category: "legal",
    sections: [
      {
        content: "Help the Hive takes data security seriously and uses reasonable safeguards to protect platform information."
      },
      {
        heading: "Security Measures May Include",
        content: `• Encrypted transmission of sensitive data
• Encrypted storage where appropriate
• Access controls and least-privilege principles
• Secure hosting environments
• Administrative safeguards
• Routine monitoring and platform hardening
• Vendor controls where applicable`
      },
      {
        heading: "Sensitive Materials",
        content: "Submitted verification documents and account-related materials may receive additional access restrictions and handling procedures."
      },
      {
        heading: "Security Limitations",
        content: "No method of storage or transmission can be guaranteed to be completely secure. Users should also protect their own devices, passwords, and accounts."
      },
      {
        heading: "Reporting Security Concerns",
        content: `Security concerns may be reported to:\n\n📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      }
    ]
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    lastUpdated: LAST_UPDATED,
    category: "legal",
    sections: [
      {
        content: "Users must use Help the Hive responsibly and lawfully."
      },
      {
        heading: "You may not",
        content: `• Break or attempt to break platform security
• Submit false or misleading information
• Upload malicious code or harmful files
• Misuse discount or eligibility systems
• Impersonate another person
• Violate intellectual property rights
• Automate abusive behavior
• Interfere with platform performance
• Harass, threaten, or abuse others
• Use the platform for illegal purposes`
      },
      {
        heading: "Violations may lead to",
        content: `• Warning
• Suspension
• Removal of access
• Legal action where appropriate`
      }
    ]
  },
  {
    slug: "arbitration",
    title: "Arbitration & Dispute Resolution",
    lastUpdated: LAST_UPDATED,
    category: "legal",
    sections: [
      {
        content: "To the fullest extent permitted by law, disputes arising out of or relating to Help the Hive may be resolved through binding individual arbitration rather than court proceedings, except where claims may properly be brought in small claims court."
      },
      {
        heading: "Informal Resolution First",
        content: `Before initiating formal proceedings, users agree to attempt to resolve disputes informally by contacting:\n\n📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      },
      {
        heading: "Individual Basis Only",
        content: "Disputes must be brought on an individual basis and not as part of a class action, consolidated action, or representative proceeding, except where prohibited by law."
      },
      {
        heading: "Venue and Governing Rules",
        content: "Arbitration procedures, venue, and administrator details may be designated by Help the Hive consistent with applicable law and fairness requirements.\n\nNothing in this policy limits rights that cannot legally be waived."
      }
    ]
  },

  // ─── SUPPORT ───
  {
    slug: "help-center",
    title: "Help Center",
    lastUpdated: LAST_UPDATED,
    category: "support",
    sections: [
      {
        content: `The Help Center provides support for common platform questions, including:
• Creating meal plans
• Managing pantry items
• Building grocery lists
• Updating household preferences
• Account access
• Billing basics
• Troubleshooting technical issues

For direct support:\n\n📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})`
      }
    ]
  },
  {
    slug: "report-issue",
    title: "Report an Issue",
    lastUpdated: LAST_UPDATED,
    category: "support",
    sections: [
      {
        content: `If you encounter a bug, platform issue, display problem, broken flow, billing issue, or account error, report it to Help the Hive support.

Please include:
• A clear description of the issue
• Device type
• Browser or operating system
• Screenshots if available
• Steps to reproduce the issue if known

Send issue reports to:\n\n📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})`
      }
    ]
  },
  {
    slug: "account-support",
    title: "Account Support",
    lastUpdated: LAST_UPDATED,
    category: "support",
    sections: [
      {
        content: `Account Support helps users with:
• Password reset requests
• Login problems
• Account recovery
• Email updates
• Subscription questions
• Access issues

For account help:\n\n📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})`
      }
    ]
  },
  {
    slug: "security-disclosure",
    title: "Security Disclosure",
    lastUpdated: LAST_UPDATED,
    category: "support",
    sections: [
      {
        content: `If you believe you have found a security vulnerability in Help the Hive, please report it responsibly.

Please include:
• Affected area
• Description of issue
• Proof of concept if appropriate
• Reproduction steps
• Any time-sensitive risk details

Security reports should be sent to:\n\n📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})

Do not publicly disclose vulnerabilities before giving Help the Hive a reasonable opportunity to review and address the issue.`
      }
    ]
  },
  {
    slug: "contact-support",
    title: "Contact Support",
    lastUpdated: LAST_UPDATED,
    category: "support",
    sections: [
      {
        content: `For platform support, users may contact:\n\n📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})

For legal, business, compliance, security, or media matters:\n\n📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      }
    ]
  },

  // ─── RESOURCES (Educational) ───
  {
    slug: "apply-for-snap",
    title: "How to Apply for SNAP Benefits",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "The Supplemental Nutrition Assistance Program (SNAP) helps eligible low-income households buy groceries. Help the Hive is not a government agency and does not process SNAP applications — this page is educational only."
      },
      {
        heading: "Where to apply",
        content: `Apply through your state's SNAP office. The official starting point is:

• USDA SNAP State Directory: https://www.fns.usda.gov/snap/state-directory
• Federal SNAP overview: https://www.fns.usda.gov/snap/recipient/eligibility

Each state runs its own SNAP application — most accept online applications, mail-in forms, or in-person submissions at a local office.`
      },
      {
        heading: "What you'll typically need",
        content: `• Proof of identity (ID, driver's license, passport)
• Proof of address (utility bill, lease)
• Proof of income (pay stubs, benefits letters)
• Household member information (names, dates of birth, SSNs)
• Recent expenses (rent, utilities, childcare, medical)`
      },
      {
        heading: "After you apply",
        content: "States must process applications within 30 days (7 days for emergency SNAP). You may receive a phone or in-person interview. If approved, benefits load monthly onto an EBT card you can use at participating retailers — including many Instacart-supported stores."
      }
    ]
  },
  {
    slug: "apply-for-ebt",
    title: "How to Apply for EBT",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "EBT (Electronic Benefits Transfer) is the card system states use to deliver SNAP and, in some states, cash assistance benefits. You don't apply for the EBT card separately — it's issued automatically once your SNAP or TANF application is approved."
      },
      {
        heading: "Steps to get an EBT card",
        content: `1. Apply for SNAP (or TANF) through your state agency — see our **How to Apply for SNAP Benefits** page.
2. Complete any required interview.
3. If approved, your state mails an EBT card with instructions to set a PIN.
4. Activate the card per the instructions included.`
      },
      {
        heading: "Using EBT online",
        content: "Most states allow SNAP EBT to be used online at participating retailers. Instacart accepts SNAP/EBT at many partner stores — Help the Hive routes your grocery list to Instacart so eligible items can be paid for with EBT at checkout."
      }
    ]
  },
  {
    slug: "housing-assistance",
    title: "Housing Assistance Resources",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "If your household is struggling with rent, mortgage, or utility-driven housing costs, these federal and nonprofit resources may help. Help the Hive is not a housing provider or government agency."
      },
      {
        heading: "Federal programs",
        content: `• **HUD rental assistance & Section 8 / Housing Choice Vouchers:** https://www.hud.gov/topics/rental_assistance
• **Find a Public Housing Agency near you:** https://www.hud.gov/program_offices/public_indian_housing/pha/contacts
• **Emergency Housing Vouchers (EHV):** Ask your local PHA.`
      },
      {
        heading: "Help in an emergency",
        content: `• **211:** Dial 2-1-1 or visit https://www.211.org for local rental, shelter, and eviction-prevention referrals.
• **National Domestic Violence Hotline:** 1-800-799-7233 — emergency shelter referrals.`
      }
    ]
  },
  {
    slug: "food-assistance",
    title: "Food Assistance Resources",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "If you need help putting food on the table, you're not alone — and there are programs designed exactly for this. Help the Hive is not a food bank; this page is educational."
      },
      {
        heading: "National programs",
        content: `• **SNAP** — see **How to Apply for SNAP Benefits**.
• **WIC (Women, Infants, and Children):** https://www.fns.usda.gov/wic — nutrition support for pregnant women, new mothers, and children under 5.
• **Child Nutrition Programs (school meals, summer meals):** https://www.fns.usda.gov/programs
• **The Emergency Food Assistance Program (TEFAP):** USDA-funded food distributions via local food banks.`
      },
      {
        heading: "Find a food bank or pantry",
        content: `• **Feeding America food bank locator:** https://www.feedingamerica.org/find-your-local-foodbank
• **211:** Dial 2-1-1 or visit https://www.211.org for the nearest pantry, hot-meal site, or food box program.`
      }
    ]
  },
  {
    slug: "utility-assistance",
    title: "Utility Assistance Resources",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "If high utility bills are squeezing your food budget, federal and local programs may be able to reduce or cover what you owe."
      },
      {
        heading: "Federal programs",
        content: `• **LIHEAP (Low Income Home Energy Assistance Program):** https://www.acf.hhs.gov/ocs/programs/liheap — heating, cooling, and emergency utility help.
• **Weatherization Assistance Program:** https://www.energy.gov/scep/wap/weatherization-assistance-program — home efficiency upgrades for income-eligible households.
• **Lifeline (low-cost phone/internet):** https://www.lifelinesupport.org`
      },
      {
        heading: "Local help",
        content: "Most utility companies offer hardship plans, payment arrangements, and shutoff-protection programs. Call the number on your bill and ask for the customer hardship or LIHEAP coordinator. **211** can also connect you to local energy assistance funds."
      }
    ]
  },
  {
    slug: "community-support",
    title: "Community Support Programs",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "Local nonprofits, faith communities, and mutual-aid networks offer everything from diapers and school supplies to childcare and mental-health support."
      },
      {
        heading: "Start here",
        content: `• **211:** https://www.211.org — the most comprehensive directory of community services in the U.S. and Canada.
• **Findhelp.org:** https://www.findhelp.org — search free and reduced-cost services by ZIP code.
• **United Way:** https://www.unitedway.org — local chapters offer family stability and benefits-enrollment help.`
      },
      {
        heading: "Specific populations",
        content: `• **National Council on Aging — BenefitsCheckUp:** https://www.benefitscheckup.org — screens older adults for 2,000+ benefit programs.
• **Veterans:** https://www.va.gov — VA benefits, healthcare, and emergency support.
• **Families with children:** https://www.childcare.gov — childcare subsidies and family resource centers.`
      }
    ]
  },

  // ─── TRUST & SAFETY ───
  {
    slug: "responsible-ai",
    title: "Responsible AI Policy",
    lastUpdated: LAST_UPDATED,
    category: "trust",
    sections: [
      {
        content: `Help the Hive may use automated systems, recommendation logic, or algorithmic workflows to support features such as:
• Meal planning
• Grocery list generation
• Pantry suggestions
• Budget insights
• Recommendation ranking

These systems are intended to assist users and improve efficiency.`
      },
      {
        heading: "Important Limitations",
        content: `Help the Hive's automated outputs:
• Are not medical advice
• Are not nutrition therapy
• Are not legal advice
• Are not financial advice
• May rely on user-provided information and imperfect external inputs

Users should independently evaluate recommendations before relying on them for important decisions.`
      }
    ]
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    lastUpdated: LAST_UPDATED,
    category: "trust",
    sections: [
      {
        content: `Help the Hive is committed to improving accessibility and usability for people with disabilities.

We aim to build experiences that are:
• Readable
• Navigable
• Understandable
• Functional across devices
• Increasingly aligned with recognized accessibility standards

We continue working to improve accessibility across the platform.

Users who encounter accessibility barriers may contact:\n\n📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})`
      }
    ]
  },
  {
    slug: "community-guidelines",
    title: "Community Guidelines",
    lastUpdated: LAST_UPDATED,
    category: "trust",
    sections: [
      {
        content: "Users of Help the Hive must interact with the platform respectfully and lawfully."
      },
      {
        heading: "You may not",
        content: `• Harass others
• Threaten others
• Submit hateful or abusive content
• Engage in fraud
• Misuse support channels
• Attempt to manipulate eligibility systems
• Violate laws or rights of others

We may remove content, restrict access, or terminate accounts for violations.`
      }
    ]
  },
  {
    slug: "platform-integrity",
    title: "Platform Integrity Policy",
    lastUpdated: LAST_UPDATED,
    category: "trust",
    sections: [
      {
        content: "Help the Hive is committed to maintaining the reliability, fairness, and trustworthiness of the platform."
      },
      {
        heading: "We may investigate and act on",
        content: `• Suspicious account behavior
• Repeated false submissions
• Fraud attempts
• Abuse of discounts or programs
• Account sharing that undermines plan integrity
• Manipulation of platform flows`
      },
      {
        heading: "Actions may include",
        content: `• Verification requests
• Feature restrictions
• Benefit revocation
• Suspension
• Account termination`
      }
    ]
  },
  {
    slug: "anti-fraud",
    title: "Anti-Fraud Policy",
    lastUpdated: LAST_UPDATED,
    category: "trust",
    sections: [
      {
        content: "Help the Hive uses platform safeguards to detect and reduce fraud, abuse, unauthorized use, and false eligibility claims."
      },
      {
        heading: "Fraud-related conduct may include",
        content: `• Fake documents
• False status claims
• Payment abuse
• Account manipulation
• Identity misrepresentation
• Exploitation of promotions or discounts

Help the Hive may review accounts, documents, transactions, and access patterns to protect the platform and users.`
      }
    ]
  },

  // ─── PLATFORM ───
  {
    slug: "meal-planner",
    title: "Meal Planner",
    lastUpdated: LAST_UPDATED,
    category: "platform",
    sections: [
      {
        content: `The Meal Planner helps users organize meal choices based on household needs, budget preferences, pantry awareness, and food preferences.

Outputs may vary depending on:
• User inputs
• Budget
• Restrictions
• Preferences
• Pantry items
• Available data sources

Meal planning outputs are intended for assistance and convenience.`
      }
    ]
  },
  {
    slug: "pantry-manager",
    title: "Pantry Manager",
    lastUpdated: LAST_UPDATED,
    category: "platform",
    sections: [
      {
        content: `The Pantry Manager helps users keep track of food items they already have available at home.

This may help users:
• Reduce duplicate purchases
• Improve organization
• Build meals from available ingredients
• Reduce waste

Pantry data accuracy depends on user input and upkeep.`
      }
    ]
  },
  {
    slug: "grocery-lists",
    title: "Grocery Lists",
    lastUpdated: LAST_UPDATED,
    category: "platform",
    sections: [
      {
        content: `Help the Hive can generate grocery lists based on household planning, preferences, pantry data, and recommended meals.

Lists are planning tools only and may not reflect:
• Real-time inventory
• Exact retailer assortment
• Current promotional prices
• Taxes or fees`
      }
    ]
  },
  {
    slug: "budget-insights",
    title: "Budget Insights",
    lastUpdated: LAST_UPDATED,
    category: "platform",
    sections: [
      {
        content: `Budget Insights are designed to help users better understand food-related planning and household spending patterns.

Budget outputs may rely on:
• User-entered budgets
• ZIP code
• Selected preferences
• Estimated item data
• Planning assumptions

These insights are informational and do not guarantee savings.`
      }
    ]
  },
  {
    slug: "recipe-recommendations",
    title: "Recipe Recommendations",
    lastUpdated: LAST_UPDATED,
    category: "platform",
    sections: [
      {
        content: "Recipe recommendations may be generated using household preferences, pantry data, food categories, and user-provided details.\n\nHelp the Hive does not guarantee that all recipe outputs will be suitable for every dietary, medical, cultural, or allergy-related need. Users remain responsible for reviewing ingredients before use."
      }
    ]
  },
  {
    slug: "household-profile",
    title: "Household Profile",
    lastUpdated: LAST_UPDATED,
    category: "platform",
    sections: [
      {
        content: `The Household Profile stores planning-related inputs such as:
• Household size
• Food preferences
• Allergy information
• Budget range
• Location
• Selected programs
• Meal style preferences

Users are responsible for keeping this information reasonably accurate so the platform can provide more useful outputs.`
      }
    ]
  },

  // ─── COMPLIANCE ───
  {
    slug: "dmca",
    title: "DMCA Policy",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: `Help the Hive respects intellectual property rights and expects users to do the same.

If you believe material on the platform infringes your copyright, send a notice to:\n\n📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})

Please include:
• Your contact information
• Identification of the copyrighted work
• Identification of the allegedly infringing material
• A statement of good-faith belief
• A statement under penalty of perjury that the information is accurate and that you are authorized to act

Help the Hive may remove or disable access to challenged material where appropriate.`
      }
    ]
  },
  {
    slug: "data-retention",
    title: "Data Retention Policy",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: `Help the Hive retains information only for as long as reasonably necessary to:
• Provide services
• Maintain platform integrity
• Comply with law
• Resolve disputes
• Enforce agreements
• Prevent fraud and abuse
• Preserve required records

Retention periods may vary depending on the type of information and applicable legal obligations.

Where appropriate, data may be deleted, anonymized, or de-identified after it is no longer needed.`
      }
    ]
  },
  {
    slug: "intellectual-property",
    title: "Intellectual Property Policy",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: `All Help the Hive platform materials, including software, text, graphics, branding, designs, layouts, workflows, systems, recommendation structures, interface elements, and related content, are owned by Help the Hive or its licensors unless otherwise stated.

You may not:
• Copy
• Distribute
• Modify
• Reverse engineer where prohibited
• Commercially exploit
• Create derivative works from protected materials without authorization

Requests regarding IP issues may be sent to:\n\n📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      }
    ]
  },
  {
    slug: "export-compliance",
    title: "Export Compliance",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: "Users agree to comply with applicable export control and trade laws related to their use of Help the Hive.\n\nYou may not use, export, or access the platform in violation of applicable laws, sanctions, or restrictions."
      }
    ]
  },
  {
    slug: "third-party-services",
    title: "Third-Party Services Disclosure",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: `Help the Hive may rely on third-party providers to support platform operations, including services such as:
• Payments
• Hosting
• Analytics
• Verification
• Email delivery
• Infrastructure
• Support tools

Help the Hive is not responsible for independent third-party terms, policies, or downtime beyond our reasonable control.

Users may also be subject to the terms and policies of those providers when interacting with integrated services.`
      }
    ]
  },
  {
    slug: "government-disclaimer",
    title: "Government Program Disclaimer",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: `Help the Hive may provide features, content, or discounts relevant to users who participate in public assistance or related programs.

Unless explicitly stated on a specific page or official partnership notice, Help the Hive is not:
• A government agency
• A public benefits administrator
• A state benefits office
• An official SNAP operator
• An official government enrollment platform

Use of Help the Hive does not create eligibility for government benefits, alter benefit status, or guarantee approval for any public program.`
      }
    ]
  },
  // ─── PLATFORM COMPLIANCE (NEW) ───
  {
    slug: "apple-app-store",
    title: "Apple App Store Compliance",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: `This page summarizes how Help the Hive complies with Apple App Store guidelines, including App Privacy disclosures, in-app requirements, and the App Tracking Transparency (ATT) framework.`
      },
      {
        heading: "App Privacy — Data Linked to You",
        content: `**Contact info:** Email address, name — for App Functionality and Product Personalization.

**User content:** Pantry inventory, price corrections, meal preferences — for App Functionality and Product Personalization.

**Identifiers:** User ID — for App Functionality, Analytics, Product Personalization.

**Usage data:** Product interactions and other usage data — for Analytics and Product Personalization.

**Diagnostics:** Crash data and performance data — for App Functionality.

**Financial info (only if SNAP tracker enabled):** SNAP benefit amount and self-reported usage — for App Functionality and Product Personalization.

**Location:** Coarse location (ZIP code level) — for App Functionality and Product Personalization.

**Health & fitness:** Dietary restrictions if provided — for App Functionality and Product Personalization.`
      },
      {
        heading: "Data Used to Track You",
        content: `**None.** Help the Hive does not currently track users across other companies' apps or websites.`
      },
      {
        heading: "App Tracking Transparency",
        content: `Because Help the Hive does not track across third-party apps or websites, no ATT prompt is shown. If we ever introduce cross-app tracking, we will request your permission via Apple's standard ATT prompt and the app will continue to work whether or not you allow tracking.`
      },
      {
        heading: "In-App Requirements",
        content: `• Account deletion is available in Settings → Delete Account
• Links to Terms of Service and Privacy Policy are available in Settings
• No in-app purchases or subscriptions — the app is 100% free for everyone`
      },
      {
        heading: "App Review Notes",
        content: `• Help the Hive is 100% free for all users with no subscriptions, no paywalls, and no in-app purchases.
• SNAP benefit tracking is a manual, self-reported feature. We do NOT connect to government systems, store EBT card numbers, or handle transactions.
• Estimated Pricing is clearly labeled; users are informed actual in-store prices may vary.
• Retailer integration via Instacart is an optional affiliate handoff — no purchase data is processed by our servers.
• Self-reported eligibility (SNAP, WIC, military, teacher) is used only for personalization and resource matching, not for gating access.`
      },
      {
        heading: "Contact",
        content: `For App Store compliance questions: [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      }
    ]
  },
  {
    slug: "google-play-store",
    title: "Google Play Store Compliance",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: `This page summarizes how Help the Hive complies with Google Play policies, including the Data Safety section, content rating, and permission disclosures.`
      },
      {
        heading: "Data Safety — Data Collected",
        content: `**Personal info:** Name, email address, user IDs — collected, stored, not shared, required.

**Location:** Approximate location — collected, stored, not shared, optional.

**Financial info:** SNAP benefit amount — collected only if user opts in, stored, not shared, optional.

**Health and fitness:** Dietary restrictions — collected only if provided, stored, not shared, optional.

**App activity:** App interactions and in-app search history — collected, stored, not shared.

**App info and performance:** Crash logs and diagnostics — collected, stored, not shared, required.

**Device or other IDs:** Collected, stored, not shared, required.

**Not collected:** Messages, photos/videos, audio, files, calendar, contacts, web browsing history.`
      },
      {
        heading: "Security Practices",
        content: `• Data is encrypted in transit (TLS 1.3)
• Data is encrypted at rest (AES-256)
• You can request that data be deleted from within the app or by contacting support`
      },
      {
        heading: "Content Rating",
        content: `Help the Hive is rated **Everyone (ESRB)** / **PEGI 3+**. The app contains no violence, sexual content, profanity, gambling, or drug references.`
      },
      {
        heading: "Permissions Disclosure",
        content: `**Notifications:** Help the Hive sends notifications to remind you about your weekly meal plan, SNAP deposit dates, and weekly deals at your store.

**Location (coarse, optional):** We use your approximate location to find your nearest store and show local deals. You can decline and manually enter your ZIP code.`
      },
      {
        heading: "Families Policy",
        content: `Help the Hive is a meal planning app designed for adults managing household budgets. Content, features, and marketing are directed at adult users. While families benefit from the app, users under 13 are not the intended audience.`
      },
      {
        heading: "Contact",
        content: `For Play Store compliance questions: [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
      }
    ]
  },
];

export function getPageBySlug(slug: string): LegalPageData | undefined {
  return legalPages.find(p => p.slug === slug);
}

export const footerColumns = [
  {
    title: "Company",
    links: [
      { label: "About Help the Hive", slug: "about" },
      { label: "How It Works", slug: "how-it-works" },
      { label: "Contact", slug: "contact" },
      { label: "Careers", slug: "careers" },
      { label: "Press", slug: "press" },
    ]
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", slug: "terms" },
      { label: "Privacy Policy", slug: "privacy" },
      { label: "Cookie Policy", slug: "cookies" },
      { label: "Acceptable Use Policy", slug: "acceptable-use" },
      { label: "Arbitration & Dispute Resolution", slug: "arbitration" },
    ]
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", slug: "help-center" },
      { label: "Report an Issue", slug: "report-issue" },
      { label: "Account Support", slug: "account-support" },
      { label: "Security Disclosure", slug: "security-disclosure" },
      { label: "Contact Support", slug: "contact-support" },
    ]
  },
  {
    title: "Programs",
    links: [
      { label: "SNAP Program", slug: "snap-program" },
      { label: "Veterans Program", slug: "veterans-program" },
      { label: "First Responders Program", slug: "first-responders" },
      { label: "Eligibility Verification", slug: "eligibility-verification" },
    ]
  },
  {
    title: "Trust & Safety",
    links: [
      { label: "Identity Verification Policy", slug: "identity-verification" },
      { label: "Responsible AI Policy", slug: "responsible-ai" },
      { label: "Accessibility Statement", slug: "accessibility" },
      { label: "Community Guidelines", slug: "community-guidelines" },
      { label: "Platform Integrity Policy", slug: "platform-integrity" },
      { label: "Anti-Fraud Policy", slug: "anti-fraud" },
    ]
  },
  {
    title: "Platform",
    links: [
      { label: "Meal Planner", slug: "meal-planner" },
      { label: "Pantry Manager", slug: "pantry-manager" },
      { label: "Grocery Lists", slug: "grocery-lists" },
      { label: "Budget Insights", slug: "budget-insights" },
      { label: "Recipe Recommendations", slug: "recipe-recommendations" },
      { label: "Household Profile", slug: "household-profile" },
    ]
  },
  {
    title: "Compliance",
    links: [
      { label: "DMCA Policy", slug: "dmca" },
      { label: "Data Retention Policy", slug: "data-retention" },
      { label: "Intellectual Property Policy", slug: "intellectual-property" },
      { label: "Export Compliance", slug: "export-compliance" },
      { label: "Third-Party Services Disclosure", slug: "third-party-services" },
      { label: "Government Program Disclaimer", slug: "government-disclaimer" },
      { label: "Apple App Store Compliance", slug: "apple-app-store" },
      { label: "Google Play Store Compliance", slug: "google-play-store" },
    ]
  }
];
