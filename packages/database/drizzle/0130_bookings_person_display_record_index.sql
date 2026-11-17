-- Deleting a person display record cascades to bookings by person_display_record_id; without this
-- index every such delete scanned the whole bookings table, which made snapshot pruning take hours.
CREATE INDEX IF NOT EXISTS "bookings_person_display_record_idx" ON "bookings" ("person_display_record_id");
