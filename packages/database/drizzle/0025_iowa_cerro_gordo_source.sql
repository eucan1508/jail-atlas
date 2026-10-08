-- Provision Cerro Gordo County's official jail population report PDF without enabling publication.
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
  VALUES (v_state_id, 'Cerro Gordo County', 'cerro-gordo', 'Mason City', '/ia/cerro-gordo', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://cerrogordo.gov/sheriff/jail/'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Cerro Gordo County Sheriff''s Office',
      'sheriff',
      'https://cerrogordo.gov/sheriff/jail/',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Cerro Gordo County Jail', 'Cerro Gordo County, Iowa', 'Mason City', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Cerro Gordo County Jail'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://sofiles.cerrogordo.gov/inmate_report/',
    'official_county',
    'https://cerrogordo.gov/sheriff/jail/',
    'https://cerrogordo.gov/sheriff/jail/',
    'The Cerro Gordo County jail page links this Online Population Report PDF. The adapter requires every page in sequence, a print date no older than two days, and a row count equal to the Total Records line; it keeps the name and charges with their Iowa Code citations and excludes photos, age, sex, booking time, housing unit, jail ID, and bond.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only the entries listed in the current official jail population report."}'::jsonb,
    'cerro-gordo-county-iowa-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://sofiles.cerrogordo.gov/inmate_report/';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'cerro-gordo-county-iowa-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
