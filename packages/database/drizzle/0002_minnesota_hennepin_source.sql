-- Provision Hennepin County's official current-custody API without enabling publication.
-- A successful dry-run and human review must promote this source before live writes.
DO $$
DECLARE
  v_mn_state_id uuid;
  v_county_id uuid;
  v_institution_id uuid;
  v_source_id uuid;
BEGIN
  INSERT INTO "states" ("code", "name", "slug", "default_locale", "publication_status")
  VALUES ('MN', 'Minnesota', 'minnesota', 'en-US', 'draft')
  ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "slug" = EXCLUDED."slug"
  RETURNING "id" INTO v_mn_state_id;
  IF v_mn_state_id IS NULL THEN
    SELECT "id" INTO v_mn_state_id FROM "states" WHERE "code" = 'MN';
  END IF;

  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_mn_state_id, 'Hennepin County', 'hennepin', 'Minneapolis', '/mn/hennepin', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE SET "name" = EXCLUDED."name"
  RETURNING "id" INTO v_county_id;
  IF v_county_id IS NULL THEN
    SELECT "id" INTO v_county_id FROM "counties" WHERE "state_id" = v_mn_state_id AND "slug" = 'hennepin';
  END IF;

  INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
  SELECT v_county_id, 'Hennepin County Sheriff', 'sheriff', 'https://www.hennepinsheriff.org/jail-warrants/jail', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM "official_institutions"
    WHERE "county_id" = v_county_id AND "official_url" = 'https://www.hennepinsheriff.org/jail-warrants/jail'
  );
  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id AND "official_url" = 'https://www.hennepinsheriff.org/jail-warrants/jail'
  ORDER BY "created_at" LIMIT 1;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Hennepin County Adult Detention Center', 'Hennepin County, Minnesota', 'Minneapolis', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Hennepin County Adult Detention Center'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://jailroster.hennepin.us/',
    'officially_linked_vendor',
    'https://www.hennepinsheriff.org/jail-warrants/jail',
    'https://www.hennepinsheriff.org/jail-warrants/jail-roster',
    'The official Hennepin County Sheriff jail page links to the public roster. The roster API returns current custody and a recent release window; this adapter requests current custody only.',
    '1.0.0',
    'verification_pending',
    ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only the current-custody snapshot."}'::jsonb,
    'hennepin-county-mn-current-roster',
    false
  )
  ON CONFLICT ("source_url") DO NOTHING;
  SELECT "id" INTO v_source_id FROM "official_sources" WHERE "source_url" = 'https://jailroster.hennepin.us/';

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'hennepin-county-mn-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
