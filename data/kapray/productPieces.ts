export const READY_PIECE_COUNTS = [1, 2, 3, 4, 5] as const;

export const READY_STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export type ReadyPieceCount = (typeof READY_PIECE_COUNTS)[number];
export type ReadyStandardSize = (typeof READY_STANDARD_SIZES)[number];
