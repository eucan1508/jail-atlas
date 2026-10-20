-- Provision Nobles County, Minnesota's official inmate listing without enabling publication.
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
  VALUES (v_state_id, 'Nobles County', 'nobles', 'Worthington', '/mn/nobles', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE
  SET "name" = EXCLUDED."name", "seat_city" = EXCLUDED."seat_city"
  RETURNING "id" INTO v_county_id;

  SELECT "id" INTO v_institution_id
  FROM "official_institutions"
  WHERE "county_id" = v_county_id
    AND "official_url" = 'https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/'
  ORDER BY "created_at" LIMIT 1;
  IF v_institution_id IS NULL THEN
    INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
    VALUES (
      v_county_id,
      'Nobles County Sheriff''s Office',
      'sheriff',
      'https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/',
      now()
    )
    RETURNING "id" INTO v_institution_id;
  END IF;

  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Nobles County Jail', 'Nobles County, Minnesota', 'Worthington', 'America/Chicago'
  WHERE NOT EXISTS (
    SELECT 1 FROM "facilities"
    WHERE "official_institution_id" = v_institution_id AND "name" = 'Nobles County Jail'
  );

  INSERT INTO "official_sources" (
    "official_institution_id", "source_url", "source_type", "official_institution_url",
    "relationship_evidence_url", "evidence_description", "parser_version", "source_status",
    "custody_data_scope", "retention_scope", "adapter_key", "publication_approved"
  )
  VALUES (
    v_institution_id,
    'https://ftp.co.nobles.mn.us/jail/Inmate_listing/inmate_listing.html',
    'official_county',
    'https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/',
    'https://www.co.nobles.mn.us/departments/sheriff/inmate-listing/',
    'The Nobles County Sheriff''s Inmate Listing page embeds this listing of everyone held at the Nobles County Jail. The adapter reads the listing, refuses it if its Last Updated stamp is more than two days old, if the page is cut off, or if the records carry mismatched stamps, keeps each person''s name and every charge with its level, and excludes photos, booking dates, and arresting agencies.',
    '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[],
    '{"kind":"current_only","description":"Retain only people listed on the current official Nobles County Inmate Listing."}'::jsonb,
    'nobles-county-mn-current-roster', false
  )
  ON CONFLICT ("source_url") DO NOTHING
  RETURNING "id" INTO v_source_id;
  IF v_source_id IS NULL THEN
    SELECT "id" INTO v_source_id FROM "official_sources"
    WHERE "source_url" = 'https://ftp.co.nobles.mn.us/jail/Inmate_listing/inmate_listing.html';
  END IF;

  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'nobles-county-mn-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
