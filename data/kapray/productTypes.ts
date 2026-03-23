export type ProductCategory =
  | 'stitched_ready'
  | 'unstitched_plain'
  | 'unstitched_dyeing'
  | 'unstitched_dyeing_tailoring';

export type PriceMode =
  | 'stitched_total'
  | 'unstitched_per_meter';

export type UnstitchedSizeKey =
  | 'XS'
  | 'S'
  | 'M'
  | 'L'
  | 'XL'
  | 'XXL';

export type ExportRegion =
  | 'UK'
  | 'USA'
  | 'EUROPE'
  | 'CANADA'
  | 'KSA'
  | 'UAE'
  | 'AUSTRALIA';

export type PakistanCity =
  | 'Karachi'
  | 'Lahore'
  | 'Islamabad'
  | 'Rawalpindi'
  | 'Faisalabad'
  | 'Multan'
  | 'Peshawar'
  | 'Hyderabad'
  | 'Sialkot'
  | 'Gujranwala';

export type TailoringGroup =
  | 'blouse_neck'
  | 'sleeves'
  | 'trouser';

export type CourierScope =
  | 'inland'
  | 'international';

export type SizeLengthMap = Partial<Record<UnstitchedSizeKey, number>>;

export interface PackageDimensionsCm {
  length: number;
  width: number;
  height: number;
}

export interface CourierSlab {
  upToKg: number;
  costPkr: number;
}

export interface ProductShippingMeta {
  weightKg: number;
  packageCm: PackageDimensionsCm;
}

export interface DeliveryQuoteInput {
  weightKg: number;
  scope: CourierScope;
  regionOrCity: string;
}

export const UNSTITCHED_SIZE_KEYS: UnstitchedSizeKey[] = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'stitched_ready',
  'unstitched_plain',
  'unstitched_dyeing',
  'unstitched_dyeing_tailoring',
];

export function isUnstitchedCategory(category?: string | null): boolean {
  return category === 'unstitched_plain'
    || category === 'unstitched_dyeing'
    || category === 'unstitched_dyeing_tailoring';
}

export function isStitchedCategory(category?: string | null): boolean {
  return category === 'stitched_ready';
}

export function supportsTailoringByCategory(category?: string | null): boolean {
  return category === 'unstitched_dyeing_tailoring';
}