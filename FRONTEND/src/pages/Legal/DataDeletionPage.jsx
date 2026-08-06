import { Link } from "react-router-dom";

const SECTION_TITLE = "mb-2 text-[15px] font-semibold text-slate-900";
const PARAGRAPH = "mb-3 text-[13.5px] leading-relaxed text-slate-600";

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">Wagenius</p>
        <h1 className="mt-1 text-[22px] font-semibold text-slate-900">Data Deletion</h1>
        <p className="mt-1 text-[12.5px] text-slate-400">Last updated: August 2026</p>

        <div className="mt-6 space-y-6">
          <section>
            <h2 className={SECTION_TITLE}>If you're a Company using Wagenius</h2>
            <p className={PARAGRAPH}>
              You can request deletion of your company account and all associated data — contacts,
              conversations, templates, and campaigns — at any time by emailing{" "}
              <a href="mailto:info@nuformsocial.com" className="font-medium text-emerald-600 hover:underline">
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
              <a href="mailto:info@nuformsocial.com" className="font-medium text-emerald-600 hover:underline">
                info@nuformsocial.com
              </a>{" "}
              and we'll help route your request to the right business.
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
