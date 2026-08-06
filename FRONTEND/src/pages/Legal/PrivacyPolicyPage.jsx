import { Link } from "react-router-dom";

const SECTION_TITLE = "mb-2 text-[15px] font-semibold text-slate-900";
const PARAGRAPH = "mb-3 text-[13.5px] leading-relaxed text-slate-600";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">Wagenius</p>
        <h1 className="mt-1 text-[22px] font-semibold text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-[12.5px] text-slate-400">Last updated: August 2026</p>

        <div className="mt-6 space-y-6">
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
              <Link to="/data-deletion" className="font-medium text-emerald-600 hover:underline">
                Data Deletion page
              </Link>{" "}
              for how.
            </p>
          </section>

          <section>
            <h2 className={SECTION_TITLE}>Contact</h2>
            <p className={PARAGRAPH}>
              Questions about this policy, or a request related to your data, can be sent to{" "}
              <a href="mailto:info@nuformsocial.com" className="font-medium text-emerald-600 hover:underline">
                info@nuformsocial.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4">
          <Link to="/login" className="text-[12.5px] font-medium text-slate-500 hover:text-slate-700">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
