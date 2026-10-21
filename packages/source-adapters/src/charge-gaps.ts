/**
 * Someone booked a few minutes ago can be listed before their charges are entered, so a roster may
 * hold a few people without charges. When more than that are missing them, the page itself broke.
 */
export function assertFewWithoutCharges(withoutCharges: number, total: number): void {
  if (withoutCharges > Math.max(2, Math.floor(total * 0.1))) throw new Error("CHARGES_MISSING");
}
