-- Provision Jefferson County, Texas' official current inmate list without enabling publication.
DO $$
DECLARE
  v_state_id uuid;
  v_county_id uuid;
  v_institution_id uuid;
  v_source_id uuid;
BEGIN
  SELECT "id" INTO v_state_id FROM "states" WHERE "code" = 'TX';
  IF v_state_id IS NULL THEN
    INSERT INTO "states" ("code", "name", "slug", "default_locale", "publication_status")
    VALUES ('TX', 'Texas', 'texas', 'en-US', 'draft')
    RETURNING "id" INTO v_state_id;
  END IF;

  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_state_id, 'Jefferson County', 'jefferson', 'Beaumont', '/tx/jefferson', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.sheriff.jeffersoncountytx.gov/'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Jefferson County Sheriff''s Office',
      'sheriff',
      'https://www.sheriff.jeffersoncountytx.gov/',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Jefferson County Correctional Facility', 'Jefferson County, Texas', 'Beaumont', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Jefferson County Correctional Facility'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://jeffersoncountytx.gov/blobs/Sheriff/content/documents/inmate/CURRENTINMATES.PDF',
    'official_county',
    'https://www.sheriff.jeffersoncountytx.gov/',
    'https://www.sheriff.jeffersoncountytx.gov/',
    'The Jefferson County Sheriff''s website links its Inmate Log to this printed current inmate list. The adapter requires every numbered page and one print time, splits people by their race and gender lines and charges by their rows, and keeps names and charges while excluding race, gender, age, arrest agencies, bonds, warrant numbers, and degrees.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only people listed on the current official Jefferson County, Texas inmate list."}'::jsonb,
    'jefferson-county-tx-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://jeffersoncountytx.gov/blobs/Sheriff/content/documents/inmate/CURRENTINMATES.PDF';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'jefferson-county-tx-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
