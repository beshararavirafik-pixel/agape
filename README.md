# Agapē

A Next.js 16 / React 19 / TypeScript / Tailwind wedding and engagement planning PWA. Supabase provides authentication, Postgres, and private file storage. All dependencies needed to run the app are free and open source. No AI API, payment integration, analytics subscription, external fonts, or paid asset service is used.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With blank Supabase settings, the clearly labeled sample planner runs in device-local storage. It never impersonates a real account. With Supabase configured, users can sign up, confirm email, sign in, reset passwords, and manage their private event. Cloud edits save automatically after a brief pause. Sample edits save on-device automatically.

## Connect the free backend

1. Create a Supabase **Free** project without upgrading.
2. Run `supabase/migrations/001_foundation.sql`, followed by `002_couple_collaboration.sql`, once in its SQL editor. This creates the event-linked tables, RLS ownership policies, atomic save function, private documents bucket, and validation triggers.
3. Copy the project URL and **public anon key** to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
4. In Supabase Auth URL Configuration, set the Site URL to your deployed URL and allow both that URL and `http://localhost:3000` as redirect URLs.
5. Leave email confirmation enabled. Test signup, confirmation, login, and password recovery. Supabase's built-in email delivery is rate limited; this version does not introduce a paid email provider.

Never put a service-role secret in the frontend, git, or Vercel public environment variables. This app needs only the public anon key. RLS enforces access at the database boundary.

## GitHub and Vercel

The source folder is initialized as a git repository with a first commit. To publish it to your own GitHub account:

```sh
gh auth login
gh repo create ever-after --private --source=. --remote=origin --push
```

Alternatively, create an empty GitHub repository, add its URL as `origin`, and push `main`.

Import the personal GitHub repository in Vercel, select the **Hobby** plan and Next.js framework, and add the two public Supabase environment variables above. Deploy. Add the final HTTPS URL to Supabase's auth configuration. Use the free `vercel.app` domain; buying a custom domain is optional and unnecessary.

Vercel Hobby is for personal, noncommercial use and has usage caps. Supabase Free also has quotas and may pause inactive projects. A small personal app can stay free within these limits; no provider's current or future terms can be guaranteed by this source code. Do not upgrade or enable paid services. Documents are limited to 10 MB each.

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
- JSON plan export.
- Responsive frosted navigation, rounded surfaces, reduced-motion support, keyboard focus styles, dialog focus trap, and accessible form labels.
- PWA manifest, PNG icons, install button on supporting browsers, and offline reconnect screen. Private account data is **not** cached by the service worker. Offline cloud editing is not implemented.

## Seating studio

SVG top view contains round, rectangular, square, oval, sweetheart, head, and cocktail tables. Shape determines chair arrangements. Each chair is visible; assigned chairs show guest initials and names. Add tables and common venue objects (dance floor, DJ/band, stage, bar, cake, buffet, photo booth, entrance, exit, décor). Move by pointer drag or arrow keys, edit table names, rotate, and change capacity from 1–24. The unseated panel supports guest dragging, or click guest then chair for touch/keyboard assignment. Assigning an occupied chair unseats its previous occupant. Declining an RSVP clears that guest's chair. Reducing capacity returns displaced guests to the unseated panel. Removing tables clears their assignments.

The room is a fixed 800×600 design surface, not an architectural scale drawing. Mobile users can scroll the surface. Undo/redo, room dimensions, and automatic seating optimization are not implemented.

## Database architecture

`auth.users → events → guests / floor_objects / planning_records`, with `seats` joining guests and tables. All child records carry the same event ID. Composite foreign keys prevent cross-event guest/table/vendor links. Seats are unique per guest and per chair. Planning records use a checked type discriminator for tasks, budgets, vendors, décor, inspiration, timelines, notes, and documents; budgets/tasks/décor can link to a vendor record in the same event. Monetary values are USD in this version.

`save_plan` replaces an event's dependent rows inside one Postgres transaction. RLS applies to every table, the function runs as the signed-in caller, and an event revision lock rejects stale concurrent saves. This is suitable for small personal plans; larger plans would benefit from per-record mutations. First-time users complete a three-step setup. Partners join the same event through email-bound, single-use, 14-day invitation links. Membership-aware RLS protects shared records. Saved changes sync through four-second polling, with a revision guard against conflicting saves. Guest groups support Family, Friends, Work, Other, and custom names. The Design studio includes 60 unique presets. The budget is directly editable on its page. Multiple-event switching and public guest RSVP forms are future work. This Sites preview is private; website access must also be shared with the invited partner.

Documents use a private bucket scoped by event ID. Removing document metadata currently leaves its stored object until manually cleaned in Supabase; unsaved uploads can also leave an orphan. Do not treat this as a fully audited production release before completing live backend and browser verification.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

Tests exercise guest-seat uniqueness and movement, connected seed records, the full SQL migration in local Postgres-compatible PGlite, transaction rollback, stale revision conflicts, and account isolation. Interaction tests cover seating/guest sync, declining/unseating, guest editing, and local persistence using jsdom.

Production build and database tests were verified in the authoring environment. Full browser visual/touch/PWA-install tests and live Supabase auth/storage tests must be completed after account connections. Browser download was unavailable in the authoring environment.

## Before calling it production ready

Verify live signup/confirmation/recovery, RLS with two accounts, private upload/download, event save/reload and concurrent-tab conflict, the full seating flow on Safari/Chrome and mobile, PWA install over HTTPS, document cleanup, and the deployed environment settings. No external GitHub repository or Vercel deployment is claimed until those accounts are connected and verified.


Seating studio includes dimensioned serpentine tables, initials with full guest names on hover, and guest creation within the studio. The optional 3D view loads Three.js only when opened and supports orbit, pan, zoom, and chair-name hover. It uses the same saved dimensions and assignments as the 2D plan. WebGL is required for 3D; the 2D editor remains available on unsupported devices. Navigation is a floating frosted header with an on-demand menu.


## Visual redesign
The interface uses locally bundled Outfit, Manrope, and Instrument Serif; a full-screen planning menu; warm neutral working surfaces; and a data-driven photographic dashboard. Existing event IDs, shared accounts, Supabase records, and legacy local-storage keys are retained so renaming does not erase plans.

Reception photograph: Jonathan Borba, [Pexels](https://www.pexels.com/photo/elegant-wedding-reception-table-decor-35985242/), used under the [Pexels License](https://www.pexels.com/license/). The image is served locally from public/images/reception.jpg; no image API is needed.


## Guest directory and assisted seating
The guest directory paginates 25/50/100 guests, supports household expansion, name/household/email search, group/RSVP/seating filters, and bulk RSVP updates. Guest deletion uses an in-app dialog and an Undo banner rather than window.confirm. Removal also clears seats and family links; undo restores only still-valid, unoccupied seats.

Seating suggestions run locally without AI or paid APIs. They preserve existing assignments, group households and linked invitations, and report insufficient capacity or split families. Layout suggestions add 10-seat round tables to available positions and reserve a dance floor; they never enlarge the room or move existing objects. Suggestions are reviewed before applying. Table linens, centerpieces, and dance-floor monograms are derived from the shared event palette and couple names in both 2D and 3D. Room settings are collapsed to keep the basic flow simple.
