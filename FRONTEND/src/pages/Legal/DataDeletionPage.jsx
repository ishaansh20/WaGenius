import { Link } from "react-router-dom";
import { Logo } from "../../components/ui";

const SECTION_TITLE = "text-[20px] font-semibold tracking-[-0.015em] text-ink";
const PARAGRAPH = "mt-3 text-[16px] leading-[1.7] text-ink";
const LINK = "font-medium text-brand-700 underline-offset-2 hover:underline";

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Wagenius home">
            <Logo />
          </Link>
          <Link to="/login" className="text-[14px] font-medium text-ink-muted hover:text-ink">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-[32px] font-semibold tracking-[-0.025em] text-ink sm:text-[36px]">
          Data deletion
        </h1>
        <p className="mt-2 text-[14px] text-ink-muted">Last updated: August 2026</p>

        <div className="mt-10 space-y-10">
          <section>
            <h2 className={SECTION_TITLE}>If you're a Company using Wagenius</h2>
            <p className={PARAGRAPH}>
              You can request deletion of your company account and all associated data — contacts,
              conversations, templates, and campaigns — at any time by emailing{" "}
              <a href="mailto:info@nuformsocial.com" className={LINK}>
                info@nuformsocial.com
              </a>{" "}
              from the email address your account is registered with. Include your company name
              so we can confirm the right account. We'll confirm your request and complete
              deletion within a reasonable time, typically within 30 days.
            </p>
          </section>

          <section>
            <h2 className={SECTION_TITLE}>If you're a customer of a business using Wagenius</h2>
            <p className={PARAGRAPH}>
              If you've received a WhatsApp message from a business using Wagenius, that business
              — not Wagenius — owns the relationship with you and your data. Wagenius only
              processes that data on their behalf. To request deletion of your information, please
              contact that business directly. If you're not sure how to reach them, you can still
              email us at{" "}
              <a href="mailto:info@nuformsocial.com" className={LINK}>
                info@nuformsocial.com
              </a>{" "}
              and we'll help route your request to the right business.
            </p>
          </section>
        </div>

        <div className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-[14px]">
          <Link to="/login" className="font-medium text-ink-muted hover:text-ink">
            ← Back to sign in
          </Link>
          <Link to="/privacy-policy" className="font-medium text-ink-muted hover:text-ink">
            Privacy policy
          </Link>
        </div>
      </main>
    </div>
  );
}
