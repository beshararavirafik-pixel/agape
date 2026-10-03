import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { sample } from "../lib/model.ts";
test("migration, atomic saves, revision conflicts, and cross-event seating constraints", async () => {
  const db = new PGlite();
  await db.exec(
    `create schema auth;create schema storage;create role authenticated;create role anon;create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email',current_setting('app.user_email',true))$$;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,name text,bucket_id text);create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`,
  );
  await db.exec(
    readFileSync(
      new URL("../supabase/migrations/001_foundation.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/002_couple_collaboration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/003_layout_family_and_ceremony.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20260930201627_family_display_names.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const partner = crypto.randomUUID();
  await db.query("insert into auth.users values ($1)", [partner]);
  const user = crypto.randomUUID();
  await db.query("insert into auth.users values ($1)", [user]);
  await db.query("select set_config('app.user_id',$1,false)", [user]);
  const s = sample();
  s.guests[0].family_name = "The Nosseir Family";
  s.event.room_width_ft = 100;
  s.event.room_depth_ft = 70;
  s.objects[0].width_ft = 8;
  s.objects[0].chair_sizes = { "0": { width: 2, depth: 1.5 } };
  s.family_links = [
    {
      id: crypto.randomUUID(),
      event_id: s.event.id,
      guest_id: s.guests[0].id,
      related_guest_id: s.guests[1].id,
      relationship: "Mother",
    },
  ];
  const deacon = {
    ...s.records[0],
    id: crypto.randomUUID(),
    kind: "ceremony_clergy",
    title: "Mark",
    details: { role: "Deacon" },
  };
  s.records.push(deacon, {
    ...s.records[0],
    id: crypto.randomUUID(),
    kind: "ceremony_prayer",
    title: "Response",
    assignee_id: deacon.id,
  });
  const churchId = crypto.randomUUID();
  const churchLayout = JSON.stringify({
    pews: [{ id: "pew-1", capacity: 6 }],
    seats: { "pew-1:0": s.guests[0].id },
    iconY: 8,
  });
  s.records.push({
    ...s.records[0],
    id: churchId,
    kind: "ceremony_details",
    title: "Church seating layout",
    details: { layout: churchLayout },
  });
  const photoId = crypto.randomUUID();
  s.records.push({
    ...s.records[0],
    id: photoId,
    kind: "inspiration",
    title: "White roses",
    storage_path: `${s.event.id}/roses.jpg`,
  });
  const saved = await db.query<{ save_plan: number }>(
    "select save_plan($1,0)",
    [JSON.stringify(s)],
  );
  assert.equal(saved.rows[0].save_plan, 1);
  const savedChurch = await db.query<{ details: { layout: string } }>(
    "select details from planning_records where id=$1",
    [churchId],
  );
  assert.equal(savedChurch.rows[0].details.layout, churchLayout);
  const savedPhoto = await db.query<{ storage_path: string }>(
    "select storage_path from planning_records where id=$1",
    [photoId],
  );
  assert.equal(savedPhoto.rows[0].storage_path, `${s.event.id}/roses.jpg`);
  assert.equal(
    (
      await db.query<{ family_name: string }>(
        "select family_name from guests where id=$1",
        [s.guests[0].id],
      )
    ).rows[0].family_name,
    "The Nosseir Family",
  );
  assert.equal(
    (await db.query("select * from guests")).rows.length,
    s.guests.length,
  );
  await assert.rejects(
    db.query("select save_plan($1,0)", [JSON.stringify(s)]),
    /another tab/,
  );
  const invalid = structuredClone(s);
  invalid.records.find((r) => r.id === deacon.id)!.details = { role: "Priest" };
  await assert.rejects(
    db.query("select save_plan($1,1)", [JSON.stringify(invalid)]),
    /must reference a deacon/,
  );
  assert.equal((await db.query("select * from family_links")).rows.length, 1);
  const bad = structuredClone(s);
  bad.seats[0].position = 99;
  await assert.rejects(
    db.query("select save_plan($1,1)", [JSON.stringify(bad)]),
    /outside table capacity/,
  );
  assert.equal(
    (await db.query<{ revision: number }>("select revision from events"))
      .rows[0].revision,
    1,
  );
  await db.exec(
    "grant usage on schema public,auth to authenticated;grant all on all tables in schema public to authenticated;grant execute on function auth.uid() to authenticated;set role authenticated",
  );
  const invitation = await db.query<{ create_partner_invite: string }>(
    "select create_partner_invite($1,$2)",
    [s.event.id, "partner@example.com"],
  );
  await db.query("select set_config('app.user_id',$1,false)", [partner]);
  await db.query("select set_config('app.user_email',$1,false)", [
    "wrong@example.com",
  ]);
  await assert.rejects(
    db.query("select accept_partner_invite($1)", [
      invitation.rows[0].create_partner_invite,
    ]),
    /email address/,
  );
  await db.query("select set_config('app.user_email',$1,false)", [
    "partner@example.com",
  ]);
  await db.query("select accept_partner_invite($1)", [
    invitation.rows[0].create_partner_invite,
  ]);
  assert.equal(
    (await db.query("select * from guests")).rows.length,
    s.guests.length,
  );
  const shared = structuredClone(s);
  shared.event.name = "Shared celebration";
  shared.event.date = "";
  const update = await db.query<{ save_plan: number }>(
    "select save_plan($1,1)",
    [JSON.stringify(shared)],
  );
  assert.equal(update.rows[0].save_plan, 2);
  await assert.rejects(
    db.query("select accept_partner_invite($1)", [
      invitation.rows[0].create_partner_invite,
    ]),
    /expired|already used/,
  );
  await assert.rejects(
    db.query("update events set owner_id=$1", [partner]),
    /owner cannot change/,
  );
  await db.query("select set_config('app.user_id',$1,false)", [user]);
  assert.equal(
    (await db.query<{ name: string }>("select name from events")).rows[0].name,
    "Shared celebration",
  );
  await db.query("select set_config('app.user_id',$1,false)", [
    crypto.randomUUID(),
  ]);
  assert.equal((await db.query("select * from events")).rows.length, 0);
  assert.equal((await db.query("select * from guests")).rows.length, 0);
  await assert.rejects(db.query("select save_plan($1,1)", [JSON.stringify(s)]));
  await db.close();
});
