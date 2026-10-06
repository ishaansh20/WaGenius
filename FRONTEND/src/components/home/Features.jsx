import {
  BarChart3,
  Bot,
  CalendarClock,
  Check,
  FileCheck2,
  FolderInput,
  LockKeyhole,
  MessagesSquare,
  ShieldCheck,
  UserCog,
  UsersRound,
} from "lucide-react";
import Reveal from "./Reveal";
import { CampaignMock, InboxMock, PhoneMock, TemplateMessage } from "./ProductMockups";

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "Official WhatsApp Cloud API" },
  { icon: FileCheck2, label: "Meta-approved message templates" },
  { icon: LockKeyhole, label: "Encrypted account credentials" },
  { icon: UserCog, label: "Team roles & permissions" },
];

export function TrustStrip() {
  return (
    <section className="border-y border-line bg-surface">
      <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-5 px-4 py-7 sm:px-6 md:grid-cols-4">
        {TRUST_POINTS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3 text-[15px] font-medium text-ink">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon size={18} />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

const SPOTLIGHTS = [
  {
    eyebrow: "Shared inbox",
    title: "Every customer message, one tidy inbox",
    body: "Your whole team replies from the same WhatsApp number. Assign chats, tag customers, and see who's handling what — no more lost messages on one person's phone.",
    points: ["Assign chats to staff", "Filter by Mine, Unassigned or AI", "Customer details beside the chat"],
    visual: <InboxMock />,
  },
  {
    eyebrow: "Campaigns",
    title: "Send an offer to thousands in a few clicks",
    body: "Upload a CSV or pick a contact group, choose an approved template, and send now or schedule it. Watch it get delivered and read, live.",
    points: ["CSV upload or saved groups", "Schedule for the right time", "Delivery & read tracking"],
    visual: (
      <div className="relative mx-auto max-w-[460px] py-6">
        <CampaignMock />
        <div className="absolute -bottom-4 -right-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-pop)] sm:-right-8">
          <p className="text-[11px] text-ink-muted">Read rate</p>
          <p className="font-display text-[22px] font-semibold text-brand-700">78%</p>
        </div>
      </div>
    ),
  },
  {
    eyebrow: "Templates",
    title: "Beautiful messages that Meta approves",
    body: "Create rich messages with images and buttons, preview exactly how they'll look on a phone, and submit for approval without leaving Wagenius. AI can draft one for you.",
    points: ["Live phone preview", "Images, buttons & variables", "AI-written drafts"],
    visual: (
      <div className="flex justify-center py-4">
        <PhoneMock className="w-[260px]">
          <TemplateMessage />
        </PhoneMock>
      </div>
    ),
  },
];

const MORE_FEATURES = [
  {
    icon: Bot,
    title: "AI replies when you're busy",
    body: "Answers common questions instantly and hands over to a person when it needs to.",
  },
  {
    icon: UsersRound,
    title: "Contacts & groups",
    body: "Import your customer list once, then build groups like “Wholesale” or “Diwali buyers”.",
  },
  {
    icon: BarChart3,
    title: "Clear analytics",
    body: "See sent, delivered, read and failed for every campaign — and what it cost.",
  },
  {
    icon: CalendarClock,
    title: "Scheduled sending",
    body: "Plan festival and weekend offers ahead of time and let them go out automatically.",
  },
  {
    icon: FolderInput,
    title: "Import & export",
    body: "Bring contacts in from a spreadsheet and export reports whenever you need them.",
  },
  {
    icon: MessagesSquare,
    title: "Built for teams",
    body: "Admin, campaign manager, team lead and support agent roles — everyone sees just what they need.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-brand-600">Everything in one place</p>
          <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.02em] text-brand-950 sm:text-[44px]">
            The WhatsApp toolkit your shop has been missing
          </h2>
        </Reveal>

        <div className="mt-16 space-y-20 lg:mt-20 lg:space-y-28">
          {SPOTLIGHTS.map((feature, index) => (
            <div key={feature.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-brand-600">{feature.eyebrow}</p>
                <h3 className="mt-3 text-[28px] font-semibold tracking-[-0.015em] text-ink sm:text-[34px]">
                  {feature.title}
                </h3>
                <p className="mt-4 text-[17px] leading-relaxed text-ink-muted sm:text-[18px]">{feature.body}</p>
                <ul className="mt-6 space-y-3">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-[16px] font-medium text-ink">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        <Check size={14} strokeWidth={2.5} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.1} className={index % 2 === 1 ? "lg:order-1" : undefined}>
                <div className="rounded-[28px] bg-gradient-to-br from-brand-50 to-[#f4f9ec] p-4 sm:p-8">{feature.visual}</div>
              </Reveal>
            </div>
          ))}
        </div>

        <div className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_FEATURES.map(({ icon: Icon, title, body }, index) => (
            <Reveal
              key={title}
              delay={(index % 3) * 0.06}
              className="rounded-2xl border border-line bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-pop)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-900 text-accent">
                <Icon size={20} />
              </span>
              <h3 className="mt-5 text-[19px] font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-muted">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
