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
const CONTACT_BUSINESS = "legal@helpthehive.com";
const CONTACT_SUPPORT = "marcos@helpthehive.com";
const CONTACT_PRIVACY = "privacy@helpthehive.com";

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
        heading: "7. Verification and Program Access",
        content: "Some discounts, programs, or eligibility flows may require documentation or identity verification. Help the Hive may review submitted information or use third-party services to verify eligibility. Submission of materials does not guarantee approval."
      },
      {
        heading: "8. Payments and Subscriptions",
        content: `Paid features may be offered through monthly or annual subscriptions or other billing models. By purchasing a paid service, you agree to the pricing and billing terms shown at checkout.

**Auto-Renewal:** Subscriptions automatically renew at the end of each billing period unless you cancel before the renewal date. You will be charged the then-current subscription rate upon each renewal. You can manage or cancel your subscription at any time through your account settings or through the app store where you originally subscribed.

**In-App Purchases:** If you subscribe or make purchases through the Apple App Store or Google Play Store, the respective store's payment terms apply. Billing is managed by the app store, and refund requests for in-app purchases must be directed to Apple or Google per their refund policies.

**Free Trials:** If offered, free trials automatically convert to paid subscriptions at the end of the trial period unless canceled beforehand.`
      },
      {
        heading: "9. Suspension and Termination",
        content: `We may suspend, restrict, or terminate access to the platform at our discretion for reasons including:
• Suspected fraud
• Violation of these Terms
• Misuse of discounts or benefits
• Platform abuse
• Legal or security concerns`
      },
      {
        heading: "10. Intellectual Property",
        content: "The platform, including its software, branding, systems, text, graphics, workflows, UI, and underlying methods, is owned by Help the Hive or its licensors and is protected by applicable intellectual property laws."
      },
      {
        heading: "11. Disclaimer of Warranties",
        content: 'The platform is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, Help the Hive disclaims warranties of any kind, express or implied.'
      },
      {
        heading: "12. Limitation of Liability",
        content: "To the fullest extent permitted by law, Help the Hive will not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages, or for lost profits, lost data, lost savings, or business interruption."
      },
      {
        heading: "13. Indemnification",
        content: "You agree to defend, indemnify, and hold harmless Help the Hive and its affiliates, officers, employees, and contractors from claims arising out of your use of the platform, your content, or your violation of these Terms."
      },
      {
        heading: "14. Governing Law",
        content: "These Terms are governed by the laws of the State of California, without regard to conflict of law principles, except where otherwise required by applicable law."
      },
      {
        heading: "15. Account Deletion",
        content: `You may request deletion of your account and associated personal data at any time by contacting us or using the account deletion option in your app settings.

Upon deletion:
• Your account will be deactivated and personal data will be scheduled for deletion
• Some information may be retained as required by law, for fraud prevention, or to resolve disputes
• Active subscriptions should be canceled through your app store before requesting account deletion

Account deletion requests will be processed within 30 days of the request.`
      },
      {
        heading: "16. End User License Agreement (EULA)",
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
        heading: "17. Third-Party App Store Terms",
        content: `If you download or use Help the Hive through the Apple App Store or Google Play Store, the following applies:

• These Terms are between you and Help the Hive, not Apple Inc. or Google LLC
• Apple and Google are not responsible for the app, its content, or any claims related to its use
• Apple and Google are third-party beneficiaries of these Terms and may enforce them
• You must comply with any applicable third-party terms of agreement when using the app
• In the event of any failure of the app to conform to any applicable warranty, you may notify Apple or Google for a refund of the purchase price (if any); to the maximum extent permitted by law, Apple and Google have no other warranty obligations with respect to the app`
      },
      {
        heading: "18. Changes to These Terms",
        content: "We may update these Terms from time to time. Continued use of the platform after changes become effective constitutes acceptance of the updated Terms."
      },
      {
        heading: "19. Contact",
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
        content: "Help the Hive respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect information when you use our platform."
      },
      {
        heading: "1. Information We Collect",
        content: `We may collect:
• Name
• Email address
• ZIP code
• Household size
• Dietary preferences
• Allergy information
• Pantry and grocery-related information
• Device and browser information
• Payment-related metadata
• Uploaded verification documents
• Communications with support
• Usage analytics and interaction data`
      },
      {
        heading: "2. How We Use Information",
        content: `We may use information to:
• Provide and operate the platform
• Personalize meal planning and household recommendations
• Improve platform performance and product design
• Process eligibility verification
• Provide customer support
• Maintain platform safety and security
• Prevent fraud and abuse
• Process subscriptions and billing-related functions
• Comply with legal obligations`
      },
      {
        heading: "3. How We Share Information",
        content: `We may share information with:
• Service providers that help us operate the platform
• Payment processors
• Verification vendors
• Analytics providers
• Infrastructure and hosting providers
• Legal authorities where required by law
• Professional advisors as reasonably necessary

We do not sell personal user data.`
      },
      {
        heading: "4. Verification Documents",
        content: "If you upload documents for eligibility verification, those materials may be processed to evaluate access to discounts, programs, or benefits. Such documents are handled using reasonable security controls and may be retained only as long as necessary for verification, fraud prevention, recordkeeping, or legal compliance."
      },
      {
        heading: "5. Data Security",
        content: "We use reasonable administrative, technical, and organizational measures to protect information. No security system is perfect, and we cannot guarantee absolute security."
      },
      {
        heading: "6. Data Retention",
        content: "We retain information for as long as necessary to provide services, comply with legal obligations, resolve disputes, enforce agreements, and prevent fraud."
      },
      {
        heading: "7. Your Choices",
        content: `Depending on your location and applicable law, you may have rights to:
• Access certain personal information
• Correct inaccurate information
• Request deletion
• Object to certain processing
• Manage marketing preferences

Requests may be sent to:\n\n📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})`
      },
      {
        heading: "8. Children's Privacy",
        content: "Help the Hive is not directed to children under 13, and we do not knowingly collect personal information from children under 13 without appropriate legal authorization. If we learn that we have collected personal information from a child under 13, we will take steps to delete that information as quickly as possible."
      },
      {
        heading: "9. Account Deletion and Data Removal",
        content: `You have the right to request deletion of your account and the personal data associated with it. You can do this by:
• Using the account deletion option in the app settings
• Contacting us at ${CONTACT_SUPPORT}

Upon receiving a valid deletion request, we will:
• Delete or anonymize your personal data within 30 days
• Confirm completion of the deletion
• Retain only data required by law, for fraud prevention, or to resolve disputes

If you subscribed through the Apple App Store or Google Play Store, you must cancel your subscription through the respective store before requesting account deletion.`
      },
      {
        heading: "10. California Privacy Rights (CCPA)",
        content: `If you are a California resident, you have the right to:
• Know what personal information we collect, use, and disclose
• Request deletion of your personal information
• Opt out of the sale of your personal information (we do not sell personal data)
• Not be discriminated against for exercising your privacy rights

To exercise these rights, contact us at ${CONTACT_SUPPORT}.`
      },
      {
        heading: "11. International Use and Data Transfers",
        content: "If the platform is accessed outside the United States, information may be processed in the United States or other jurisdictions where service providers operate. By using Help the Hive, you consent to the transfer and processing of your data in the United States."
      },
      {
        heading: "12. App Store and Play Store Data Practices",
        content: `When you use Help the Hive through the Apple App Store or Google Play Store:
• Data collection and usage are governed by this Privacy Policy
• Apple and Google may collect additional data per their own privacy policies
• In-app purchase and subscription data is processed by the respective app store
• We do not share your personal data with Apple or Google beyond what is required for app functionality`
      },
      {
        heading: "13. Changes to This Policy",
        content: "We may update this Privacy Policy from time to time. Updates become effective when posted. We will notify you of material changes through the app or by email."
      },
      {
        heading: "14. Contact",
        content: `For privacy questions:\n\n📧 [${CONTACT_BUSINESS}](mailto:${CONTACT_BUSINESS})`
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
    slug: "refunds",
    title: "Refund & Subscription Policy",
    lastUpdated: LAST_UPDATED,
    category: "legal",
    sections: [
      {
        content: "Certain Help the Hive features may require paid access."
      },
      {
        heading: "Billing",
        content: `Paid plans may be billed:
• Monthly
• Annually
• Under promotional terms shown at checkout`
      },
      {
        heading: "Renewals",
        content: "Unless otherwise stated, subscriptions may renew automatically at the end of the billing cycle unless canceled before renewal."
      },
      {
        heading: "Cancellation",
        content: "Users may cancel subscriptions through account settings or other account management methods provided by the platform.\n\nCancellation will typically stop future renewals but will not retroactively cancel charges already processed for the current billing period, except where required by law."
      },
      {
        heading: "Refunds",
        content: `Refunds are generally not provided for:
• Partial billing periods
• Unused time
• Failure to cancel before renewal

However, refunds may be issued:
• Where required by law
• To resolve billing errors
• In limited cases at our discretion`
      },
      {
        heading: "Price Changes",
        content: "We may update subscription prices from time to time. Material changes will apply prospectively."
      },
      {
        heading: "Billing Questions",
        content: `Billing questions may be sent to:\n\n📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})`
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
    slug: "billing-support",
    title: "Billing Support",
    lastUpdated: LAST_UPDATED,
    category: "support",
    sections: [
      {
        content: `Billing Support is available for:
• Subscription questions
• Duplicate charges
• Invoice requests
• Plan changes
• Cancellation questions
• Payment-related concerns

For billing questions:\n\n📧 [${CONTACT_SUPPORT}](mailto:${CONTACT_SUPPORT})`
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

  // ─── PROGRAMS ───
  {
    slug: "snap-program",
    title: "SNAP Program",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "Help the Hive may offer discounted or free access to eligible users receiving Supplemental Nutrition Assistance Program (SNAP) benefits."
      },
      {
        heading: "Eligibility",
        content: "Users may be asked to provide documentation or other verification materials to confirm eligibility."
      },
      {
        heading: "Verification",
        content: `Verification may include review of:
• Current benefit documentation
• Participant identification details
• Other reasonable eligibility evidence`
      },
      {
        heading: "Approval",
        content: "Submission of documentation does not guarantee approval. Help the Hive reserves the right to deny, revoke, or limit access where verification cannot be completed or where misuse is suspected."
      },
      {
        heading: "Government Disclaimer",
        content: "Help the Hive is not affiliated with, endorsed by, or operated by the U.S. government or any state agency unless explicitly stated."
      },
      {
        heading: "Data Handling",
        content: "Documents submitted for verification are handled according to Help the Hive's privacy and security policies."
      }
    ]
  },
  {
    slug: "military-discount",
    title: "Military Discount",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "Help the Hive may offer discounted access to eligible active duty military personnel.\n\nVerification may require reasonable documentation or an approved third-party verification method.\n\nDiscount availability, eligibility rules, and renewal requirements may change over time."
      }
    ]
  },
  {
    slug: "student-discount",
    title: "Student Discount",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: `Help the Hive may offer discounted access to eligible students enrolled in recognized educational institutions.

Verification may require:
• Valid student identification
• Institutional email address
• Third-party verification tools
• Other proof of enrollment

Discount terms may vary by plan and promotional availability.`
      }
    ]
  },
  {
    slug: "veterans-program",
    title: "Veterans Program",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: `Help the Hive may offer discounted access to eligible veterans.

Verification may require:
• Veteran status documentation
• Approved verification systems
• Other reasonable proof of status

Misrepresentation of eligibility may result in denial or removal of discounted access.`
      }
    ]
  },
  {
    slug: "first-responders",
    title: "First Responders Program",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: `Help the Hive may offer discounted access to eligible first responders, including:
• Firefighters
• Police officers
• EMTs
• Paramedics
• Other qualifying emergency personnel

Verification may require valid documentation or an approved third-party verification process.`
      }
    ]
  },
  {
    slug: "eligibility-verification",
    title: "Eligibility Verification",
    lastUpdated: LAST_UPDATED,
    category: "programs",
    sections: [
      {
        content: "Some Help the Hive programs and discounts require verification to protect the platform from fraud and preserve access for eligible users."
      },
      {
        heading: "Verification May Include",
        content: `• Document upload
• Identity confirmation
• Status confirmation
• Renewal verification
• Third-party validation tools`
      },
      {
        heading: "Review Standards",
        content: `We may reject, request more information, or revoke benefits where:
• Documentation is incomplete
• Information appears inaccurate
• Fraud is suspected
• Eligibility cannot be reasonably confirmed`
      }
    ]
  },

  // ─── TRUST & SAFETY ───
  {
    slug: "identity-verification",
    title: "Identity Verification Policy",
    lastUpdated: LAST_UPDATED,
    category: "trust",
    sections: [
      {
        content: "Help the Hive may require identity or eligibility verification for certain features, discounts, support escalations, or fraud prevention measures."
      },
      {
        heading: "Why Verification May Be Required",
        content: `• Protect discounts from abuse
• Confirm benefit status
• Reduce fraud
• Protect users and platform integrity
• Maintain fair access`
      },
      {
        heading: "Verification Methods",
        content: `Verification may include:
• Document upload
• Identity matching
• Email verification
• Phone verification
• Third-party identity verification systems`
      },
      {
        heading: "Document Handling",
        content: "Documents are used only for authorized verification, fraud prevention, platform integrity, and legal compliance purposes."
      }
    ]
  },
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
  {
    slug: "billing-plan-disclosure",
    title: "Billing & Plan Disclosure",
    lastUpdated: LAST_UPDATED,
    category: "compliance",
    sections: [
      {
        content: `Help the Hive may offer different plan levels, promotional pricing, trials, discount access, or program-based eligibility pricing.

Plan features, pricing, and eligibility may vary based on:
• Promotional windows
• Subscription level
• User category
• Program participation
• Platform changes

Feature access may change over time as the platform evolves.

All plan details shown at checkout or within account settings control over general descriptions on informational pages.`
      }
    ]
  }
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
      { label: "Data Collection Policy", slug: "data-collection" },
      { label: "Cookie Policy", slug: "cookies" },
      { label: "Data Security Policy", slug: "data-security" },
      { label: "Refund & Subscription Policy", slug: "refunds" },
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
      { label: "Billing Support", slug: "billing-support" },
      { label: "Security Disclosure", slug: "security-disclosure" },
      { label: "Contact Support", slug: "contact-support" },
    ]
  },
  {
    title: "Programs",
    links: [
      { label: "SNAP Program", slug: "snap-program" },
      { label: "Military Discount", slug: "military-discount" },
      { label: "Student Discount", slug: "student-discount" },
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
    ]
  }
];
