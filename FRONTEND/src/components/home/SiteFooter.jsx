import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Logo from "../ui/Logo";

export function CtaBand() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:py-24">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] bg-brand-900 px-6 py-14 text-center sm:px-12 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-[32px] font-semibold tracking-[-0.02em] text-white sm:text-[48px]">
            Your customers are already on WhatsApp.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[18px] text-white/80">
            Meet them there — with offers they read and replies they get on time.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-7 font-display text-[16px] font-medium text-brand-950 transition-colors hover:bg-[#b9e650] sm:w-auto"
            >
              Start free <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-xl border border-white/25 px-7 font-display text-[16px] font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: "/login" },
      { label: "Create account", to: "/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", to: "/privacy-policy" },
      { label: "Data deletion", to: "/data-deletion" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ink-muted">
            WhatsApp campaigns, shared inbox and AI replies for growing shops and businesses.
          </p>
        </div>
        {FOOTER_LINKS.map((group) => (
          <div key={group.title}>
            <p className="font-display text-[15px] font-semibold text-ink">{group.title}</p>
            <ul className="mt-4 space-y-2.5">
              {group.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className="text-[15px] text-ink-muted transition-colors hover:text-brand-800">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-[15px] text-ink-muted transition-colors hover:text-brand-800">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-[14px] text-ink-muted sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Wagenius. All rights reserved.</p>
          <p>WhatsApp is a trademark of Meta Platforms, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
