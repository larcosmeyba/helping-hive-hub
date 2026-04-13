import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-16 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Help The Hive Privacy Policy
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-8">
            Last Updated: April 2026
          </div>

          <div className="space-y-8 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Help The Hive ("we", "our", or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and protect your information when using the Help The Hive website and mobile application.
            </p>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">Information We Collect</h2>
              <p className="mb-3">We may collect the following types of information when you use Help The Hive:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>Email address and account information</li>
                <li>Household size and household member information</li>
                <li>Dietary preferences or dietary restrictions</li>
                <li>Grocery budget inputs</li>
                <li>ZIP code or location used for grocery pricing</li>
                <li>Meal planning preferences</li>
                <li>Device information used to access the app</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">How We Use Information</h2>
              <p className="mb-3">We use the collected information to:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>Generate personalized meal plans</li>
                <li>Estimate grocery costs and create shopping lists</li>
                <li>Improve app performance and user experience</li>
                <li>Provide customer support</li>
                <li>Maintain security and prevent fraud</li>
              </ul>
              <p className="mt-3">We do not sell or rent personal information to third parties.</p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">Data Storage and Security</h2>
              <p>User data is securely stored using industry-standard security practices. We take reasonable technical and administrative measures to protect personal information.</p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">Data Retention</h2>
              <p className="mb-3">Help The Hive retains user data only as long as necessary to provide the services within the app.</p>
              <p className="mb-3">Account information, meal plans, grocery lists, and preferences remain stored while the user account is active.</p>
              <p>If a user deletes their account or requests deletion, personal data will be permanently removed from our systems within 30 days unless retention is required for legal or financial obligations.</p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">Data Deletion</h2>
              <p className="mb-3">Users may request deletion of their personal data at any time.</p>
              <p className="mb-3">
                Users may delete their account directly inside the app settings or request deletion by contacting:{" "}
                <a href="mailto:support@helpthehive.com" className="text-primary hover:underline">support@helpthehive.com</a>
              </p>
              <p>Once a deletion request is received, Help The Hive will permanently delete associated personal data within 30 days.</p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">Third-Party Services</h2>
              <p>Help The Hive may integrate with third-party services for grocery pricing data or payment processing. These services may process limited data required to provide their functionality.</p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. Updates will be posted on this page with the updated revision date.</p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">Contact Information</h2>
              <p className="mb-1">If you have questions regarding this Privacy Policy or your data, please contact:</p>
              <p className="mt-3 font-medium text-foreground">Help The Hive</p>
              <p>
                <a href="mailto:support@helpthehive.com" className="text-primary hover:underline">support@helpthehive.com</a>
              </p>
              <p>
                <a href="https://helpthehive.com" className="text-primary hover:underline">https://helpthehive.com</a>
              </p>
            </section>
          </div>

          <Separator className="my-10" />
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            Help the Hive provides planning and information tools only. The platform does not provide legal advice, financial advice, medical advice, dietetic treatment, or government benefit administration. Users are responsible for reviewing ingredients, dietary needs, pricing, store availability, and personal circumstances before making decisions.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
