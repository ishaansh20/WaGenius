import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, CheckCircle2 } from "lucide-react";
import { AiReplyChip, InboxMock, PhoneMock, TemplateMessage } from "./ProductMockups";

const REASSURANCES = ["Free plan available", "Simple monthly pricing in ₹", "Guided WhatsApp setup"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft brand backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#ddf5e8,transparent)]" />
        <div className="absolute right-[-120px] top-[260px] h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,#effbd2,transparent)]" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-12 sm:px-6 md:pt-20 lg:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface/80 px-3.5 py-1.5 text-[14px] font-medium text-brand-800">
            <BadgeCheck size={16} className="text-brand-600" />
            Built on the official WhatsApp Business Platform
          </span>

          <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-brand-950 sm:text-[56px] lg:text-[68px]">
            Turn WhatsApp chats into <span className="relative whitespace-nowrap text-brand-600">
              repeat sales
              <svg
                aria-hidden="true"
                viewBox="0 0 300 12"
                className="absolute -bottom-2 left-0 h-3 w-full text-accent"
                preserveAspectRatio="none"
              >
                <path d="M2 9C60 3 140 2 298 6" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-muted sm:text-[20px]">
            Send offers to all your customers, answer every message from <strong className="font-semibold text-ink">one shared inbox</strong>,
            and let <strong className="font-semibold text-ink">AI reply</strong> when you're busy — built for shop owners, not tech teams.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-900 px-7 font-display text-[16px] font-medium text-white transition-colors hover:bg-brand-800 sm:w-auto"
            >
              Start free <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-xl border border-line-strong bg-surface px-7 font-display text-[16px] font-medium text-ink transition-colors hover:border-ink-subtle sm:w-auto"
            >
              See how it works
            </a>
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px] font-medium text-ink-muted">
            {REASSURANCES.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CheckCircle2 size={17} className="text-brand-600" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-16 max-w-[980px]"
        >
          <InboxMock className="mr-0 lg:mr-28" />

          <PhoneMock className="absolute -right-2 top-10 hidden lg:block">
            <TemplateMessage />
          </PhoneMock>

          <AiReplyChip className="absolute -bottom-6 left-4 hidden sm:flex lg:-left-10" />
        </motion.div>
      </div>
    </section>
  );
}
