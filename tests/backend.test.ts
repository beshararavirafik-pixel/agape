import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("complete migration replay, private invitations, published pages and RPC privileges", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth; create schema storage;
      create role authenticated; create role anon;
      grant usage on schema auth, public to authenticated, anon;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as
        $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid,name text,bucket_id text);
      create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
    `);
    const directory = new URL("../supabase/migrations/", import.meta.url);
    for (const filename of readdirSync(directory)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      await db.exec(readFileSync(new URL(filename, directory), "utf8"));
    }
    for (const script of [
      "invitee-verification.sql",
      "wedding-website-verification.sql",
      "invitation-email-verification.sql",
    ]) {
      await db.exec(
        readFileSync(new URL(`../supabase/${script}`, import.meta.url), "utf8"),
      );
    }
    const { rows } = await db.query<{
      invoker: boolean;
      anon: boolean;
      signed_in: boolean;
    }>(`
      select not prosecdef as invoker,
        has_function_privilege('anon', oid, 'execute') as anon,
        has_function_privilege('authenticated', oid, 'execute') as signed_in
      from pg_proc where oid = 'public.revoke_rsvp_invite(uuid)'::regprocedure
    `);
    assert.deepEqual(rows[0], { invoker: true, anon: false, signed_in: true });
    assert.equal(
      (
        await db.query(
          `select * from pg_tables where schemaname='public' and not rowsecurity`,
        )
      ).rows.length,
      0,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query(
        "select public.revoke_rsvp_invite('00000000-0000-4000-8000-000000000001')",
      ),
      /not accessible/,
    );
  } finally {
    await db.close();
  }
});
