import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../utils/cn";
import Reveal from "./Reveal";

const QUESTIONS = [
  {
    q: "What do I need to get started?",
    a: "A Meta (Facebook) Business account and a phone number to use for WhatsApp Business. After you sign up, Wagenius walks you through connecting it with Meta's official pop-up — no technical setup needed.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan lets you connect WhatsApp, manage up to 500 contacts and send campaigns. Upgrade to Pro or Enterprise any time for more contacts, team members, AI replies and advanced analytics.",
  },
  {
    q: "Who pays for the WhatsApp messages?",
    a: "Meta charges for template messages based on its published rates, billed to your WhatsApp Business account. Your Wagenius plan covers the software. You can see Meta's pricing inside the app before you send.",
  },
  {
    q: "Can my staff use it together?",
    a: "Yes. Add team members with roles — admin, campaign manager, team lead or support agent — so everyone sees only what they need. Chats can be assigned to a specific person.",
  },
  {
    q: "How does the AI reply work?",
    a: "On plans with AI, Wagenius can answer common customer questions automatically and flag a chat for a person when it can't help. You can switch AI on or off for each conversation.",
  },
  {
    q: "Why do my message templates need approval?",
    a: "WhatsApp requires businesses to get marketing and notification templates approved by Meta before sending them to customers. Wagenius submits them for you and shows the approval status.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-surface py-20 lg:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <Reveal>
          <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-brand-600">FAQ</p>
          <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.02em] text-brand-950 sm:text-[44px]">
            Questions, answered
          </h2>
          <p className="mt-4 text-[17px] text-ink-muted sm:text-[18px]">
            Still unsure? Create a free account and we'll guide you through setup, step by step.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <ul className="divide-y divide-line border-y border-line">
            {QUESTIONS.map((item, index) => {
              const isOpen = open === index;
              return (
                <li key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="font-display text-[17px] font-medium text-ink sm:text-[18px]">{item.q}</span>
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink transition-transform duration-200",
                        isOpen && "rotate-45 border-brand-900 bg-brand-900 text-white",
                      )}
                    >
                      <Plus size={16} />
                    </span>
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <p className="overflow-hidden pr-12 text-[16px] leading-relaxed text-ink-muted">
                      <span className="block pb-5">{item.a}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
