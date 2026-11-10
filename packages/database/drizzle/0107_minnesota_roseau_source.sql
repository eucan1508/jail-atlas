-- Provision Roseau County, Minnesota's official current inmate list without enabling publication.
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
  VALUES (v_state_id, 'Roseau County', 'roseau', 'Roseau', '/mn/roseau', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.roseaucountymn.gov/offices/sheriff/index.php'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Roseau County Sheriff''s Office',
      'sheriff',
      'https://www.roseaucountymn.gov/offices/sheriff/index.php',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Roseau County Detention Center', 'Roseau County, Minnesota', 'Roseau', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Roseau County Detention Center'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://s3.us-east-2.amazonaws.com/inmates.co.roseau.mn.us/CurrentInmateList.pdf',
    'official_county',
    'https://www.roseaucountymn.gov/offices/sheriff/index.php',
    'https://www.roseaucountymn.gov/government/offices/sheriff/detention_center.php',
    'The Roseau County Sheriff''s page links its Inmate List at inmates.co.roseau.mn.us, which shows CurrentInmateList.pdf from the county''s storage bucket of the same name; that host answers only over HTTP, so the same bucket is read over HTTPS at its regional address. The adapter requires every numbered page, the report''s closing note, and one print date, keeps each person''s jail ID, name, and charges with their offense level, and excludes SID numbers, ages, booking and release dates, arresting agencies, courts, dispositions, and bail.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only people listed on the current official Roseau County inmate list."}'::jsonb,
    'roseau-county-mn-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://s3.us-east-2.amazonaws.com/inmates.co.roseau.mn.us/CurrentInmateList.pdf';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'roseau-county-mn-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
