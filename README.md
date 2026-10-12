# Agapē

A Next.js 16 / React 19 / TypeScript / Tailwind wedding and engagement planning PWA. Supabase provides authentication, Postgres, and private file storage. Supabase is the backend for accounts, shared plans, RSVP, and private documents. Resend delivers authentication emails through Supabase SMTP and partner/guest invitations through a server-side API. Vercel hosts the Next.js app.

## Run locally

Use Node.js 22.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With blank Supabase settings, the clearly labeled sample planner runs in device-local storage. It never impersonates a real account. With Supabase configured, users can sign up, confirm email, sign in, reset passwords, and manage their private event. Cloud edits save automatically after a brief pause. Sample edits save on-device automatically.

## Backend and deployment

See [Deployment setup](docs/DEPLOYMENT.md) for the exact environment variables, Supabase migrations, authentication settings, Resend SMTP configuration, and Vercel/GitHub setup status.

The existing backend is Supabase project `ljhihphbnxeiljeijilc` (Ever After). Vercel project `agape` is linked locally. The production domain is https://agape-xi.vercel.app. Keep `.env.local` and `.vercel/` out of git.

This is a browser-authenticated app: Supabase manages sessions, confirmation, sign-in, password recovery, and RLS. A service-role key is not required. Google login appears only if enabled in Supabase; email/password works independently. Resend's SMTP credentials belong in Supabase's dashboard, not public Next.js environment variables. The current `onboarding@resend.dev` test sender can deliver only to the Resend account email.

The former GitHub Pages workflow is replaced by CI (typecheck, tests, build). Vercel's Git integration is connected to this repository and deploys pushes to `main`. CI runs separately; it is not a deployment gate unless Vercel Deployment Checks are configured.

## What's implemented

- Event profile, partner names, venue, date, budget, wedding/engagement mode.
- Dashboard computed from the event's real guest, seat, task, and budget records.
- Date-based suggested planning checklist; editable tasks and completion tracking.
- Guest add/edit/remove, household grouping by shared household name, manual RSVP tracking, dietary needs, email, and synchronized table display.
- Budget line items and payments, remaining/over-budget totals, vendor links.
- Vendor records with research/contact/booked states, notes, dates, and URLs.
- Five-color palette editor and presets; shared palette on dashboard.
- Flowers and décor records with quantities/specifications in notes, costs, payments, vendor links.
- Inspiration link boards, notes, planning timeline, and wedding-day date/time schedule.
- Private PDF/image document uploads with short-lived signed download URLs.
- Partner and private guest invitation emails through Resend, with saved-recipient checks, retry deduplication, and send limits.
- JSON plan export.
- Responsive frosted navigation, rounded surfaces, reduced-motion support, keyboard focus styles, dialog focus trap, and accessible form labels.
- PWA manifest, PNG icons, install button on supporting browsers, and offline reconnect screen. Private account data is **not** cached by the service worker. Offline cloud editing is not implemented.

## Seating studio

SVG top view contains round, rectangular, square, oval, sweetheart, head, and cocktail tables. Shape determines chair arrangements. Each chair is visible; assigned chairs show guest initials and names. Add tables and common venue objects (dance floor, DJ/band, stage, bar, cake, buffet, photo booth, entrance, exit, décor). Move by pointer drag or arrow keys, edit table names, rotate, and change capacity from 1–24. The unseated panel supports guest dragging, or click guest then chair for touch/keyboard assignment. Assigning an occupied chair unseats its previous occupant. Declining an RSVP clears that guest's chair. Reducing capacity returns displaced guests to the unseated panel. Removing tables clears their assignments.

The room is a fixed 800×600 design surface, not an architectural scale drawing. Mobile users can scroll the surface. Undo/redo, room dimensions, and automatic seating optimization are not implemented.

## Database architecture

`auth.users → events → guests / floor_objects / planning_records`, with `seats` joining guests and tables. All child records carry the same event ID. Composite foreign keys prevent cross-event guest/table/vendor links. Seats are unique per guest and per chair. Planning records use a checked type discriminator for tasks, budgets, vendors, décor, inspiration, timelines, notes, and documents; budgets/tasks/décor can link to a vendor record in the same event. Monetary values are USD in this version.

`save_plan` replaces an event's dependent rows inside one Postgres transaction. RLS applies to every table, the function runs as the signed-in caller, and an event revision lock rejects stale concurrent saves. This is suitable for small personal plans; larger plans would benefit from per-record mutations. First-time users complete a three-step setup. Partners join the same event through email-bound, single-use, 14-day invitation links. Membership-aware RLS protects shared records. Saved changes sync through four-second polling, with a revision guard against conflicting saves. Guest groups support Family, Friends, Work, Other, and custom names. The Design studio includes 60 unique presets. The budget is directly editable on its page. Multiple-event switching is future work. Private guest invitation links support RSVP without an account. Partners access the deployed app using their own confirmed Supabase account.

Documents use a private bucket scoped by event ID. Removing document metadata currently leaves its stored object until manually cleaned in Supabase; unsaved uploads can also leave an orphan. Do not treat this as a fully audited production release before completing live backend and browser verification.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

Tests exercise guest-seat uniqueness and movement, connected seed records, the full SQL migration in local Postgres-compatible PGlite, transaction rollback, stale revision conflicts, and account isolation. Interaction tests cover seating/guest sync, declining/unseating, guest editing, and local persistence using jsdom.

The complete migration chain is replayed in PGlite by the backend regression test, including invitation privacy and published-page checks. Live SQL checks use rolled-back fixtures. See the deployment setup document for external account steps and remaining browser/auth delivery verification.

## Before calling it production ready

Verify live signup/confirmation/recovery, RLS with two accounts, private upload/download, event save/reload and concurrent-tab conflict, the full seating flow on Safari/Chrome and mobile, PWA install over HTTPS, document cleanup, and the deployed environment settings. The repository is https://github.com/beshararavirafik-pixel/agape. Deployment and account connection status are recorded in docs/DEPLOYMENT.md.


Seating studio includes dimensioned serpentine tables, initials with full guest names on hover, and guest creation within the studio. The optional 3D view loads Three.js only when opened and supports orbit, pan, zoom, and chair-name hover. It uses the same saved dimensions and assignments as the 2D plan. WebGL is required for 3D; the 2D editor remains available on unsupported devices. Navigation is a floating frosted header with an on-demand menu.


## Visual redesign
The interface uses locally bundled Outfit, Manrope, and Instrument Serif; a full-screen planning menu; warm neutral working surfaces; and a data-driven photographic dashboard. Existing event IDs, shared accounts, Supabase records, and legacy local-storage keys are retained so renaming does not erase plans.

Reception photograph: Jonathan Borba, [Pexels](https://www.pexels.com/photo/elegant-wedding-reception-table-decor-35985242/), used under the [Pexels License](https://www.pexels.com/license/). The image is served locally from public/images/reception.jpg; no image API is needed.


## Guest directory and assisted seating
The guest directory paginates 25/50/100 guests, supports household expansion, name/household/email search, group/RSVP/seating filters, and bulk RSVP updates. Guest deletion uses an in-app dialog and an Undo banner rather than window.confirm. Removal also clears seats and family links; undo restores only still-valid, unoccupied seats.

Seating suggestions run locally without AI or paid APIs. They preserve existing assignments, group households and linked invitations, and report insufficient capacity or split families. Layout suggestions add 10-seat round tables to available positions and reserve a dance floor; they never enlarge the room or move existing objects. Suggestions are reviewed before applying. Table linens, centerpieces, and dance-floor monograms are derived from the shared event palette and couple names in both 2D and 3D. Room settings are collapsed to keep the basic flow simple.
