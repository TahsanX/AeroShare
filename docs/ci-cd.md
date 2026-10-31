# CI/CD

Workflows live in `.github/workflows`:

- `ci.yml`: lint, typecheck, test, build on PRs and pushes to main (build uses dummy env values).
- `preview.yml`: Vercel preview deploy per PR, with the URL posted as a PR comment. Skipped for fork PRs, Dependabot, or when Vercel secrets are missing.
- `deploy.yml`: on push to main, runs CI then deploys to Vercel production.
- `cleanup-cron.yml`: hourly POST to `/api/cron/cleanup`.

## Required GitHub secrets

| Secret | Purpose |
| --- | --- |
| `VERCEL_TOKEN` | Vercel access token |
| `VERCEL_ORG_ID` | Vercel team/org ID (in `.vercel/project.json` after `vercel link`) |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `APP_URL` | Production base URL, e.g. `https://aeroshare.example.com` |
| `CRON_SECRET` | Must match `CRON_SECRET` set in the Vercel project env |

Runtime secrets (Supabase, Upstash) stay in Vercel project environment variables; `vercel pull` fetches them.

## Disable Vercel Git auto-deploy

GitHub Actions performs all deploys, so turn off Vercel's own Git integration to avoid double deploys: Vercel project > Settings > Git > disconnect the repository, or set `"git": { "deploymentEnabled": false }` in `vercel.json`.

## Recommended branch protection for `main`

- Require a pull request before merging (at least 1 approval).
- Require status check `Lint, typecheck, test, build` to pass, and branches up to date.
- Allow squash merging only; disable merge commits and rebase merging.
- Block force pushes and deletions; restrict direct pushes.
- Automatically delete head branches after merge.

## Branch naming and ownership

Use `<type>/<short-description>`, e.g. `feat/share-links`, `fix/upload-limit`, `ci/github-actions`, `chore/deps`. One owner per branch, and keep each branch to a distinct area of the code to limit conflicts. Use conventional commit messages (`feat:`, `fix:`, `ci:`, `docs:`).
