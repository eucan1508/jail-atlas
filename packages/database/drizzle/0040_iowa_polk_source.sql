-- Provision Polk County's official Current Inmate Listing without enabling publication.
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
  VALUES (v_state_id, 'Polk County', 'polk', 'Des Moines', '/ia/polk', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.polkcountyiowa.gov/county-sheriff/'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Polk County Sheriff''s Office',
      'sheriff',
      'https://www.polkcountyiowa.gov/county-sheriff/',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Polk County Jail', 'Polk County, Iowa', 'Des Moines', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Polk County Jail'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://polkinmates.polkcountyiowa.gov/Inmates/Current',
    'official_county',
    'https://www.polkcountyiowa.gov/county-sheriff/',
    'https://www.polkcountyiowa.gov/county-sheriff/detention/jail-and-arrest-information/',
    'The Polk County Sheriff''s Jail and Arrest Information page links this Current Inmate Listing of people in the Sheriff''s custody (inmates with federal charges are not listed). The adapter reads every person''s detail page, keeps only people whose holding location is the Polk County Jail, keeps name, booking number, and charges from cases not marked cleared with their Iowa Code sections, re-reads the list until every listed person is covered, and excludes ages, physical descriptions, inmate numbers, case numbers, arresting agencies, and bail.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only people the current official jail roster shows in custody at the Polk County Jail."}'::jsonb,
    'polk-county-iowa-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://polkinmates.polkcountyiowa.gov/Inmates/Current';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'polk-county-iowa-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
