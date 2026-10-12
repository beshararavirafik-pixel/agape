# Agapē deployment

## Services

- GitHub: https://github.com/beshararavirafik-pixel/agape (production branch: `main`).
- Vercel: `beshararavirafik-8744/agape`, Node 22, Next.js preset.
- Production domain: https://agape-xi.vercel.app.
- Supabase: `ljhihphbnxeiljeijilc` (Ever After, US East).
- Email: Resend through Supabase Auth SMTP for confirmation/recovery, and a server-side API for partner and guest invitations.

## .env.local

The local file is already populated from the linked Vercel project. Its required settings are:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://ljhihphbnxeiljeijilc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
RESEND_API_KEY=<send-only Resend API key>
RESEND_FROM_EMAIL="Agapē <onboarding@resend.dev>"
APP_URL=http://localhost:3000/
```

The existing `NEXT_PUBLIC_SUPABASE_ANON_KEY` variable also works with either a publishable key or legacy anon key. Set either key variable; the publishable variable takes precedence. Get the public key from Supabase > Project Settings > API Keys. These values are public by design; authorization comes from RLS and the user's access token.

Do not add `SUPABASE_SERVICE_ROLE_KEY`, a Supabase secret key, database password, or a public Resend API key. The server-only `RESEND_API_KEY` is used for invitation emails. Supabase SMTP uses a separate key in its dashboard for authentication emails. `APP_URL` is the trusted base URL for emailed links; production and preview currently use `https://agape-xi.vercel.app/`. `VERCEL_OIDC_TOKEN` is CLI-generated and not an application requirement. Leave `NEXT_PUBLIC_BASE_PATH` unset on Vercel.

```sh
nvm use
npm ci
vercel link --yes --scope beshararavirafik-8744 --project agape
vercel env pull .env.local --yes
npm run dev
```

## Supabase migrations

Existing plans are retained. The historical migration filenames now match the hosted migration versions. The published-page migration includes an adoption baseline for the invitation schema that had previously been installed manually, so a fresh database can replay the complete app schema.

Two additive migrations harden the RSVP revocation RPC and make permissions explicit. Their filenames match the hosted application timestamps. All public tables have RLS. The private invitation table deliberately has no direct client policies; narrowly scoped functions enforce token and event access.

For future changes:

```sh
supabase link --project-ref ljhihphbnxeiljeijilc
supabase migration list
supabase migration new descriptive_change
# Edit the newly generated SQL, review it, then:
supabase db push --dry-run
supabase db push
```

Do not rerun `invitee-schema.sql` manually against the existing database; it is already installed. Schema deployment is explicit, independent of Vercel application deploys. No build command resets, seeds, or migrates production data.

## Authentication

The app implements email/password signup, email confirmation, sign-in, password recovery, persisted sessions, sign-out, and email-bound partner invitations. Browser auth intentionally uses Supabase's implicit flow, which permits confirmation/recovery from another browser. Data access is authorized by RLS; the invitation email handler independently validates the caller’s access token before invoking database authorization.

`supabase/config.toml` declares hosted auth settings: production Site URL, exact production and local redirects, confirmation required, and an eight-character minimum. Existing published-site redirect URLs remain allowed to preserve old links. It is a sparse hosted configuration; use the hosted backend for local app development.

```sh
supabase config diff --project-ref ljhihphbnxeiljeijilc
supabase config push --project-ref ljhihphbnxeiljeijilc --yes
```

Google OAuth is optional. To enable it, configure Google's client ID/secret in Supabase Auth > Providers > Google and register `https://ljhihphbnxeiljeijilc.supabase.co/auth/v1/callback` with Google. The app hides Google sign-in until the provider is enabled.

## Resend: test sender configured

Resend is connected. Supabase Auth uses `Agapē <onboarding@resend.dev>` through Resend SMTP for testing, with a dedicated send-only API key stored in Supabase. That SMTP key is not in the repository. A separate send-only key is configured in Vercel and `.env.local` for invitation emails. SMTP authentication was verified without sending an email.

The `resend.dev` test domain can deliver only to the email address associated with your Resend account. Use that exact address when testing signup, confirmation, and password recovery. Other recipients will be rejected until you verify your own sending domain. This recipient restriction is enforced by Resend; it is not a public-registration setup.

Verify your sending domain in Resend using its DNS records. In [Supabase Auth SMTP](https://supabase.com/dashboard/project/ljhihphbnxeiljeijilc/auth/smtp), enable custom SMTP and set:

| Setting | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your Resend API key (store only in the provider dashboard) |
| Sender email | An address on your verified Resend domain |
| Sender name | `Agapē` |

Keep email confirmation enabled. Review Supabase's auth email rate limit after configuring SMTP. Disable Resend link tracking for authentication emails so confirmation and recovery links remain intact. The current test sender is restricted to your Resend account address; switch to a verified domain before public signup.

Official instructions: [Resend + Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Partner and guest invitation emails

Create a partner link under Plan together, then choose **Email partner invitation**. For guests, add their saved email addresses in the directory, create a private invitation for the selected guests, then choose the recipient and **Email guest invitation**. Each action sends only when you press its email button. No bulk mailing occurs.

The API validates Supabase authentication, event access, active invitation tokens, and saved recipient membership. Partner emails always use the invitation’s stored address. Raw invitation tokens are not stored in the delivery table. Delivery reservations are private, rate limited to 20 new sends per planner per hour, and reuse a Resend idempotency key for the same invitation/recipient/UTC day. Repeating an accepted send that day does not send another email. Failed attempts also consume a reservation. Resend acceptance is displayed separately from confirmed delivery. Copying links remains available if email fails.

The test sender restriction also applies to invitation emails. Once you verify a domain, update both Supabase SMTP’s sender and Vercel’s `RESEND_FROM_EMAIL`, pull your local environment, and redeploy.

## GitHub → Vercel: connected

The Vercel GitHub app is installed for `beshararavirafik-pixel/agape`. The Vercel project is connected to that repository, and its saved `productionBranch` is `main`. Every subsequent push to `main` deploys production; other branches get previews. The checked-in Git setting enables deployments. No extra GitHub deployment token is needed.

The backend configuration, invitation email implementation, and CI workflow are checked into this repository. Production deployments were initially uploaded directly from the working tree based on Git commit `30a72e8`; subsequent pushes to `main` deploy through the Git integration.

To reconnect another checkout if necessary:

```sh
vercel link --yes --scope beshararavirafik-8744 --project agape
vercel git connect https://github.com/beshararavirafik-pixel/agape
```

## Verification

```sh
npm run typecheck
npm test
npm run build
npm audit
```

The backend test replays every migration, verifies anonymous invitation boundaries and replies, hidden drafts/private data, published pages, and revocation RPC privileges. Live Supabase invitation, email recipient/quota, and website verification scripts passed inside rolled-back fixture transactions. The security advisor no longer flags the exposed privileged revocation function. It still reports the intentionally locked private invitation table and disabled leaked-password protection; the latter can be enabled in the Supabase dashboard if available on your plan.

Before opening public registration, finish Resend setup and test real signup → confirmation → sign-in → password reset in your browser. Also verify private document upload/download, event save/reload with two accounts, mobile seating, and PWA installation. Automated checks do not establish email delivery or a full browser walkthrough.

## Verified deployment (October 12, 2026)

- Production: https://agape-xi.vercel.app (READY, Node 22).
- Deployment: `dpl_6hwZt63UptgD9t69QE2NrGvWFHaf`.
- All 36 tests, TypeScript, production build, and dependency audit passed.
- Ten local and hosted migration versions match; `supabase db push --dry-run` reports up to date.
- Auth settings confirm email enabled, signup enabled, confirmation required. Google remains disabled.
- Anonymous REST reads return no event rows.
- Production HTML and all eight JavaScript assets returned HTTP 200, Supabase is present in the deployed bundle, and security/service-worker headers are correct.
- The production login screen was verified in Chrome. No application errors appeared in the deployment runtime error scan.
- Invitation email API is deployed; anonymous requests return HTTP 401 with `Cache-Control: no-store`. Hosted recipient, ownership, revocation, idempotency, and quota checks passed using rolled-back fixtures.
- Resend test SMTP is configured and its credentials were authenticated. No actual invitations were sent during verification; real confirmation/recovery and invitation delivery still need a browser test using your Resend account email.
