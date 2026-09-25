-- Provision the audited Iowa launch sources without enabling publication.
-- A live health check must promote these rows before the worker can persist data.
DO $$
DECLARE
  v_ia_state_id uuid;
  v_county_id uuid;
  v_institution_id uuid;
  v_source_id uuid;
BEGIN
  INSERT INTO "states" ("code", "name", "slug", "default_locale", "publication_status")
  VALUES ('IA', 'Iowa', 'iowa', 'en-US', 'draft')
  ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "slug" = EXCLUDED."slug"
  RETURNING "id" INTO v_ia_state_id;
  IF v_ia_state_id IS NULL THEN
    SELECT "id" INTO v_ia_state_id FROM "states" WHERE "code" = 'IA';
  END IF;

  -- Dallas County
  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_ia_state_id, 'Dallas County', 'dallas', 'Adel', '/ia/dallas', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE SET "name" = EXCLUDED."name"
  RETURNING "id" INTO v_county_id;
  IF v_county_id IS NULL THEN SELECT "id" INTO v_county_id FROM "counties" WHERE "state_id" = v_ia_state_id AND "slug" = 'dallas'; END IF;
  INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
  SELECT v_county_id, 'Dallas County Sheriff', 'sheriff', 'https://www.dallascountyiowa.gov/365/Inmate-Search', now()
  WHERE NOT EXISTS (SELECT 1 FROM "official_institutions" WHERE "county_id" = v_county_id AND "official_url" = 'https://www.dallascountyiowa.gov/365/Inmate-Search');
  SELECT "id" INTO v_institution_id FROM "official_institutions" WHERE "county_id" = v_county_id AND "official_url" = 'https://www.dallascountyiowa.gov/365/Inmate-Search' ORDER BY "created_at" LIMIT 1;
  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Dallas County Jail', 'Dallas County, Iowa', 'Adel', 'America/Chicago'
  WHERE NOT EXISTS (SELECT 1 FROM "facilities" WHERE "official_institution_id" = v_institution_id AND "name" = 'Dallas County Jail');
  INSERT INTO "official_sources" ("official_institution_id", "source_url", "source_type", "official_institution_url", "relationship_evidence_url", "evidence_description", "parser_version", "source_status", "custody_data_scope", "retention_scope", "adapter_key", "publication_approved")
  VALUES (v_institution_id, 'https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True', 'officially_linked_vendor', 'https://www.dallascountyiowa.gov/365/Inmate-Search', 'https://www.dallascountyiowa.gov/365/Inmate-Search', 'Official Dallas County page links to the current custody roster.', '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[], '{"kind":"current_only","description":"Retain only the current-custody snapshot."}'::jsonb, 'dallas-newworld-inmate-inquiry', false)
  ON CONFLICT ("source_url") DO NOTHING;
  SELECT "id" INTO v_source_id FROM "official_sources" WHERE "source_url" = 'https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True';
  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'dallas-newworld-inmate-inquiry', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;

  -- Cedar County
  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_ia_state_id, 'Cedar County', 'cedar', 'Tipton', '/ia/cedar', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE SET "name" = EXCLUDED."name"
  RETURNING "id" INTO v_county_id;
  IF v_county_id IS NULL THEN SELECT "id" INTO v_county_id FROM "counties" WHERE "state_id" = v_ia_state_id AND "slug" = 'cedar'; END IF;
  INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
  SELECT v_county_id, 'Cedar County Sheriff', 'sheriff', 'https://cedarcounty.iowa.gov/sheriff/', now()
  WHERE NOT EXISTS (SELECT 1 FROM "official_institutions" WHERE "county_id" = v_county_id AND "official_url" = 'https://cedarcounty.iowa.gov/sheriff/');
  SELECT "id" INTO v_institution_id FROM "official_institutions" WHERE "county_id" = v_county_id AND "official_url" = 'https://cedarcounty.iowa.gov/sheriff/' ORDER BY "created_at" LIMIT 1;
  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Cedar County Jail', 'Cedar County, Iowa', 'Tipton', 'America/Chicago'
  WHERE NOT EXISTS (SELECT 1 FROM "facilities" WHERE "official_institution_id" = v_institution_id AND "name" = 'Cedar County Jail');
  INSERT INTO "official_sources" ("official_institution_id", "source_url", "source_type", "official_institution_url", "relationship_evidence_url", "evidence_description", "parser_version", "source_status", "custody_data_scope", "retention_scope", "adapter_key", "publication_approved")
  VALUES (v_institution_id, 'https://cedarcounty.iowa.gov/sheriff/inmate_roster/', 'official_sheriff', 'https://cedarcounty.iowa.gov/sheriff/', 'https://cedarcounty.iowa.gov/sheriff/', 'Official Cedar County Sheriff roster page.', '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[], '{"kind":"current_only","description":"Retain only the current-custody snapshot."}'::jsonb, 'cedar-county-iowa-current-roster', false)
  ON CONFLICT ("source_url") DO NOTHING;
  SELECT "id" INTO v_source_id FROM "official_sources" WHERE "source_url" = 'https://cedarcounty.iowa.gov/sheriff/inmate_roster/';
  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'cedar-county-iowa-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;

  -- Black Hawk County
  INSERT INTO "counties" ("state_id", "name", "slug", "seat_city", "canonical_path", "publication_status")
  VALUES (v_ia_state_id, 'Black Hawk County', 'black-hawk', 'Waterloo', '/ia/black-hawk', 'draft')
  ON CONFLICT ("state_id", "slug") DO UPDATE SET "name" = EXCLUDED."name"
  RETURNING "id" INTO v_county_id;
  IF v_county_id IS NULL THEN SELECT "id" INTO v_county_id FROM "counties" WHERE "state_id" = v_ia_state_id AND "slug" = 'black-hawk'; END IF;
  INSERT INTO "official_institutions" ("county_id", "name", "kind", "official_url", "verified_at")
  SELECT v_county_id, 'Black Hawk County Sheriff', 'sheriff', 'https://www.bhcso.org/whos-in-jail', now()
  WHERE NOT EXISTS (SELECT 1 FROM "official_institutions" WHERE "county_id" = v_county_id AND "official_url" = 'https://www.bhcso.org/whos-in-jail');
  SELECT "id" INTO v_institution_id FROM "official_institutions" WHERE "county_id" = v_county_id AND "official_url" = 'https://www.bhcso.org/whos-in-jail' ORDER BY "created_at" LIMIT 1;
  INSERT INTO "facilities" ("county_id", "official_institution_id", "name", "jurisdiction_label", "city", "timezone")
  SELECT v_county_id, v_institution_id, 'Black Hawk County Jail', 'Black Hawk County, Iowa', 'Waterloo', 'America/Chicago'
  WHERE NOT EXISTS (SELECT 1 FROM "facilities" WHERE "official_institution_id" = v_institution_id AND "name" = 'Black Hawk County Jail');
  INSERT INTO "official_sources" ("official_institution_id", "source_url", "source_type", "official_institution_url", "relationship_evidence_url", "evidence_description", "parser_version", "source_status", "custody_data_scope", "retention_scope", "adapter_key", "publication_approved")
  VALUES (v_institution_id, 'https://www.bhcso.org/whos-in-jail', 'official_sheriff', 'https://www.bhcso.org/whos-in-jail', 'https://www.bhcso.org/whos-in-jail', 'Official Black Hawk County Sheriff current custody page.', '1.0.0', 'verification_pending', ARRAY['current_custody']::custody_data_scope[], '{"kind":"current_only","description":"Retain only the current-custody snapshot."}'::jsonb, 'black-hawk-county-iowa-current-roster', false)
  ON CONFLICT ("source_url") DO NOTHING;
  SELECT "id" INTO v_source_id FROM "official_sources" WHERE "source_url" = 'https://www.bhcso.org/whos-in-jail';
  INSERT INTO "source_adapters" ("source_id", "adapter_key", "adapter_version", "parser_version", "enabled")
  VALUES (v_source_id, 'black-hawk-county-iowa-current-roster', '1.0.0', '1.0.0', false)
  ON CONFLICT ("source_id", "adapter_version") DO NOTHING;
END $$;
