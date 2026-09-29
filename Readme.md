This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

### Configure Supabase

Copy `.env.example` to `.env.local` and replace the placeholders with the
Project URL and publishable (or legacy anon) key from **Supabase → Project
Settings → API**. Restart the development server after changing environment
variables. These public client credentials are not database passwords or
service-role secrets.

Without these values, public pages can still load, while authentication routes
return a configuration error instead of crashing the entire app.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Automated security rules

Run the credential-free safety tests with `npm test`. They cover protected-route and role decisions, password recovery input, Server Action authorization rules, profile and application ownership, application deadlines and duplicates, the application update privilege migration, and resume validation. The suite uses fixed fixtures and does not read `.env.local` or contact Supabase.

Live authentication, Server Action, database RLS/column-grant, profile provisioning, and Supabase Storage cross-account tests require a disposable Supabase project. Configure its URL and public key in an isolated test environment, seed dedicated test accounts (student A/B, coordinator, TPO, admin), and use test-only drives/applications/resume objects. Do not point destructive integration checks at production. Those live integration checks have not been implemented or run because no isolated test project is identified in this repository.
