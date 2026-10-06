import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "../../utils/cn";
import Logo from "../ui/Logo";
import useActiveSession from "../../hooks/useActiveSession";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Signed-in visitors get a link into their app instead of an auto-redirect.
  const session = useActiveSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-200",
        scrolled || menuOpen ? "border-b border-line bg-surface/90 backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="Wagenius home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-[15px] font-medium text-ink-muted transition-colors hover:text-brand-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <Link
              to={session.path}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-5 py-2.5 font-display text-[15px] font-medium text-white transition-colors hover:bg-brand-800"
            >
              {session.label} <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-2.5 font-display text-[15px] font-medium text-ink transition-colors hover:bg-brand-50"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-xl bg-brand-900 px-5 py-2.5 font-display text-[15px] font-medium text-white transition-colors hover:bg-brand-800"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-surface px-4 pb-5 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-[15px] font-medium text-ink"
            >
              {link.label}
            </a>
          ))}
          {session ? (
            <Link
              to={session.path}
              className="mt-3 block rounded-xl bg-brand-900 py-3 text-center font-display font-medium text-white"
            >
              {session.label}
            </Link>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                className="rounded-xl border border-line-strong py-3 text-center font-display font-medium text-ink"
              >
                Log in
              </Link>
              <Link to="/signup" className="rounded-xl bg-brand-900 py-3 text-center font-display font-medium text-white">
                Start free
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
