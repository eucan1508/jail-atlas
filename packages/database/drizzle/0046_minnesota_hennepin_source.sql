-- Provision Hennepin County, Minnesota's official jail roster without enabling publication.
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
  VALUES (v_state_id, 'Hennepin County', 'hennepin', 'Minneapolis', '/mn/hennepin', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.hennepinsheriff.org/jail-warrants/jail'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Hennepin County Sheriff''s Office',
      'sheriff',
      'https://www.hennepinsheriff.org/jail-warrants/jail',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Hennepin County Adult Detention Center', 'Hennepin County, Minnesota', 'Minneapolis', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Hennepin County Adult Detention Center'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://api.hennepincounty.gov/hcso-public-services-api/v1/JailRoster/Search',
    'official_county',
    'https://www.hennepinsheriff.org/jail-warrants/jail',
    'https://jailroster.hennepin.us/',
    'The Hennepin County Sheriff''s official Jail Roster site at jailroster.hennepin.us runs on this API. The adapter posts the in-custody search, reads each person''s detail record, keeps only people housed at the jail''s two buildings (Public Safety Facility and City Hall), keeps name, booking number, and charges from cases without a clear reason with their statutes, re-reads the list to confirm nothing changed during the crawl, and excludes ages, arresting and charging agencies, case numbers, bail options, court dates, inmate numbers, and photos.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only people the official Hennepin County jail roster shows in custody at the Adult Detention Center."}'::jsonb,
    'hennepin-county-mn-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://api.hennepincounty.gov/hcso-public-services-api/v1/JailRoster/Search';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'hennepin-county-mn-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
