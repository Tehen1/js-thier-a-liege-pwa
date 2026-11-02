# JS du Thier à Liège — Next.js App Router / TSX migration

This is a non-destructive migration generated from the original standalone HTML project.
`components/ClubMarkup.tsx` contains the original SSR JSX markup. Original game and
PWA modules remain plain ES modules in `public/` during the transition to React hooks.
No iframe, no `dangerouslySetInnerHTML`, no backend or fake score synchronization.

## Local verification

Use Node.js 22+ and pnpm 12. Run `pnpm install` once and commit the resulting
`pnpm-lock.yaml`; thereafter use `pnpm install --frozen-lockfile` for reproducible installs.

```bash
pnpm install
pnpm run check
pnpm dev
```

Open http://localhost:3000, test the Runner, penalty game, mobile menu, dark theme,
forms, PWA installation and offline mode (in production/HTTPS). Inspect browser console.

## Migration boundaries

- Games and legacy initialization still run as browser ES modules from `public/`.
- The registration form is still the original demo (no persisted data, no confirmation email).
- Match schedules are not synced to any authenticated football API.
- This project has no Supabase credentials or database yet. Add Auth + PostgreSQL RLS in a
  separate reviewable PR, with privacy protections before collecting minor data.
- Next's inline streaming bootstrap requires a nonce-aware CSP before enabling a strict CSP.
- The original `index.html` and `style.css` are archived in `reference/` for verification.

## Release policy

Keep the existing Vercel production project intact. Create a new preview branch,
run `pnpm install --frozen-lockfile && pnpm run check`, and perform Playwright/browser smoke tests before
merging or promoting. Keep the current static deployment as rollback.
