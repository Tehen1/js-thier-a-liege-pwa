# CI status and Vercel CI migration gate

## Verified repository state (2026-11-02)

- Vercel project: `tehens-projects/jsthier-pwa-kit`.
- Connected GitHub repository: `Tehen1/js-thier-a-liege-pwa`.
- The `main` branch is still a static HTML/CSS/JavaScript PWA.
- The validated Next.js 16 / React / TSX application exists on the developer's Mac, **not in this GitHub branch**.
- Vercel CI Beta expects a Turborepo configuration (`turbo.json`) and declared `turbo` dependency.
- This PR adds a **temporary GitHub Actions static preflight**, not Vercel CI Beta. It deliberately does not claim to build or test Next.js.

## Current checks

`Static preflight` runs syntax checks plus no-dependency Node tests for static assets, PWA icon paths, Service Worker precache, and the Vercel routing contract.

No repository secrets are required. GitHub's Vercel Git integration remains responsible for Preview deployments.

## Activate native Vercel CI Beta after the Next.js app is committed

1. Push the complete local Next.js 16 App Router project to an isolated branch of this exact repository (include `package.json`, `pnpm-lock.yaml`, `app/`, `components/`, `public/`, `tests/`, and configuration). Do not overwrite `main` without a verified Preview.
2. Verify `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` on a clean checkout.
3. Add a reviewed, pinned `turbo` devDependency using pnpm, commit the **generated** lockfile, and add a root `turbo.json`. For example, select `lint`, `typecheck`, `test`, and `build` as CI tasks, using `tags: ["ci"]` and real dependency boundaries. Never manually fabricate the lockfile.
4. Run the official Vercel CI setup workflow from a clean Git checkout using `npx skills use vercel/ci@setup`, or complete the Vercel dashboard's manual task selection. Confirm team, linked private GitHub repository, task selection, and any optional Shared Environment Variables.
5. Confirm a genuine **Vercel CI** invocation and its GitHub check status, plus an authenticated HTTP / game / PWA smoke test on the Vercel Preview. No production promotion until these pass.
6. After native Vercel CI checks are required and green, remove the temporary static-preflight GitHub Actions workflow. Do not keep duplicate CI execution without a reason.

## Secrets and backend

The current static PWA needs no Supabase credentials. Do not put Supabase service keys in this repository's CI variables or client bundle. When a Supabase-backed application is added, use least-privilege credentials and enforce RLS on all exposed tables. Never share a production database with untrusted PR builds.

## Release / rollback

Keep the existing Vercel production deployment untouched until the migrated Next.js Preview has been tested. If a released deployment breaks, use the previous successful Vercel production deployment as the rollback target.

Native Vercel CI documentation: https://vercel.com/blog/introducing-vercel-ci
Official setup skill: https://www.skills.sh/vercel/ci/vercel-ci-setup
