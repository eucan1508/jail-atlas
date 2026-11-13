-- Provision Sebastian County, Arkansas' official inmate inquiry without enabling publication.
DO $$
DECLARE
  v_state_id uuid;
  v_county_id uuid;
  v_institution_id uuid;
  v_source_id uuid;
BEGIN
  SELECT "id" INTO v_state_id FROM "states" WHERE "code" = 'AR';
  IF v_state_id IS NULL THEN
    INSERT INTO "states" ("code", "name", "slug", "default_locale", "publication_status")
    VALUES ('AR', 'Arkansas', 'arkansas', 'en-US', 'draft')
    RETURNING "id" INTO v_state_id;
  END IF;

  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_state_id, 'Sebastian County', 'sebastian', 'Fort Smith', '/ar/sebastian', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.sebastiancountyar.gov/Sheriff/Sheriff-Home'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Sebastian County Sheriff''s Office',
      'sheriff',
      'https://www.sebastiancountyar.gov/Sheriff/Sheriff-Home',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Sebastian County Adult Detention Center', 'Sebastian County, Arkansas', 'Fort Smith', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Sebastian County Adult Detention Center'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://inmate.sebastiancountyar.gov/NewWorld.InmateInquiry/AR0660000?InCustody=True',
    'official_sheriff',
    'https://www.sebastiancountyar.gov/Sheriff/Sheriff-Home',
    'https://www.sebastiancountyar.gov/Sheriff/Adult-Detention-Center/Inmate-Search',
    'The Sebastian County Sheriff''s Adult Detention Center Inmate Search page links this NewWorld inmate inquiry on the county''s own domain. The adapter reads only the in-custody list, follows each person''s detail page for the current booking, and keeps names, booking numbers, and charge descriptions while excluding dates of birth, home addresses, photos, physical descriptions, arresting agencies, and released bookings.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only people listed as in custody on the current official Sebastian County inmate inquiry."}'::jsonb,
    'sebastian-county-ar-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://inmate.sebastiancountyar.gov/NewWorld.InmateInquiry/AR0660000?InCustody=True';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'sebastian-county-ar-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
