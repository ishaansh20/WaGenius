import { Link } from "react-router-dom";
import { Logo } from "../../components/ui";

const SECTION_TITLE = "text-[20px] font-semibold tracking-[-0.015em] text-ink";
const PARAGRAPH = "mt-3 text-[16px] leading-[1.7] text-ink";
const LINK = "font-medium text-brand-700 underline-offset-2 hover:underline";

export default function PrivacyPolicyPage() {
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
          Privacy policy
        </h1>
        <p className="mt-2 text-[14px] text-ink-muted">Last updated: August 2026</p>

        <div className="mt-10 space-y-10">
          <section>
            <h2 className={SECTION_TITLE}>Who this applies to</h2>
            <p className={PARAGRAPH}>
              This policy covers Wagenius (WAGENIUS), a WhatsApp Business messaging and campaign
              platform. It applies both to companies ("Companies") that create an account and
              connect their own WhatsApp Business Account to our platform, and to the end
              customers ("Contacts") that a Company messages through Wagenius.
            </p>
          </section>

          <section>
            <h2 className={SECTION_TITLE}>What we collect</h2>
            <p className={PARAGRAPH}>
              For a Company: account details (name, email, company name) and the credentials
              needed to connect their WhatsApp Business Account. For a Contact: information sent
              or received through WhatsApp on behalf of the Company they're messaging with — name,
              phone number, message content, and any campaign or template data associated with
              that conversation.
            </p>
          </section>

          <section>
            <h2 className={SECTION_TITLE}>How we use it</h2>
            <p className={PARAGRAPH}>
              Data is used solely to provide the messaging and campaign-management service each
              Company signs up for: sending and receiving WhatsApp messages on their behalf,
              managing message templates and campaigns, and — where a Company enables it —
              generating an AI-assisted first reply to an inbound message before it's handed to a
              human agent. We do not sell data, and we do not use it for advertising.
            </p>
          </section>

          <section>
            <h2 className={SECTION_TITLE}>Who we share it with</h2>
            <p className={PARAGRAPH}>
              Only the third parties required to deliver the service itself: WhatsApp/Meta (to
              send and receive messages), and Groq (to generate an AI-assisted reply, only when a
              Company has that feature enabled). We do not share data with any other third party.
            </p>
          </section>

          <section>
            <h2 className={SECTION_TITLE}>How we store it</h2>
            <p className={PARAGRAPH}>
              Data is stored in a managed, encrypted-at-rest database (MongoDB Atlas). WhatsApp
              access credentials are additionally encrypted at the application level before being
              stored, so they're never held in plain text.
            </p>
          </section>

          <section>
            <h2 className={SECTION_TITLE}>How long we keep it</h2>
            <p className={PARAGRAPH}>
              Data is retained for as long as a Company's account remains active on the platform.
              A Company can request deletion of their account and associated data at any time —
              see our{" "}
              <Link to="/data-deletion" className={LINK}>
                Data Deletion page
              </Link>{" "}
              for how.
            </p>
          </section>

          <section>
            <h2 className={SECTION_TITLE}>Contact</h2>
            <p className={PARAGRAPH}>
              Questions about this policy, or a request related to your data, can be sent to{" "}
              <a href="mailto:info@nuformsocial.com" className={LINK}>
                info@nuformsocial.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-[14px]">
          <Link to="/login" className="font-medium text-ink-muted hover:text-ink">
            ← Back to sign in
          </Link>
          <Link to="/data-deletion" className="font-medium text-ink-muted hover:text-ink">
            Data deletion
          </Link>
        </div>
      </main>
    </div>
  );
}
