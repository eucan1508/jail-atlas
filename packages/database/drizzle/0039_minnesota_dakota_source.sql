-- Provision Dakota County's official jail inmate search without enabling publication.
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
  VALUES (v_state_id, 'Dakota County', 'dakota', 'Hastings', '/mn/dakota', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://dakotacountymn.gov/residents/public-safety-justice/jail'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Dakota County Sheriff''s Office',
      'sheriff',
      'https://dakotacountymn.gov/residents/public-safety-justice/jail',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Dakota County Jail', 'Dakota County, Minnesota', 'Hastings', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Dakota County Jail'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://dakotacountymn.gov/content/mndakotacountywebsite/api/search.json?method=JailInmateSearch',
    'official_county',
    'https://dakotacountymn.gov/residents/public-safety-justice/jail',
    'https://dakotacountymn.gov/residents/public-safety-justice/jail/inmate-search',
    'Dakota County''s official Jail Inmate Search page is served by this JSON search, which returns every booking currently in jail. The adapter reads each booking''s detail record, keeps the name, booking number, and open charges with their statute codes, drops charges with a clearance reason, re-reads the list to confirm nothing changed during the crawl, and excludes birth dates, sex, race, arrest locations and agencies, court numbers, and hearing dates.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only the entries listed in the current official jail inmate search."}'::jsonb,
    'dakota-county-mn-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://dakotacountymn.gov/content/mndakotacountywebsite/api/search.json?method=JailInmateSearch';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'dakota-county-mn-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
