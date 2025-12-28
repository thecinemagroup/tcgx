# tcgx
TCGX is a real-money entertainment prediction market and outcomes exchange. The platform enables paid, skill-based prediction portfolios across film, television, awards, and box office, with a clear path toward regulated event derivatives.
#!/usr/bin/env bash
set -e

APP_DIR="tcgx-beta"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# -----------------------------
# package.json
# -----------------------------
cat > package.json <<'EOF'
{
  "name": "tcgx-beta",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "@supabase/ssr": "^0.6.0",
    "@supabase/supabase-js": "^2.49.0",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "stripe": "^17.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
EOF

# -----------------------------
# next + ts + tailwind basics
# -----------------------------
cat > next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};
module.exports = nextConfig;
EOF

cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF

cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: []
};
EOF

cat > postcss.config.js <<'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
EOF

cat > next-env.d.ts <<'EOF'
/// <reference types="next" />
/// <reference types="next/image-types/global" />
EOF

# -----------------------------
# .gitignore and env example
# -----------------------------
cat > .gitignore <<'EOF'
node_modules
.next
.DS_Store
.env
.env.local
.env.*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
EOF

cat > .env.example <<'EOF'
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://YOURPROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_PRICE_ID_OSCARS_ENTRY="price_..."

# App
APP_BASE_URL="http://localhost:3000"
ADMIN_EMAIL="you@yourdomain.com"
EOF

# -----------------------------
# folders
# -----------------------------
mkdir -p app/api/me
mkdir -p app/api/contests/[slug]
mkdir -p app/api/contests/[slug]/submit
mkdir -p app/api/stripe/create-checkout-session
mkdir -p app/api/stripe/webhook
mkdir -p app/contests/[slug]
mkdir -p app/account
mkdir -p app/admin
mkdir -p components
mkdir -p lib
mkdir -p prisma

# -----------------------------
# global styles
# -----------------------------
cat > app/globals.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --fg: #111;
  --bg: #fff;
  --muted: #6b7280;
  --border: #e5e7eb;
  --card: #fafafa;
  --btn: #111;
  --btnText: #fff;
}

html, body {
  padding: 0;
  margin: 0;
  color: var(--fg);
  background: var(--bg);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

a { color: inherit; }

button {
  background: var(--btn);
  color: var(--btnText);
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

input[type="radio"] {
  transform: scale(1.05);
}
EOF

# -----------------------------
# lib: stripe, supabase, scoring
# -----------------------------
cat > lib/stripe.ts <<'EOF'
import Stripe from "stripe";

export function stripeServer() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}
EOF

cat > lib/supabaseClient.ts <<'EOF'
import { createBrowserClient } from "@supabase/supabase-js";

export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createBrowserClient(url, key);
}
EOF

cat > lib/scoring.ts <<'EOF'
export function weightFromProbability(p: number): number {
  const clamped = Math.min(0.999, Math.max(0.001, p));
  return Math.log(1 / clamped);
}

export function computeEntryScore(rows: Array<{ correct: boolean; p: number }>): number {
  return rows.reduce((sum, r) => sum + (r.correct ? weightFromProbability(r.p) : 0), 0);
}
EOF

# -----------------------------
# components
# -----------------------------
cat > components/SignInButton.tsx <<'EOF'
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function SignInButton() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signIn() {
    const e = prompt("Enter your email to sign in:");
    if (!e) return;
    const { error } = await supabase.auth.signInWithOtp({ email: e });
    if (error) alert(error.message);
    else alert("Check your email for the sign-in link.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setEmail(null);
    location.href = "/";
  }

  if (email) return <button onClick={signOut}>Sign out</button>;
  return <button onClick={signIn}>Sign in</button>;
}
EOF

cat > components/Header.tsx <<'EOF'
"use client";

import Link from "next/link";
import SignInButton from "./SignInButton";

export default function Header() {
  return (
    <header style={{ borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontWeight: 800, textDecoration: "none", color: "inherit" }}>
          The Cinema Group Exchange (TCGX)
        </Link>
        <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/contests/oscars-2026">Oscars</Link>
          <Link href="/account">Account</Link>
          <Link href="/admin">Admin</Link>
          <SignInButton />
        </nav>
      </div>
    </header>
  );
}
EOF

# -----------------------------
# app layout + pages
# -----------------------------
cat > app/layout.tsx <<'EOF'
import "./globals.css";
import Header from "@/components/Header";

export const metadata = {
  title: "TCGX — The Cinema Group Exchange",
  description: "Entertainment outcome prediction contests"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
EOF

cat > app/page.tsx <<'EOF'
import Link from "next/link";

export default async function HomePage() {
  return (
    <div>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Bet on Entertainment</h1>
      <p style={{ maxWidth: 720, color: "var(--muted)", lineHeight: 1.5 }}>
        Real-money prediction contests across awards, box office, and industry outcomes.
        Enter a portfolio contest, submit a full ballot, and compete on a difficulty-weighted leaderboard.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 20 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--card)" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Active Contests</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>1</div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--card)" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Entries</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Beta</div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--card)" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Prize Pools</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Auto</div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <Link href="/contests/oscars-2026" style={{ fontWeight: 800 }}>
          View Oscars Contest
        </Link>
      </div>

      <div style={{ marginTop: 30, borderTop: "1px solid var(--border)", paddingTop: 18, maxWidth: 820 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>How it works</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          Pay an entry fee, submit a complete ballot, and compete on a difficulty-weighted leaderboard.
          This MVP is structured as a skill-based prediction contest with transparent scoring rules and admin-verified settlement.
        </p>
      </div>
    </div>
  );
}
EOF

cat > app/contests/[slug]/page.tsx <<'EOF'
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Contest = any;

export default function ContestPage({ params }: { params: { slug: string } }) {
  const [contest, setContest] = useState<Contest | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});

  const supabase = supabaseBrowser();

  useEffect(() => {
    fetch(`/api/contests/${params.slug}`)
      .then(r => r.json())
      .then(setContest);

    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  async function enterContest() {
    if (!userEmail) {
      alert("Sign in first.");
      return;
    }
    const r = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contestSlug: params.slug })
    });
    const data = await r.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Unable to create checkout session");
  }

  async function submitBallot() {
    const r = await fetch(`/api/contests/${params.slug}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ picks })
    });
    const data = await r.json();
    if (!r.ok) alert(data.error ?? "Submit failed");
    else alert("Submitted. (Admin will resolve winners later.)");
  }

  if (!contest) return <div>Loading…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>{contest.title}</h1>
      <p style={{ maxWidth: 760, color: "var(--muted)", lineHeight: 1.5 }}>{contest.description}</p>

      <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--card)" }}>
        <div style={{ fontWeight: 800 }}>
          Entry Fee: ${(contest.entryFeeCents / 100).toFixed(2)} {contest.currency.toUpperCase()}
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={enterContest}>Enter Contest</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
          You must be signed in and paid to submit a ballot. This MVP validates payment via Stripe webhook.
        </div>
      </div>

      <h2 style={{ marginTop: 22, fontSize: 18 }}>Categories</h2>

      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {contest.categories.map((c: any) => (
          <div key={c.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>{c.title}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {c.outcomes.map((o: any) => (
                <label key={o.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>
                    <input
                      type="radio"
                      name={c.id}
                      checked={picks[c.id] === o.id}
                      onChange={() => setPicks(prev => ({ ...prev, [c.id]: o.id }))}
                    />{" "}
                    {o.name}
                  </span>
                  <span style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "2px 10px", fontSize: 12 }}>
                    {(o.probability * 100).toFixed(1)}%
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={submitBallot}>Submit Ballot</button>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)", maxWidth: 820, lineHeight: 1.4 }}>
        Skill-based prediction contest MVP. Admin-verified settlement. Avoid sportsbook terminology in production UI and legal copy.
      </div>
    </div>
  );
}
EOF

cat > app/account/page.tsx <<'EOF'
export default function AccountPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Account</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
        This is a placeholder. Next build step: show the logged-in user’s entries and submitted ballots.
      </p>
    </div>
  );
}
EOF

cat > app/admin/page.tsx <<'EOF'
export default function AdminPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Admin</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
        This is a placeholder. Next build step: admin-only settlement UI to mark winners, compute scores, and publish leaderboard.
      </p>
    </div>
  );
}
EOF

# -----------------------------
# Prisma schema + seed
# -----------------------------
cat > prisma/schema.prisma <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id
  email         String   @unique
  displayName   String?
  createdAt     DateTime @default(now())
  entries       Entry[]
}

model Contest {
  id            String   @id @default(cuid())
  slug          String   @unique
  title         String
  season        String
  description   String?
  entryFeeCents Int
  currency      String   @default("usd")
  status        ContestStatus @default(OPEN)
  closesAt      DateTime?
  createdAt     DateTime @default(now())

  categories    Category[]
  entries       Entry[]
}

model Category {
  id        String   @id @default(cuid())
  contestId String
  contest   Contest  @relation(fields: [contestId], references: [id])
  slug      String
  title     String
  order     Int

  outcomes  Outcome[]

  @@unique([contestId, slug])
}

model Outcome {
  id          String   @id @default(cuid())
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  name        String
  probability Float
  isWinner    Boolean  @default(false)
}

model Entry {
  id              String   @id @default(cuid())
  contestId       String
  contest         Contest  @relation(fields: [contestId], references: [id])
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  status          EntryStatus @default(PENDING_PAYMENT)
  stripeSessionId String?  @unique
  paidAt          DateTime?
  submittedAt     DateTime?

  predictions     Prediction[]
  score           Float    @default(0)

  createdAt       DateTime @default(now())

  @@unique([contestId, userId])
}

model Prediction {
  id                 String  @id @default(cuid())
  entryId            String
  entry              Entry   @relation(fields: [entryId], references: [id])

  categoryId          String
  category            Category @relation(fields: [categoryId], references: [id])

  outcomeId           String
  outcome             Outcome  @relation(fields: [outcomeId], references: [id])

  probabilitySnapshot Float
}

enum ContestStatus {
  OPEN
  CLOSED
  RESOLVED
}

enum EntryStatus {
  PENDING_PAYMENT
  PAID
  SUBMITTED
}
EOF

cat > prisma/seed.ts <<'EOF'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertOutcome(categoryId: string, name: string, probability: number) {
  const existing = await prisma.outcome.findFirst({ where: { categoryId, name } });
  if (!existing) {
    await prisma.outcome.create({ data: { categoryId, name, probability } });
  } else {
    await prisma.outcome.update({ where: { id: existing.id }, data: { probability } });
  }
}

async function main() {
  const contest = await prisma.contest.upsert({
    where: { slug: "oscars-2026" },
    update: {
      title: "Oscar Predictions",
      season: "2026",
      description: "Submit a full ballot. Ranked by accuracy and difficulty-weighted scoring.",
      entryFeeCents: 2000,
      currency: "usd"
    },
    create: {
      slug: "oscars-2026",
      title: "Oscar Predictions",
      season: "2026",
      description: "Submit a full ballot. Ranked by accuracy and difficulty-weighted scoring.",
      entryFeeCents: 2000,
      currency: "usd",
      closesAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
    }
  });

  const categories = [
    {
      slug: "best-picture",
      title: "Best Picture",
      order: 1,
      outcomes: [
        { name: "Sinners", probability: 0.35 },
        { name: "Frankenstein", probability: 0.22 },
        { name: "Marty Supreme", probability: 0.15 },
        { name: "Hamnet", probability: 0.10 }
      ]
    },
    {
      slug: "best-director",
      title: "Best Director",
      order: 2,
      outcomes: [
        { name: "Guillermo del Toro", probability: 0.30 },
        { name: "Noah Baumbach", probability: 0.18 },
        { name: "Kogonada", probability: 0.12 }
      ]
    },
    {
      slug: "best-actor",
      title: "Best Actor",
      order: 3,
      outcomes: [
        { name: "Timothée Chalamet", probability: 0.28 },
        { name: "Oscar Isaac", probability: 0.20 },
        { name: "Wagner Moura", probability: 0.12 }
      ]
    }
  ];

  for (const c of categories) {
    const category = await prisma.category.upsert({
      where: { contestId_slug: { contestId: contest.id, slug: c.slug } },
      update: { title: c.title, order: c.order },
      create: {
        contestId: contest.id,
        slug: c.slug,
        title: c.title,
        order: c.order
      }
    });

    for (const o of c.outcomes) {
      await upsertOutcome(category.id, o.name, o.probability);
    }
  }

  console.log("Seed complete:", contest.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# -----------------------------
# API routes
# -----------------------------
cat > app/api/contests/[slug]/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const contest = await prisma.contest.findUnique({
    where: { slug: params.slug },
    include: { categories: { orderBy: { order: "asc" }, include: { outcomes: true } } }
  });

  if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contest);
}
EOF

cat > app/api/me/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anon, { cookies });
}

export async function GET() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  return NextResponse.json({ user: data.user ?? null });
}
EOF

cat > app/api/stripe/create-checkout-session/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { stripeServer } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anon, { cookies });
}

export async function POST(req: Request) {
  const { contestSlug } = await req.json();

  const contest = await prisma.contest.findUnique({ where: { slug: contestSlug } });
  if (!contest) return NextResponse.json({ error: "Contest not found" }, { status: 404 });

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email },
    create: { id: user.id, email: user.email }
  });

  await prisma.entry.upsert({
    where: { contestId_userId: { contestId: contest.id, userId: user.id } },
    update: {},
    create: { contestId: contest.id, userId: user.id }
  });

  const priceId = process.env.STRIPE_PRICE_ID_OSCARS_ENTRY;
  if (!priceId) return NextResponse.json({ error: "Missing STRIPE_PRICE_ID_OSCARS_ENTRY" }, { status: 500 });

  const stripe = stripeServer();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/contests/${contest.slug}?success=1`,
    cancel_url: `${baseUrl}/contests/${contest.slug}?canceled=1`,
    customer_email: user.email,
    metadata: { contestId: contest.id, userId: user.id }
  });

  await prisma.entry.update({
    where: { contestId_userId: { contestId: contest.id, userId: user.id } },
    data: { stripeSessionId: session.id }
  });

  return NextResponse.json({ url: session.url });
}
EOF

cat > app/api/stripe/webhook/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { stripeServer } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const stripe = stripeServer();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const body = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const contestId = session.metadata?.contestId;
    const userId = session.metadata?.userId;

    if (contestId && userId) {
      await prisma.entry.update({
        where: { contestId_userId: { contestId, userId } },
        data: { status: "PAID", paidAt: new Date() }
      });
    }
  }

  return NextResponse.json({ received: true });
}
EOF

cat > app/api/contests/[slug]/submit/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anon, { cookies });
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const contest = await prisma.contest.findUnique({
    where: { slug: params.slug },
    include: { categories: { include: { outcomes: true } } }
  });
  if (!contest) return NextResponse.json({ error: "Contest not found" }, { status: 404 });

  const entry = await prisma.entry.findUnique({
    where: { contestId_userId: { contestId: contest.id, userId: user.id } }
  });

  if (!entry || (entry.status !== "PAID" && entry.status !== "SUBMITTED")) {
    return NextResponse.json({ error: "Entry not paid" }, { status: 403 });
  }

  const { picks } = await req.json() as { picks: Record<string, string> };

  for (const c of contest.categories) {
    if (!picks[c.id]) return NextResponse.json({ error: `Missing pick for ${c.title}` }, { status: 400 });
  }

  await prisma.prediction.deleteMany({ where: { entryId: entry.id } });

  for (const c of contest.categories) {
    const outcomeId = picks[c.id];
    const outcome = c.outcomes.find(o => o.id === outcomeId);
    if (!outcome) return NextResponse.json({ error: `Invalid outcome for ${c.title}` }, { status: 400 });

    await prisma.prediction.create({
      data: {
        entryId: entry.id,
        categoryId: c.id,
        outcomeId: outcome.id,
        probabilitySnapshot: outcome.probability
      }
    });
  }

  await prisma.entry.update({
    where: { id: entry.id },
    data: { status: "SUBMITTED", submittedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
EOF

# -----------------------------
# README
# -----------------------------
cat > README.md <<'EOF'
# TCGX Beta

A real-money, skill-based entertainment prediction contest MVP.

## What’s included
- Landing page
- Oscars contest page with categories + probability pills
- Supabase Email OTP auth
- Stripe Checkout entry fee (test mode)
- Postgres persistence via Prisma
- Ballot submission gated behind payment verification via Stripe webhook

## Setup
1) Copy `.env.example` to `.env` and fill values
2) Install dependencies: `npm i`
3) Generate Prisma client: `npm run prisma:generate`
4) Push schema: `npm run db:push`
5) Seed contest: `npm run db:seed`
6) Run: `npm run dev`

## Next features to build
- Leaderboard page
- Admin settlement UI (mark winners)
- Score compute job after settlement
- Payout engine (Stripe Connect or manual)
EOF

echo ""
echo "Created project in ./$APP_DIR"
echo "Next: npm i && create .env && run prisma + seed + dev"
cp .env.example .env
npm i
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
stripe listen --forward-to localhost:3000/api/stripe/webhook
git init
git add -A
git commit -m "TCGX beta: contest entry + ballot submit"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/tcgx.git
git push -u origin main
