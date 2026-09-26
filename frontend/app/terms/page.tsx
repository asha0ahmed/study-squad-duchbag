import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Study Squad",
  description: "The rules for using the Study Squad platform.",
};

export default function TermsConditionsPage() {
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
            className="rounded-full px-3 py-1.5 text-text-dim transition-colors hover:text-text"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="rounded-full bg-cyan/10 px-3 py-1.5 font-semibold text-cyan"
          >
            Terms &amp; Conditions
          </Link>
        </div>

        <p className="eyebrow text-cyan">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-text">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-text-faint">Last updated: September 2026</p>

        <p className="mt-6 max-w-2xl text-text-dim">
          These Terms &amp; Conditions explain the rules for using the Study Squad platform.
          By using Study Squad, you agree to all of the terms below.
        </p>

        <div className="card-flat mt-8 border-l-4 border-cyan/50 px-6 py-5">
          <p className="mb-3 font-display text-sm font-semibold text-cyan">Contents</p>
          <ol className="grid list-decimal gap-x-6 gap-y-2 pl-4 text-sm text-text-dim sm:grid-cols-2">
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#acceptance">
                Acceptance of Terms
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#eligibility">
                Eligibility &amp; Account
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#notes-content">
                Notes &amp; Uploaded Content
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#mentor-services">
                Mentor Services
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#payments-subs">
                Payments &amp; Subscriptions
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#refund">
                Refund Policy
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#conduct">
                User Conduct
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#academic-integrity">
                Academic Integrity
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#availability">
                Service Availability &amp; Disclaimer
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#changes-termination">
                Changes &amp; Termination
              </a>
            </li>
            <li>
              <a className="hover:text-text hover:underline underline-offset-2" href="#governing-law">
                Governing Law &amp; Contact
              </a>
            </li>
          </ol>
        </div>

        <div className="mt-10 flex flex-col gap-10">
          <section id="acceptance">
            <h2 className="font-display text-xl font-bold text-text">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3 text-text-dim">
              By using Study Squad, you are considered to have read and accepted these Terms.
            </p>
          </section>

          <section id="eligibility">
            <h2 className="font-display text-xl font-bold text-text">
              2. Eligibility &amp; Account
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>You must provide accurate and truthful information when creating an account</li>
              <li>You are fully responsible for the security of your account (password, etc.)</li>
            </ul>
          </section>

          <section id="notes-content">
            <h2 className="font-display text-xl font-bold text-text">
              3. Notes &amp; Uploaded Content
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>Copyright infringement is not allowed</li>
              <li>Illegal or harmful content may not be uploaded</li>
              <li>Study Squad may review and remove any content when necessary</li>
            </ul>
          </section>

          <section id="mentor-services">
            <h2 className="font-display text-xl font-bold text-text">4. Mentor Services</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>All mentors are approved by Study Squad</li>
              <li>Each mentor session/course has its own basic rules, which will be communicated separately</li>
              <li>If a mentor becomes unavailable, we will try to arrange an alternative</li>
              <li>Mentors may not privately sell their own services or courses to Study Squad&apos;s students</li>
            </ul>
          </section>

          <section id="payments-subs">
            <h2 className="font-display text-xl font-bold text-text">
              5. Payments &amp; Subscriptions
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>Payments can be made via bKash/Nagad</li>
              <li>Services are activated only after admin verification is complete</li>
              <li>Subscription plans: 1-month or 6-month terms</li>
              <li>There is no automatic renewal — you must resubscribe once your term ends</li>
            </ul>
          </section>

          <section id="refund">
            <h2 className="font-display text-xl font-bold text-text">6. Refund Policy</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-text-dim">
              <li>Valid refund requests are generally processed within 48 hours</li>
              <li>Any applicable fees or charges may be deducted</li>
              <li>Refunds may be limited or denied in cases of fraud, false information, abuse, or violation of these Terms</li>
            </ul>
          </section>

          <section id="conduct">
            <h2 className="font-display text-xl font-bold text-text">7. User Conduct</h2>
            <p className="mt-3 text-text-dim">
              Harassment, cheating, fraud, abuse, spam, and similar behavior are strictly
              prohibited. Accounts found engaging in such behavior may be suspended or
              terminated.
            </p>
          </section>

          <section id="academic-integrity">
            <h2 className="font-display text-xl font-bold text-text">8. Academic Integrity</h2>
            <p className="mt-3 text-text-dim">
              Platform resources may not be used for cheating or for submitting someone
              else&apos;s academic work as your own.
            </p>
          </section>

          <section id="availability">
            <h2 className="font-display text-xl font-bold text-text">
              9. Service Availability &amp; Disclaimer
            </h2>
            <p className="mt-3 text-text-dim">
              We do not guarantee that Study Squad will always be available without
              interruption. Study Squad is an educational support platform and does not
              guarantee any specific academic result.
            </p>
          </section>

          <section id="changes-termination">
            <h2 className="font-display text-xl font-bold text-text">
              10. Changes &amp; Termination
            </h2>
            <p className="mt-3 text-text-dim">
              These Terms or the service may be changed as needed. Accounts found in serious
              violation may be terminated.
            </p>
          </section>

          <section id="governing-law">
            <h2 className="font-display text-xl font-bold text-text">
              11. Governing Law &amp; Contact
            </h2>
            <p className="mt-3 text-text-dim">
              These Terms are governed by the applicable laws of Bangladesh.
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
