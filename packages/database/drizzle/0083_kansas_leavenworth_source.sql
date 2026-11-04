-- Provision Leavenworth County, Kansas's official current inmate roster without enabling publication.
DO $$
DECLARE
  v_state_id uuid;
  v_county_id uuid;
  v_institution_id uuid;
  v_source_id uuid;
BEGIN
  SELECT "id" INTO v_state_id FROM "states" WHERE "code" = 'KS';
  IF v_state_id IS NULL THEN
    INSERT INTO "states" ("code", "name", "slug", "default_locale", "publication_status")
    VALUES ('KS', 'Kansas', 'kansas', 'en-US', 'draft')
    RETURNING "id" INTO v_state_id;
  END IF;

  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_state_id, 'Leavenworth County', 'leavenworth', 'Leavenworth', '/ks/leavenworth', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.lvsheriff.org/'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Leavenworth County Sheriff''s Office',
      'sheriff',
      'https://www.lvsheriff.org/',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Leavenworth County Jail', 'Leavenworth County, Kansas', 'Leavenworth', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Leavenworth County Jail'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://www.lvsheriff.org/inmate-roster/filters/current/booking_time=desc/1',
    'official_county',
    'https://www.lvsheriff.org/',
    'https://www.lvsheriff.org/detention-division',
    'The Leavenworth County Sheriff''s Office website links its Inmate Roster for the county jail in Leavenworth. The adapter reads only the current roster pages, checks the total against the roster heading, and retains booking number and source-listed charges while excluding mugshots and ages.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only entries present on the official current inmate roster."}'::jsonb,
    'leavenworth-county-ks-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://www.lvsheriff.org/inmate-roster/filters/current/booking_time=desc/1';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'leavenworth-county-ks-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
