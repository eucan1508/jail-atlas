-- Provision St. Louis County's official hourly jail roster PDF without enabling publication.
DO $$
DECLARE
  v_state_id uuid;
  v_county_id uuid;
  v_institution_id uuid;
  v_source_id uuid;
BEGIN
  SELECT "id" INTO v_state_id FROM "states" WHERE "code" = 'MN';
  IF v_state_id IS NULL THEN
    INSERT INTO "states" ("code", "name", "slug", "default_locale", "publication_status")
    VALUES ('MN', 'Minnesota', 'minnesota', 'en-US', 'draft')
    RETURNING "id" INTO v_state_id;
  END IF;

  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_state_id, 'St. Louis County', 'st-louis', 'Duluth', '/mn/st-louis', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'St. Louis County Sheriff''s Office',
      'sheriff',
      'https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'St. Louis County Jail', 'St. Louis County, Minnesota', 'Duluth', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'St. Louis County Jail'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://www.stlouiscountymn.gov/Portals/0/rpts/SLCJ_Jail_Roster.PDF',
    'official_county',
    'https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail',
    'https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail/jail-roster',
    'The St. Louis County Sheriff''s Jail Roster page links this hourly Jail Roster Report, which numbers every person in county custody, including people boarded in other jails. The adapter requires the running numbers and page count to be complete, keeps only entries whose Location is Saint Louis County Jail, keeps the name and listed charges, and excludes date of birth, age, bail, arresting agency, booking dates, and the LID number.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only the entries listed in the current official Jail Roster PDF."}'::jsonb,
    'st-louis-county-mn-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://www.stlouiscountymn.gov/Portals/0/rpts/SLCJ_Jail_Roster.PDF';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'st-louis-county-mn-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
