import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Multi = string[];

export type FiltersState = {
  dressTypeId: string | null;
  dressTypeIds: Multi;

  fabricTypeIds: Multi;
  colorShadeIds: Multi;
  workTypeIds: Multi;
  workDensityIds: Multi;
  originCityIds: Multi;
  wearStateIds: Multi;
  priceBandIds: Multi;

  minCostPkr: number | null;
  maxCostPkr: number | null;

  vendorIds: Multi;
};

const initialState: FiltersState = {
  dressTypeId: null,
  dressTypeIds: [],

  fabricTypeIds: [],
  colorShadeIds: [],
  workTypeIds: [],
  workDensityIds: [],
  originCityIds: [],
  wearStateIds: [],
  priceBandIds: [],

  minCostPkr: null,
  maxCostPkr: null,

  vendorIds: []
};

function toggleId(arr: string[], id: string) {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

function clampCostRange(
  minCostPkr: number | null,
  maxCostPkr: number | null
): { minCostPkr: number | null; maxCostPkr: number | null } {
  if (minCostPkr === null || maxCostPkr === null) {
    return { minCostPkr, maxCostPkr };
  }

  if (minCostPkr <= maxCostPkr) {
    return { minCostPkr, maxCostPkr };
  }

  return { minCostPkr: maxCostPkr, maxCostPkr: minCostPkr };
}

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    resetAllFilters: () => initialState,

    setDressTypeId: (state, action: PayloadAction<string | null>) => {
      state.dressTypeId = action.payload;
      state.dressTypeIds =
        action.payload === null ? [] : [String(action.payload)];

      state.fabricTypeIds = [];
      state.colorShadeIds = [];
      state.workTypeIds = [];
      state.workDensityIds = [];
      state.originCityIds = [];
      state.wearStateIds = [];
      state.priceBandIds = [];

      state.minCostPkr = null;
      state.maxCostPkr = null;
    },

    setDressTypeIds: (state, action: PayloadAction<string[]>) => {
      state.dressTypeIds = action.payload ?? [];
      state.dressTypeId = state.dressTypeIds.length
        ? String(state.dressTypeIds[0])
        : null;

      state.fabricTypeIds = [];
      state.colorShadeIds = [];
      state.workTypeIds = [];
      state.workDensityIds = [];
      state.originCityIds = [];
      state.wearStateIds = [];
      state.priceBandIds = [];

      state.minCostPkr = null;
      state.maxCostPkr = null;
    },

    clearFabricTypes: (state) => {
      state.fabricTypeIds = [];
    },
    toggleFabricType: (state, action: PayloadAction<string>) => {
      state.fabricTypeIds = toggleId(state.fabricTypeIds, action.payload);
    },

    clearColorShades: (state) => {
      state.colorShadeIds = [];
    },
    toggleColorShade: (state, action: PayloadAction<string>) => {
      state.colorShadeIds = toggleId(state.colorShadeIds, action.payload);
    },

    clearWorkTypes: (state) => {
      state.workTypeIds = [];
    },
    toggleWorkType: (state, action: PayloadAction<string>) => {
      state.workTypeIds = toggleId(state.workTypeIds, action.payload);
    },

    clearWorkDensities: (state) => {
      state.workDensityIds = [];
    },
    toggleWorkDensity: (state, action: PayloadAction<string>) => {
      state.workDensityIds = toggleId(state.workDensityIds, action.payload);
    },

    clearOriginCities: (state) => {
      state.originCityIds = [];
    },
    toggleOriginCity: (state, action: PayloadAction<string>) => {
      state.originCityIds = toggleId(state.originCityIds, action.payload);
    },

    clearWearStates: (state) => {
      state.wearStateIds = [];
    },
    toggleWearState: (state, action: PayloadAction<string>) => {
      state.wearStateIds = toggleId(state.wearStateIds, action.payload);
    },

    clearPriceBands: (state) => {
      state.priceBandIds = [];
    },
    togglePriceBand: (state, action: PayloadAction<string>) => {
      state.priceBandIds = toggleId(state.priceBandIds, action.payload);
    },

    clearCostRange: (state) => {
      state.minCostPkr = null;
      state.maxCostPkr = null;
    },
    setCostRange: (
      state,
      action: PayloadAction<{
        minCostPkr: number | null;
        maxCostPkr: number | null;
      }>
    ) => {
      const nextMin = action.payload?.minCostPkr ?? null;
      const nextMax = action.payload?.maxCostPkr ?? null;
      const clamped = clampCostRange(nextMin, nextMax);
      state.minCostPkr = clamped.minCostPkr;
      state.maxCostPkr = clamped.maxCostPkr;
    },

    clearVendors: (state) => {
      state.vendorIds = [];
    },
    toggleVendor: (state, action: PayloadAction<string>) => {
      state.vendorIds = toggleId(state.vendorIds, action.payload);
    },
    setVendorIds: (state, action: PayloadAction<string[]>) => {
      state.vendorIds = action.payload ?? [];
    }
  }
});

export const {
  resetAllFilters,
  setDressTypeId,
  setDressTypeIds,

  clearFabricTypes,
  toggleFabricType,

  clearColorShades,
  toggleColorShade,

  clearWorkTypes,
  toggleWorkType,

  clearWorkDensities,
  toggleWorkDensity,

  clearOriginCities,
  toggleOriginCity,

  clearWearStates,
  toggleWearState,

  clearPriceBands,
  togglePriceBand,

  clearCostRange,
  setCostRange,

  clearVendors,
  toggleVendor,
  setVendorIds
} = filtersSlice.actions;

export default filtersSlice.reducer;