-- Provision Johnson County's official jail roster without enabling publication.
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
  VALUES (v_state_id, 'Johnson County', 'johnson', 'Iowa City', '/ia/johnson', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://johnsoncountyiowa.gov/sheriff/jail-division'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Johnson County Sheriff''s Office',
      'sheriff',
      'https://johnsoncountyiowa.gov/sheriff/jail-division',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Johnson County Jail', 'Johnson County, Iowa', 'Iowa City', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Johnson County Jail'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://ww1.johnsoncountyiowa.gov/Sheriff/jailroster/list',
    'official_county',
    'https://johnsoncountyiowa.gov/sheriff/jail-division',
    'https://johnsoncountyiowa.gov/office-of-sheriff',
    'The Johnson County Sheriff''s Office page links this jail roster, which lists people in the Sheriff''s custody. The adapter keeps only people with no release date who are housed at the Johnson County Jail, requires each detail page to name the listed person and keep the expected charge layout, and requires the list to be unchanged after every detail is read; it keeps the name and pending charges with their Iowa Code sections and excludes age, home address, physical description, arresting agency, cause numbers, and bond.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only people the current official jail roster shows in custody at the Johnson County Jail."}'::jsonb,
    'johnson-county-iowa-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://ww1.johnsoncountyiowa.gov/Sheriff/jailroster/list';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'johnson-county-iowa-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
