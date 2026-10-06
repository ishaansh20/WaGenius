import Reveal from "./Reveal";

function ConnectArt() {
  return (
    <svg viewBox="0 0 220 120" aria-hidden="true" className="h-full w-full">
      <rect x="20" y="22" width="70" height="76" rx="16" fill="#fff" stroke="#e6e8e3" />
      <circle cx="55" cy="54" r="16" fill="#25d366" />
      <path d="M48 54.5l5 5 9-10" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="36" y="78" width="38" height="6" rx="3" fill="#e6e8e3" />
      <rect x="130" y="22" width="70" height="76" rx="16" fill="#0b3b2e" />
      <path d="M152 50h26M152 62h18M152 74h22" stroke="#c8f169" strokeWidth="5" strokeLinecap="round" />
      <path d="M96 60h28" stroke="#128c5e" strokeWidth="3" strokeDasharray="5 5" strokeLinecap="round" />
      <circle cx="110" cy="60" r="7" fill="#c8f169" stroke="#0b3b2e" strokeWidth="2" />
    </svg>
  );
}

function ImportArt() {
  return (
    <svg viewBox="0 0 220 120" aria-hidden="true" className="h-full w-full">
      <rect x="30" y="18" width="110" height="84" rx="12" fill="#fff" stroke="#e6e8e3" />
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          <circle cx="50" cy={38 + row * 18} r="6" fill={["#ddf5e8", "#ffe4d6", "#e7efff", "#effbd2"][row]} />
          <rect x="62" y={35 + row * 18} width={[52, 40, 60, 46][row]} height="6" rx="3" fill="#e6e8e3" />
        </g>
      ))}
      <rect x="132" y="48" width="64" height="44" rx="12" fill="#128c5e" />
      <path d="M164 58v20M155 70l9 9 9-9" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="164" y="105" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f704d" fontFamily="Inter, sans-serif">
        contacts.csv
      </text>
    </svg>
  );
}

function SendArt() {
  return (
    <svg viewBox="0 0 220 120" aria-hidden="true" className="h-full w-full">
      <rect x="22" y="30" width="96" height="44" rx="14" fill="#d9fdd3" />
      <rect x="34" y="42" width="60" height="6" rx="3" fill="#0f704d" opacity=".55" />
      <rect x="34" y="54" width="42" height="6" rx="3" fill="#0f704d" opacity=".3" />
      <path d="M140 60l52-24-18 54-10-22z" fill="#0b3b2e" />
      <path d="M164 68l28-32" stroke="#c8f169" strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={40 + i * 26} cy={94} r="8" fill={["#ddf5e8", "#effbd2", "#e7efff"][i]} stroke="#fff" strokeWidth="3" />
      ))}
    </svg>
  );
}

const STEPS = [
  {
    title: "Connect your WhatsApp",
    body: "Sign up, pick a plan and link your WhatsApp Business number with Meta's secure pop-up. We guide you through every step.",
    art: <ConnectArt />,
  },
  {
    title: "Add your customers",
    body: "Upload your customer list from Excel or CSV, or let contacts come in automatically as people message you.",
    art: <ImportArt />,
  },
  {
    title: "Send & reply",
    body: "Launch your first offer, then handle replies from the shared inbox — with AI covering you after hours.",
    art: <SendArt />,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-brand-600">How it works</p>
          <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.02em] text-brand-950 sm:text-[44px]">
            Up and running in three steps
          </h2>
        </Reveal>

        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 0.08} className="relative rounded-3xl border border-line bg-canvas p-6 sm:p-7">
              <div className="h-[120px] rounded-2xl bg-surface p-2">{step.art}</div>
              <span className="mt-6 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent font-display text-[15px] font-semibold text-brand-950">
                {index + 1}
              </span>
              <h3 className="mt-3 text-[20px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-muted">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
