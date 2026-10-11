import { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  Check,
  CheckCheck,
  Megaphone,
  MessageSquareText,
  Search,
  Send,
  Users,
} from "lucide-react";
import { cn } from "../../utils/cn";
import useInView from "../../hooks/useInView";

/*
 * Product illustrations built from markup. They show a typical conversation
 * and a campaign delivering, driven by timelines rather than fixed numbers:
 * every count you see is derived from what is on screen.
 */

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Avatar({ name, tone = "bg-brand-100 text-brand-800", size = "h-9 w-9 text-[13px]" }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-semibold", tone, size)}>
      {name.charAt(0)}
    </span>
  );
}

const CONVERSATIONS = [
  { name: "Ananya Gupta", text: "Do you deliver on Sundays?", time: "now", unread: 1, tone: "bg-[#ffe4d6] text-[#9a3b12]", active: true },
  { name: "Rohit Verma", text: "Thanks! Order received", time: "9m", tone: "bg-brand-100 text-brand-800" },
  { name: "Meera Iyer", text: "Can you deliver by Friday?", time: "21m", unread: 1, tone: "bg-[#e7efff] text-[#1d5fd1]" },
  { name: "Karan Shah", text: "We open at 10 AM, see you!", time: "1h", ai: true, tone: "bg-accent-soft text-brand-900" },
];

// Message ticks: sent (one grey) → delivered (two grey) → read (two blue).
function MiniTicks({ status }) {
  if (status === "sent") return <Check size={12} className="text-[#98a2a8] transition-colors duration-500" />;
  return (
    <CheckCheck
      size={12}
      className={cn("transition-colors duration-500", status === "read" ? "text-[#34b7f1]" : "text-[#98a2a8]")}
    />
  );
}

/**
 * A short customer conversation that plays when scrolled into view:
 * question → typing dots → AI reply (ticks turn blue) → booking → human confirms.
 */
function useConversation(active) {
  const [state, setState] = useState({ shown: 4, typing: false, s2: "read", s4: "read" });

  useEffect(() => {
    if (!active) return undefined;
    if (reducedMotion()) {
      setState({ shown: 4, typing: false, s2: "read", s4: "read" });
      return undefined;
    }
    let timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const run = () => {
      setState({ shown: 0, typing: false, s2: "sent", s4: "sent" });
      at(300, () => setState((s) => ({ ...s, shown: 1 })));
      at(1100, () => setState((s) => ({ ...s, typing: true })));
      at(2400, () => setState((s) => ({ ...s, typing: false, shown: 2, s2: "sent" })));
      at(2900, () => setState((s) => ({ ...s, s2: "delivered" })));
      at(3600, () => setState((s) => ({ ...s, s2: "read" })));
      at(4600, () => setState((s) => ({ ...s, shown: 3 })));
      at(5400, () => setState((s) => ({ ...s, typing: true })));
      at(6500, () => setState((s) => ({ ...s, typing: false, shown: 4, s4: "sent" })));
      at(7000, () => setState((s) => ({ ...s, s4: "delivered" })));
      at(7700, () => setState((s) => ({ ...s, s4: "read" })));
      at(13000, run);
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return state;
}

export function BrowserFrame({ className, children }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-20px_rgba(11,59,46,0.35)]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-line bg-[#f6f7f3] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6159]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c941]" />
        <span className="ml-3 h-5 flex-1 rounded-md bg-white/80" />
      </div>
      {children}
    </div>
  );
}

export function InboxMock({ className }) {
  const [ref, inView] = useInView({ threshold: 0.3 });
  const { shown, typing, s2, s4 } = useConversation(inView);

  return (
    <BrowserFrame className={className}>
      <div ref={ref} aria-hidden="true" className="flex h-[340px] text-left sm:h-[380px]">
        <div className="hidden w-14 shrink-0 flex-col items-center gap-3 bg-brand-900 py-4 sm:flex">
          <span className="h-7 w-7 rounded-lg bg-white/15" />
          {[BarChart3, MessageSquareText, Users, Megaphone].map((Icon, index) => (
            <span
              key={index}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                index === 1 ? "bg-white/15 text-accent" : "text-white/50",
              )}
            >
              <Icon size={15} />
            </span>
          ))}
        </div>

        <div className="w-[46%] shrink-0 border-r border-line sm:w-[40%]">
          <div className="p-3">
            <div className="flex h-8 items-center gap-2 rounded-lg bg-canvas px-2.5 text-[11px] text-ink-subtle">
              <Search size={12} /> Search chats
            </div>
            <div className="mt-2.5 flex gap-1.5 text-[10px] font-medium">
              <span className="rounded-full bg-brand-900 px-2 py-0.5 text-white">All</span>
              <span className="rounded-full bg-canvas px-2 py-0.5 text-ink-muted">Mine</span>
              <span className="rounded-full bg-canvas px-2 py-0.5 text-ink-muted">AI</span>
            </div>
          </div>
          <ul>
            {CONVERSATIONS.map((chat) => (
              <li
                key={chat.name}
                className={cn("flex items-center gap-2.5 px-3 py-2.5 transition-colors", chat.active && "bg-brand-50")}
              >
                <Avatar name={chat.name} tone={chat.tone} size="h-8 w-8 text-[12px]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[12px] font-semibold text-ink">{chat.name}</p>
                    <span className="text-[10px] text-ink-subtle">{chat.time}</span>
                  </div>
                  <p
                    className={cn(
                      "flex items-center gap-1 truncate text-[11px] text-ink-muted",
                      chat.ai && "ai-shimmer rounded",
                    )}
                  >
                    {chat.ai && <Bot size={11} className="shrink-0 text-brand-600" />}
                    <span className="truncate">{chat.text}</span>
                  </p>
                </div>
                {chat.unread && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
                    {chat.unread}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-[#f3f1ea]">
          <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
            <Avatar name="Ananya Gupta" tone="bg-[#ffe4d6] text-[#9a3b12]" size="h-7 w-7 text-[11px]" />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink">Ananya Gupta</p>
              <p className="text-[10px] text-brand-600">{typing ? "AI is typing…" : "Online"}</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-2 p-3 text-[11px]">
            {shown >= 1 && (
              <p className="pop-in max-w-[80%] rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-ink shadow-sm">
                Do you deliver on Sundays?
              </p>
            )}
            {shown >= 2 && (
              <p className="pop-in ml-auto max-w-[82%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 text-ink shadow-sm">
                <span className="mb-0.5 flex items-center gap-1 text-[9.5px] font-semibold text-brand-700">
                  <Bot size={10} /> AI reply
                </span>
                Yes, free delivery in the city. Want me to book it?
                <span className="mt-0.5 flex justify-end">
                  <MiniTicks status={s2} />
                </span>
              </p>
            )}
            {shown >= 3 && (
              <p className="pop-in max-w-[80%] rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-ink shadow-sm">
                Yes please, for 11 AM.
              </p>
            )}
            {shown >= 4 && (
              <p className="pop-in ml-auto max-w-[82%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 text-ink shadow-sm">
                <span className="mb-0.5 block text-[9.5px] font-semibold text-ink-muted">Priya · your team</span>
                Done. Booked for Sunday, 11 AM.
                <span className="mt-0.5 flex justify-end">
                  <MiniTicks status={s4} />
                </span>
              </p>
            )}
            {typing && (
              <span className="pop-in w-fit rounded-xl bg-white px-3 py-2 shadow-sm">
                <span className="typing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-line bg-surface p-2.5">
            <span className="h-7 flex-1 rounded-lg bg-canvas" />
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Send size={12} />
            </span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function PhoneMock({ className, children, title = "Sharma Sweets", subtitle = "Business account" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-[230px] rounded-[34px] border-[6px] border-[#16201c] bg-[#16201c] shadow-[0_30px_70px_-15px_rgba(11,59,46,0.45)]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[28px] bg-[#efeae2] text-left">
        <div className="flex items-center gap-2 bg-[#075e54] px-3 pb-2.5 pt-5 text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold">
            {title.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold">{title}</p>
            <p className="text-[9.5px] text-white/70">{subtitle}</p>
          </div>
        </div>
        <div className="space-y-2 p-2.5 text-[11px]">{children}</div>
      </div>
    </div>
  );
}

export function TemplateMessage() {
  const [ref, inView] = useInView({ threshold: 0.4 });
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl rounded-tl-sm bg-white p-1.5 shadow-sm transition-all duration-700",
        inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <div className="flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffd36e] via-[#ff9f6e] to-[#f2547d]">
        <span className="font-display text-lg font-semibold text-white drop-shadow">Festive Sale</span>
      </div>
      <div className="px-1.5 pb-1 pt-2 text-ink">
        <p className="font-semibold">Hi Ananya 👋</p>
        <p className="mt-1 leading-snug text-ink-muted">
          Our festive collection is here — flat 20% off on all gift boxes till Sunday.
        </p>
        <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-ink-subtle">
          10:24 AM <MiniTicks status={inView ? "read" : "sent"} />
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1 border-t border-line pt-1 text-center text-[11px] font-medium text-[#0a8fd8]">
        <span className="py-1">Shop now</span>
        <span className="py-1">Call us</span>
      </div>
    </div>
  );
}

const CROWD = 24;
// Positions on an ellipse around the sender badge.
const CROWD_POINTS = Array.from({ length: CROWD }, (_, i) => {
  const angle = (i / CROWD) * Math.PI * 2 - Math.PI / 2;
  const ring = i % 2 === 0 ? 1 : 0.8;
  return { x: Math.cos(angle) * 128 * ring, y: Math.sin(angle) * 84 * ring };
});

/**
 * One offer going out to a crowd: ripples leave the sender, each customer
 * lights up green when delivered and blue when read. The counters below are
 * counted from the dots themselves, so they always match what you see.
 */
export function CampaignMock({ className }) {
  const [ref, inView] = useInView({ threshold: 0.35 });
  const [levels, setLevels] = useState(() => Array(CROWD).fill(reducedMotion() ? 2 : 0));

  useEffect(() => {
    if (!inView) return undefined;
    if (reducedMotion()) {
      setLevels(Array(CROWD).fill(2));
      return undefined;
    }
    let timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const run = () => {
      setLevels(Array(CROWD).fill(0));
      for (let i = 0; i < CROWD; i += 1) {
        at(500 + i * 110, () => setLevels((l) => l.map((v, k) => (k === i ? 1 : v))));
        at(3600 + i * 95, () => setLevels((l) => l.map((v, k) => (k === i ? 2 : v))));
      }
      at(9500, run);
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  const delivered = levels.filter((v) => v >= 1).length;
  const read = levels.filter((v) => v >= 2).length;
  const done = read === CROWD;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("rounded-2xl border border-line bg-surface p-5 text-left shadow-[var(--shadow-pop)]", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">Example campaign</p>
          <p className="mt-1 font-display text-[16px] font-semibold text-ink">Festive offer to your customers</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors duration-500",
            done ? "bg-success-soft text-success" : "bg-info-soft text-info",
          )}
        >
          {done ? "Completed" : "Sending"}
        </span>
      </div>

      <div className="relative mx-auto mt-3 h-[230px] w-full max-w-[400px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500"
            style={{ animation: inView ? `w-ripple 3.2s ${i * 1.05}s infinite ease-out` : "none", opacity: 0 }}
          />
        ))}
        <span className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-brand-900 text-accent shadow-lg">
          <Megaphone size={22} />
        </span>
        {CROWD_POINTS.map((point, i) => (
          <span
            key={i}
            className={cn(
              "absolute h-[22px] w-[22px] rounded-full border-2 border-white transition-all duration-500",
              levels[i] === 0 && "scale-90 bg-[#dfe4e1]",
              levels[i] === 1 && "scale-100 bg-brand-500",
              levels[i] === 2 && "scale-110 bg-[#34b7f1]",
            )}
            style={{ left: `calc(50% + ${point.x}px - 11px)`, top: `calc(50% + ${point.y}px - 11px)` }}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Sent", value: CROWD, icon: <Check size={13} className="text-[#98a2a8]" />, bar: "bg-[#98a2a8]" },
          { label: "Delivered", value: delivered, icon: <CheckCheck size={13} className="text-[#98a2a8]" />, bar: "bg-brand-500" },
          { label: "Read", value: read, icon: <CheckCheck size={13} className="text-[#34b7f1]" />, bar: "bg-[#34b7f1]" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-canvas p-2.5">
            <p className="flex items-center justify-center gap-1 text-[11px] text-ink-muted">
              {stat.icon} {stat.label}
            </p>
            <p className="font-display text-[18px] font-semibold text-ink tabular-nums">
              {stat.value}
              <span className="text-[12px] font-medium text-ink-subtle"> / {CROWD}</span>
            </p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#e6e9e7]">
              <div
                className={cn("h-full rounded-full transition-all duration-500", stat.bar)}
                style={{ width: `${(stat.value / CROWD) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiReplyChip({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "ai-shimmer flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left shadow-[var(--shadow-pop)]",
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-brand-950">
        <Bot size={16} />
      </span>
      <div>
        <p className="text-[12px] font-semibold text-ink">AI replied instantly</p>
        <p className="text-[11px] text-ink-muted">“We open at 10 AM, see you!”</p>
      </div>
    </div>
  );
}
