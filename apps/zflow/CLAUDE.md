# ZFlow Web

Next.js 15 web application — the primary user interface for ZephyrOS.

## Tech Stack
- Next.js 15 (App Router)
- React 19 (Server Components by default)
- Tailwind CSS for styling
- TipTap for rich text editing
- SWR for client-side data fetching
- Framer Motion for animations
- Recharts for data visualization
- Lucide React for icons

## Conventions
- **Server Components by default** — only add `'use client'` when state/effects are needed
- **Tailwind CSS only** — no CSS modules or styled-components
- **SWR for client data** — use `useSWR` hooks, not raw `fetch` in components
- **Next.js Image** — always use `next/image` for images

## Key Directories
- `app/` — pages and layouts (App Router)
- `components/` — shared React components
- `lib/` — utilities, API clients, hooks

## Development
```bash
npm run dev           # Next.js dev server on port 3000
npm run storybook     # Storybook on port 6006
```

## Coding Regulations
See `spec/coding-regulations/zflow-web.md` for full standards.
