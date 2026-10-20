// Software this dashboard licenses (safe to import in client components: no secrets, no crypto).
// JharLab keys stay "MACHINE_ID|EXPIRY" (every key already in the field); MedBilling keys end in "|MEDBILLING",
// so a key made for one app is refused by the other.
export const PRODUCTS = {
  pathlab: { label: 'JharLab Pathology', short: 'JharLab', tag: '' },
  medbilling: { label: 'MedBilling Clinic', short: 'MedBilling', tag: 'MEDBILLING' },
} as const;
export type Product = keyof typeof PRODUCTS;

// Rows made before the product column existed are JharLab licences.
export const toProduct = (p: unknown): Product => (p === 'medbilling' ? 'medbilling' : 'pathlab');
