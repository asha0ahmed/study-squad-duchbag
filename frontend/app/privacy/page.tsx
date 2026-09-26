import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Study Squad",
  description: "How Study Squad collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="relative flex-1 px-6 py-16 lg:py-20">
      <div
        className="glow-orb h-96 w-96 bg-indigo/15"
        style={{ top: "-4rem", left: "-6rem" }}
      />
      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Link
            href="/privacy"
            className="rounded-full bg-cyan/10 px-3 py-1.5 font-semibold text-cyan"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="rounded-full px-3 py-1.5 text-text-dim transition-colors hover:text-text"
          >
            Terms &amp; Conditions
          </Link>
        </div>

        <p className="eyebrow text-cyan">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-text">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-text-faint">Last updated: September 2026</p>

        <p className="mt-6 max-w-2xl text-text-dim">
          Welcome to Study Squad. We help students with note sharing, mentorship, and
          career-related support. This Privacy Policy explains what information we collect,
          how we use it, and how we keep it safe. By using Study Squad, you agree to this
          policy.
        </p>

        <div className="card-flat mt-8 border-l-4 border-cyan/50 px-6 py-5">
          <p className="mb-3 font-display text-sm font-semibold text-cyan">Contents</p>
          <ol className="grid list-decimal gap-x-6 gap-y-2 pl-4 text-sm text-text-dim sm:grid-cols-2">
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#info-collect">
                Information We Collect
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#info-use">
                How We Use Your Information
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#info-visibility">
                Who Can See Your Information
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#content-copyright">
                User Content &amp; Copyright
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#payments">
                Payments
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#security">
                Data Security
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#retention">
                Data Retention &amp; Deletion
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#changes-contact">
                Policy Changes &amp; Contact
              </a>
            </li>
          </ol>
        </div>

        <div className="mt-10 flex flex-col gap-10">
          <section id="info-collect">
            <h2 className="font-display text-xl font-bold text-text">
              1. Information We Collect
            </h2>
            <p className="mt-3 text-text-dim">
              To create your account and provide our services, we may collect:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>Name, email address, and phone number</li>
              <li>Institution and class/academic information</li>
              <li>Payment and referral information</li>
              <li>Notes/PDFs you upload</li>
              <li>Chat and other communication data on the platform</li>
            </ul>
          </section>

          <section id="info-use">
            <h2 className="font-display text-xl font-bold text-text">
              2. How We Use Your Information
            </h2>
            <p className="mt-3 text-text-dim">We use the information we collect to:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>Create and manage your account</li>
              <li>Provide mentor services</li>
              <li>Verify payments</li>
              <li>Improve the platform</li>
              <li>Send necessary emails or notifications</li>
            </ul>
          </section>

          <section id="info-visibility">
            <h2 className="font-display text-xl font-bold text-text">
              3. Who Can See Your Information
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>Other students generally cannot see your private profile information</li>
              <li>Approved mentors can see the student information needed to provide their service</li>
              <li>Admins may have access to certain information for payment verification</li>
            </ul>
            <p className="mt-3 text-text-dim">
              We do not sell your personal information to any third party.
            </p>
          </section>

          <section id="content-copyright">
            <h2 className="font-display text-xl font-bold text-text">
              4. User Content &amp; Copyright
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>You are fully responsible for any content you upload</li>
              <li>You may not upload copyright-protected material without permission</li>
              <li>If we receive a valid complaint about content, we may review it and remove it if necessary</li>
            </ul>
          </section>

          <section id="payments">
            <h2 className="font-display text-xl font-bold text-text">5. Payments</h2>
            <p className="mt-3 text-text-dim">
              Information from payments made via bKash/Nagad is used only for verification and
              to activate the relevant service. This information is not used for any other
              purpose.
            </p>
          </section>

          <section id="security">
            <h2 className="font-display text-xl font-bold text-text">6. Data Security</h2>
            <p className="mt-3 text-text-dim">
              We take reasonable security measures to protect your information. However,
              please note that no internet-based system can be guaranteed to be 100% secure.
            </p>
          </section>

          <section id="retention">
            <h2 className="font-display text-xl font-bold text-text">
              7. Data Retention &amp; Deletion
            </h2>
            <p className="mt-3 text-text-dim">
              We may retain your information for as long as necessary. You may request
              deletion of your account or data at any time — please contact us using the
              details below.
            </p>
          </section>

          <section id="changes-contact">
            <h2 className="font-display text-xl font-bold text-text">
              8. Policy Changes &amp; Contact
            </h2>
            <p className="mt-3 text-text-dim">
              This Privacy Policy may be updated as needed. We will try to notify users of
              any significant changes.
            </p>
            <p className="mt-3 text-text-dim">
              If you have any questions, you can reach the Study Squad team through the
              complaint/contact form available inside the app, or the contact details shared
              with your cohort.
            </p>
          </section>
        </div>

        <p className="mt-14 border-t border-border-soft pt-6 text-sm text-text-faint">
          © {new Date().getFullYear()} Study Squad. All rights reserved.
        </p>
      </div>
    </main>
  );
}
