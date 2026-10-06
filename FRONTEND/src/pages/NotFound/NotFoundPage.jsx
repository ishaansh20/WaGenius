import { useNavigate, useLocation, Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { Button, Logo } from "../../components/ui";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-canvas px-4 py-6 sm:px-8">
      <header>
        <Link to="/" aria-label="Wagenius home">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-[480px] text-center">
          <p className="text-[15px] font-medium text-brand-700">Error 404</p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.025em] text-ink sm:text-[40px]">
            Page not found
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            We couldn't find{" "}
            <code className="break-all rounded-md bg-surface px-1.5 py-0.5 text-[14px] text-ink ring-1 ring-line">
              {location.pathname}
            </code>
            . It may have been moved, or the address may have a typo.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" leftIcon={Home} onClick={() => navigate("/")}>
              Go to home
            </Button>
            <Button size="lg" variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
              Go back
            </Button>
          </div>
        </div>
      </main>

      <footer className="text-center text-[13px] text-ink-muted">
        © {new Date().getFullYear()} Wagenius
      </footer>
    </div>
  );
}
