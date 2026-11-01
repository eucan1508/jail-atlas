-- Provision Wapello County's official jail portal without enabling publication.
DO $$
DECLARE
  v_state_id uuid;
  v_county_id uuid;
  v_institution_id uuid;
  v_source_id uuid;
BEGIN
  SELECT "id" INTO v_state_id FROM "states" WHERE "code" = 'IA';
  IF v_state_id IS NULL THEN
    INSERT INTO "states" ("code", "name", "slug", "default_locale", "publication_status")
    VALUES ('IA', 'Iowa', 'iowa', 'en-US', 'draft')
    RETURNING "id" INTO v_state_id;
  END IF;

  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_state_id, 'Wapello County', 'wapello', 'Ottumwa', '/ia/wapello', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.wapellocounty.org/sheriff_and_jail/'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Wapello County Sheriff''s Office',
      'sheriff',
      'https://www.wapellocounty.org/sheriff_and_jail/',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Wapello County Jail', 'Wapello County, Iowa', 'Ottumwa', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Wapello County Jail'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://wapello-so-ia.zuercherportal.com/#/inmates',
    'officially_linked_vendor',
    'https://www.wapellocounty.org/sheriff_and_jail/',
    'https://www.wapellocounty.org/sheriff_and_jail/',
    'The Wapello County Sheriff''s Office links this jail portal from its Sheriff and Jail page as Current Inmates. The adapter reads the portal''s setup, asks for everyone in custody at the time of the run, requires the list to match the portal''s total, leaves out anyone already released and any juvenile, keeps each person''s name and every charge, warrant, sentence, or hold with its statute and bond, and excludes ages, photos, race, sex, arrest dates, and warrant numbers.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only people the current official jail portal shows in custody at the Wapello County Jail."}'::jsonb,
    'wapello-county-iowa-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://wapello-so-ia.zuercherportal.com/#/inmates';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'wapello-county-iowa-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
