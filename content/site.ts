/**
 * All editable site content lives here.
 * Anything still in [brackets] is a placeholder to replace.
 */

export type AccentName = "lime" | "cyan" | "coral" | "purple";
export type ProjectCategory = "Web" | "FlutterFlow" | "Backend";

export const accents: Record<AccentName, string> = {
  lime: "#C6F432",
  cyan: "#5BE7FF",
  coral: "#FF8A5B",
  purple: "#B69CFF",
};

export const site = {
  name: "Leul Teferi Tadesse",
  firstName: "Leul",
  domain: "leul.dev",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://leul-portfolio-273.vercel.app",
  role: "Software Engineer",
  description:
    "Leul Teferi Tadesse is a fullstack software engineer in Addis Ababa building production web apps end to end with Node.js, TypeScript, PostgreSQL and Next.js, and shipping mobile apps fast with FlutterFlow.",
  email: "leulteferi273@gmail.com",
  location: "Addis Ababa, Ethiopia",
  cvUrl: "/cv.pdf",
  cvFileName: "Leul-Teferi-CV.pdf",
  available: true,
  availabilityLabel: "Open to new projects",
  year: 2026,
};

export const socials = [
  { label: "GitHub", href: "https://github.com/cooleo273" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/[your-handle]" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/[your-id]" },
];

export const nav = [
  { label: "Work", href: "#work" },
  { label: "Play", href: "#play" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export const hero = {
  nameLines: ["Leul", "Teferi", "Tadesse."],
  tagline:
    "Fullstack developer. I build web apps end to end, from database to UI, and ship mobile apps fast with FlutterFlow.",
  primaryCta: { label: "See my work", href: "#work" },
  secondaryCta: { label: "Play a game", href: "#play" },
  stickerMessages: ["web + mobile builder", "ships on fridays", "coffee > sleep", "hire me?"],
};

export const stack = [
  "TypeScript",
  "Node.js",
  "Next.js",
  "React",
  "NestJS",
  "Express",
  "PostgreSQL",
  "Prisma",
  "Supabase",
  "MongoDB",
  "FlutterFlow",
  "Tailwind CSS",
  "Stripe",
  "Chapa",
  "Meilisearch",
  "Vercel",
];

export type Project = {
  slug: string;
  title: string;
  category: ProjectCategory;
  color: string;
  description: string;
  tags: string[];
  liveUrl?: string;
  codeUrl?: string;
  caseStudy: {
    challenge: string;
    built: string[];
    architecture: string[];
    results: string[];
    /** Paths in /public, e.g. "/projects/my-app-1.png". Empty slots render as placeholders. */
    screenshots: { src?: string; alt: string }[];
  };
};

export const projects: Project[] = [
  {
    slug: "shega-insights",
    title: "Shega Insights",
    category: "Web",
    color: "#C6F432",
    description: "Market intelligence platform for Ethiopia's financial and startup ecosystem.",
    tags: ["Next.js", "TypeScript", "PostgreSQL", "Analytics"],
    // liveUrl: "https://...",
    caseStudy: {
      challenge:
        "Investors and decision-makers had no single place to find structured data on Ethiopia's financial and startup ecosystem. Insights were scattered across reports and spreadsheets.",
      built: [
        "Searchable datasets covering the financial and startup ecosystem",
        "Analytics tools for exploring and comparing the data",
        "A research report library for subscribers",
        "Alongside it at Shega: an in-house survey platform and an internal profitability dashboard",
      ],
      architecture: ["[Frontend: framework and rendering approach]", "[Data: database, search, ingestion]", "[Hosting and deployment]"],
      results: [
        "Survey platform: 40% faster analysis of customer feedback cycles",
        "Profitability dashboard: C-level forecast accuracy up more than 15%",
      ],
      screenshots: [{ alt: "[Dataset explorer]" }, { alt: "[Analytics view]" }, { alt: "[Report library]" }],
    },
  },
  {
    slug: "nexus-replay",
    title: "Nexus Replay",
    category: "Web",
    color: "#5BE7FF",
    description: "Backtesting platform for financial traders, built solo from the ground up.",
    tags: ["React", "TypeScript", "Node.js", "Charts"],
    caseStudy: {
      challenge: "Traders needed a reliable way to replay markets and test strategies against historical data before risking capital.",
      built: [
        "The full Nexus backtesting platform, from UI/UX design to backend engineering",
        "Market replay and strategy testing tools for traders",
        "Deployment and operations as the sole developer",
      ],
      architecture: ["[Frontend stack and charting library]", "[Backend services and market data storage]", "[Deployment]"],
      results: ["Lead developer and architect across every phase, 06/2024 to 10/2024", "[Add a usage or performance metric]"],
      screenshots: [{ alt: "[Replay chart]" }, { alt: "[Strategy results]" }, { alt: "[Trade journal]" }],
    },
  },
  {
    slug: "flutterflow-one",
    title: "[FlutterFlow App One]",
    category: "FlutterFlow",
    color: "#FF8A5B",
    description: "[One-line description of a mobile app shipped with FlutterFlow.]",
    tags: ["FlutterFlow", "Firebase", "Cloud Functions"],
    caseStudy: {
      challenge: "[The challenge.]",
      built: ["[Screens and flows]", "[Custom widgets or code actions]"],
      architecture: ["[FlutterFlow + Firebase Auth/Firestore]", "[Custom Dart actions for X]"],
      results: ["[Shipped in N weeks]", "[Store rating or downloads]"],
      screenshots: [{ alt: "[App screen]" }, { alt: "[App screen]" }, { alt: "[App screen]" }],
    },
  },
  {
    slug: "flutterflow-two",
    title: "[FlutterFlow App Two]",
    category: "FlutterFlow",
    color: "#B69CFF",
    description: "[One-line description of a second FlutterFlow app.]",
    tags: ["FlutterFlow", "Supabase", "REST API"],
    caseStudy: {
      challenge: "[The challenge.]",
      built: ["[What you built]", "[What you built]"],
      architecture: ["[Architecture note]", "[Architecture note]"],
      results: ["[Result]", "[Result]"],
      screenshots: [{ alt: "[App screen]" }, { alt: "[App screen]" }, { alt: "[App screen]" }],
    },
  },
  {
    slug: "skillbridge",
    title: "SkillBridge",
    category: "Backend",
    color: "#FFD84B",
    description: "Freelance marketplace with escrow payments, multi-currency wallets and a double-entry ledger.",
    tags: ["Node.js", "Express", "TypeScript", "PostgreSQL", "Prisma", "Stripe", "Chapa"],
    caseStudy: {
      challenge:
        "Connecting clients with remote tech talent means holding money safely between two parties, across currencies, with payouts that work both in Ethiopia and globally.",
      built: [
        "Escrow-based payments with automated release workflows",
        "Multi-currency wallets (USD, ETB) with automated payouts",
        "Chapa mobile wallet withdrawals alongside global payouts via Stripe",
        "Dispute handling and a reputation system",
      ],
      architecture: [
        "Node.js + Express + TypeScript services",
        "PostgreSQL via Prisma ORM",
        "Double-entry ledger for tracking and reconciliation",
      ],
      results: ["Solo project, 11/2025 to 01/2026", "[Add a usage or reliability metric]"],
      screenshots: [{ alt: "[Ledger diagram]" }, { alt: "[Wallet view]" }, { alt: "[Escrow flow]" }],
    },
  },
  {
    slug: "ewket-ai",
    title: "Ewket AI Study Buddy",
    category: "Backend",
    color: "#C6F432",
    description: "AI tutoring platform with streaming responses from Groq and Gemini models.",
    tags: ["NestJS", "Prisma", "React", "Vite", "JWT"],
    caseStudy: {
      challenge: "Make 24/7 AI tutoring reliable and affordable for students, without locking into a single model provider.",
      built: [
        "Model proxy for Groq and Gemini with real-time streaming responses",
        "JSON sanitization so model output stays reliable",
        "JWT auth, chat session management and automated email notifications",
      ],
      architecture: ["Modular NestJS backend with Prisma ORM", "React + Vite frontend", "Provider-agnostic AI proxy layer"],
      results: ["Solo project, summer 2024", "[Add a usage metric]"],
      screenshots: [{ alt: "[Chat view]" }, { alt: "[Session history]" }],
    },
  },
];

export const projectFilters = ["All", "Web", "FlutterFlow", "Backend"] as const;

export const about = {
  cards: [
    {
      title: "Fullstack, built to scale",
      body: "I design the database, build the API and ship the interface. Lately that has meant escrow payments, multi-currency ledgers, market data platforms and AI integrations.",
      points: ["Node.js, NestJS, Express", "PostgreSQL, Prisma, Supabase", "Payments: Stripe, Chapa"],
    },
    {
      title: "FlutterFlow, shipped fast",
      body: "[When speed to market matters, I use FlutterFlow to ship native iOS and Android apps in weeks, extended with custom code where the visual builder stops.]",
      points: ["iOS + Android from one build", "Firebase or Supabase backends", "Custom widgets and actions"],
    },
  ],
  bio: "I'm Leul, a software engineer in Addis Ababa with a background in Electrical Engineering. I build full-stack products end to end: backend services, third-party integrations and the interfaces people actually use. I have shipped market intelligence platforms, payment systems and internal tools that save teams real hours, and I like owning a product from first schema to production.",
  stats: [
    { label: "years shipping software", value: 3, suffix: "+" },
    { label: "products shipped", value: 8, suffix: "" },
    { label: "technologies", value: 20, suffix: "+" },
  ],
  timeline: [
    {
      period: "11/2024 - now",
      role: "Software Developer",
      org: "Shega Media and Technologies",
      note: "Built Shega Insights, an in-house survey platform (40% faster feedback analysis), a profitability dashboard (15%+ better forecasts) and HR automation saving about 10 hours a week.",
    },
    {
      period: "06/2024 - 10/2024",
      role: "Lead Developer & Architect",
      org: "Nexus Replay",
      note: "Designed, built and deployed the Nexus backtesting platform for traders on my own, from UI/UX to backend.",
    },
    {
      period: "12/2023 - 02/2024",
      role: "Software Developer",
      org: "Schimerol",
      note: "Led the full lifecycle of the company's primary product: database schema, core API and a highly available backend.",
    },
    {
      period: "2020 - 2023",
      role: "B.Sc. Electrical Engineering",
      org: "Hawassa University",
      note: "Transferred from Mekelle University, where I studied from 2018 to 2020.",
    },
  ],
};

/**
 * The 3D "under the hood" diagram. Node ids are positioned in components/three/layout.ts;
 * edit the text here. Each step highlights the edges it lists ("from>to").
 */
export const system = {
  intro:
    "The payments flow behind SkillBridge, rebuilt in 3D: escrow, a double-entry ledger and payouts in two currencies. Drag to orbit, or pick a step.",
  nodes: {
    web: { label: "Web client", detail: "The marketplace where clients hire remote tech talent and freelancers manage their wallets." },
    api: { label: "API", detail: "Node.js + Express + TypeScript. Validates every request and routes it to the right service." },
    auth: { label: "Auth", detail: "Authenticates and authorizes every call that touches a wallet." },
    escrow: { label: "Escrow", detail: "Holds client funds until work is approved, then releases them automatically." },
    disputes: { label: "Disputes", detail: "Dispute handling and reputation, tied into the escrow release workflow." },
    ledger: { label: "Ledger", detail: "Double-entry: every movement writes a balanced debit and credit, so balances always reconcile." },
    db: { label: "PostgreSQL", detail: "Source of truth, accessed through Prisma ORM." },
    stripe: { label: "Stripe", detail: "Global payouts." },
    chapa: { label: "Chapa", detail: "Ethiopian mobile wallet withdrawals. Wallets hold both USD and ETB." },
  },
  steps: [
    { title: "Client sends a request", edges: ["web>api"] },
    { title: "Request authenticated", edges: ["api>auth", "auth>db"] },
    { title: "Funds held in escrow", edges: ["api>escrow", "disputes>escrow"] },
    { title: "Ledger records both sides", edges: ["escrow>ledger", "ledger>db"] },
    { title: "Payout via Stripe or Chapa", edges: ["escrow>stripe", "escrow>chapa"] },
  ],
};

export const contact = {
  heading: "Let's build something good.",
  blurb: "Have a project in mind, or need a developer who can own it end to end? Send a note and I'll get back to you quickly.",
};

/** Terminal commands. Each entry prints these lines; special commands are handled in components/terminal. */
export const terminal = {
  welcome: ["welcome to leul.dev v2026.1", "type 'help' to see available commands."],
  chips: ["help", "whoami", "projects", "stack", "contact", "play"],
  commands: {
    help: [
      "available commands:",
      "  help            show this list",
      "  whoami          who is this guy",
      "  projects        selected work",
      "  stack           tools I use",
      "  contact         how to reach me",
      "  play            launch Production Defense",
      "  theme <color>   lime | cyan | coral | purple",
      "  clear           clear the screen",
    ],
    whoami: [
      "Leul Teferi Tadesse",
      "software engineer, fullstack. B.Sc. electrical engineering.",
      "currently building at Shega Media and Technologies.",
      "based in Addis Ababa, working worldwide.",
    ],
    contact: ["email     leulteferi273@gmail.com", "github    github.com/cooleo273", "cv        /cv.pdf"],
    hire: [
      "[sudo] password for visitor: ********",
      "permission granted.",
      "initiating hire sequence...",
      "great choice. scroll down to contact, I reply fast.",
    ],
  } as Record<string, string[]>,
};
