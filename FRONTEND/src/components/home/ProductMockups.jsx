import {
  BarChart3,
  Bot,
  CheckCheck,
  Megaphone,
  MessageSquareText,
  Search,
  Send,
  Users,
} from "lucide-react";
import { cn } from "../../utils/cn";

/*
 * Illustrative product mockups built from markup (no screenshots yet).
 * All names and numbers are sample data, marked aria-hidden as decoration.
 */

function Avatar({ name, tone = "bg-brand-100 text-brand-800", size = "h-9 w-9 text-[13px]" }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-semibold", tone, size)}>
      {name.charAt(0)}
    </span>
  );
}

const CONVERSATIONS = [
  { name: "Ananya Gupta", text: "Is the kaju katli box available?", time: "2m", unread: 2, tone: "bg-[#ffe4d6] text-[#9a3b12]" },
  { name: "Rohit Verma", text: "Thanks! Order received 🙏", time: "9m", tone: "bg-brand-100 text-brand-800", active: true },
  { name: "Meera Iyer", text: "Can you deliver by Friday?", time: "21m", unread: 1, tone: "bg-[#e7efff] text-[#1d5fd1]" },
  { name: "Karan Shah", text: "AI: Our store opens at 10 AM", time: "1h", ai: true, tone: "bg-accent-soft text-brand-900" },
];

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
  return (
    <BrowserFrame className={className}>
      <div aria-hidden="true" className="flex h-[340px] text-left sm:h-[380px]">
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
                className={cn("flex items-center gap-2.5 px-3 py-2.5", chat.active && "bg-brand-50")}
              >
                <Avatar name={chat.name} tone={chat.tone} size="h-8 w-8 text-[12px]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[12px] font-semibold text-ink">{chat.name}</p>
                    <span className="text-[10px] text-ink-subtle">{chat.time}</span>
                  </div>
                  <p className="flex items-center gap-1 truncate text-[11px] text-ink-muted">
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
            <Avatar name="Rohit Verma" size="h-7 w-7 text-[11px]" />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink">Rohit Verma</p>
              <p className="text-[10px] text-brand-600">Assigned to you</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-2 p-3 text-[11px]">
            <p className="max-w-[80%] rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-ink shadow-sm">
              Hi! Do you have the Diwali gift hamper?
            </p>
            <p className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 text-ink shadow-sm">
              Yes! ₹1,499 with free delivery in the city 🎁
              <span className="mt-0.5 flex justify-end text-[#53bdeb]">
                <CheckCheck size={12} />
              </span>
            </p>
            <p className="max-w-[80%] rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-ink shadow-sm">
              Perfect, please book one.
            </p>
            <p className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 text-ink shadow-sm">
              Thanks! Order received 🙏
            </p>
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
  return (
    <div className="rounded-xl rounded-tl-sm bg-white p-1.5 shadow-sm">
      <div className="flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffd36e] via-[#ff9f6e] to-[#f2547d]">
        <span className="font-display text-lg font-semibold text-white drop-shadow">Festive Sale</span>
      </div>
      <div className="px-1.5 pb-1 pt-2 text-ink">
        <p className="font-semibold">Hi Ananya 👋</p>
        <p className="mt-1 leading-snug text-ink-muted">
          Our festive collection is here — flat 20% off on all gift boxes till Sunday.
        </p>
        <p className="mt-1 text-right text-[9px] text-ink-subtle">10:24 AM</p>
      </div>
      <div className="grid grid-cols-2 gap-1 border-t border-line pt-1 text-center text-[11px] font-medium text-[#0a8fd8]">
        <span className="py-1">Shop now</span>
        <span className="py-1">Call us</span>
      </div>
    </div>
  );
}

export function CampaignMock({ className }) {
  const bars = [38, 52, 46, 70, 64, 82, 76];
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-2xl border border-line bg-surface p-5 text-left shadow-[var(--shadow-pop)]", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">Campaign</p>
          <p className="mt-1 font-display text-[16px] font-semibold text-ink">Festive Sale — Week 1</p>
        </div>
        <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-medium text-success">Completed</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["Sent", "2,480"],
          ["Delivered", "2,431"],
          ["Read", "1,906"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-canvas p-2.5">
            <p className="text-[10px] text-ink-muted">{label}</p>
            <p className="font-display text-[17px] font-semibold text-ink tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-20 items-end gap-1.5">
        {bars.map((height, index) => (
          <span
            key={index}
            className={cn("flex-1 rounded-t-md", index === bars.length - 2 ? "bg-brand-600" : "bg-brand-100")}
            style={{ height: `${height}%` }}
          />
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
        "flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left shadow-[var(--shadow-pop)]",
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
