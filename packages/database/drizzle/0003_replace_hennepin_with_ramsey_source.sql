-- Remove the draft Hennepin source and provision Ramsey County as the replacement.
-- The Hennepin migration remains in history; this migration makes the final state explicit for
-- databases where it was already applied and is a no-op for databases that skipped it.
DO $$
DECLARE
  v_mn_state_id uuid;
  v_hennepin_county_id uuid;
  v_hennepin_institution_id uuid;
  v_hennepin_source_id uuid;
  v_ramsey_county_id uuid;
  v_ramsey_institution_id uuid;
  v_ramsey_source_id uuid;
BEGIN
  SELECT "id" INTO v_hennepin_source_id
  FROM "official_sources"
  WHERE "adapter_key" = 'hennepin-county-mn-current-roster';
  IF v_hennepin_source_id IS NOT NULL THEN
    DELETE FROM "custody_snapshots" WHERE "source_id" = v_hennepin_source_id;
    DELETE FROM "ingest_runs" WHERE "source_id" = v_hennepin_source_id;
    DELETE FROM "source_adapters" WHERE "source_id" = v_hennepin_source_id;
    DELETE FROM "official_sources" WHERE "id" = v_hennepin_source_id;
  END IF;

  SELECT "id" INTO v_hennepin_county_id
  FROM "counties"
  WHERE "slug" = 'hennepin' AND "state_id" = (SELECT "id" FROM "states" WHERE "code" = 'MN');
  IF v_hennepin_county_id IS NOT NULL THEN
    SELECT "id" INTO v_hennepin_institution_id
    FROM "official_institutions"
    WHERE "county_id" = v_hennepin_county_id;
    IF v_hennepin_institution_id IS NOT NULL THEN
      DELETE FROM "facilities" WHERE "official_institution_id" = v_hennepin_institution_id;
      DELETE FROM "official_institutions" WHERE "id" = v_hennepin_institution_id;
    END IF;
    DELETE FROM "counties" WHERE "id" = v_hennepin_county_id;
  END IF;

  SELECT "id" INTO v_mn_state_id FROM "states" WHERE "code" = 'MN';
  IF v_mn_state_id IS NULL THEN
    INSERT INTO "states" ("code", "name", "slug", "default_locale", "publication_status")
    VALUES ('MN', 'Minnesota', 'minnesota', 'en-US', 'draft')
    RETURNING "id" INTO v_mn_state_id;
  END IF;

  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_mn_state_id, 'Ramsey County', 'ramsey', 'Saint Paul', '/mn/ramsey', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE SET "name" = EXCLUDED."name"
  RETURNING "id" INTO v_ramsey_county_id;

  SELECT "id" INTO v_ramsey_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_ramsey_county_id
    AND "official_url" = 'https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/'
  ORDER BY "created_at" LIMIT 1;
  IF v_ramsey_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_ramsey_county_id,
      'Ramsey County Sheriff''s Office',
      'sheriff',
      'https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/',
      now()
    )
    RETURNING "id" INTO v_ramsey_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_ramsey_county_id, v_ramsey_institution_id, 'Ramsey County Adult Detention Center', 'Ramsey County, Minnesota', 'Saint Paul', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_ramsey_institution_id AND "name" = 'Ramsey County Adult Detention Center'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_ramsey_institution_id,
    'https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/',
    'official_county',
    'https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/',
    'https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/',
    'Ramsey County''s official open-data roster documents current inmates and a five-day release window. This adapter requests current custody only from the public Socrata datasets.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only the current-custody snapshot."}'::jsonb,
    'ramsey-county-mn-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_ramsey_source_id;
  IF v_ramsey_source_id IS NULL THEN
    SELECT "id" INTO v_ramsey_source_id FROM "official_sources"
    WHERE "source_url" = 'https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_ramsey_source_id, 'ramsey-county-mn-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
