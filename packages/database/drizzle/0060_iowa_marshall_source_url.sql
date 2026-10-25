-- Record Marshall County's jail portal at the Inmates page the Sheriff's site links. The portal
-- routes that page in the browser, so its bare /inmates path answers 404.
UPDATE "official_sources"
SET "source_url" = 'https://marshall-so-ia.zuercherportal.com/#/inmates'
WHERE "source_url" = 'https://marshall-so-ia.zuercherportal.com/inmates'
  AND "adapter_key" = 'marshall-county-iowa-current-roster';
