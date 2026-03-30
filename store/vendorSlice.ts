// File: store/vendorSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type VendorTailoringOptions = {
  blouse_neck: string[];
  sleeves: string[];
  trouser: string[];
};

export type VendorState = {
  // Core identifiers
  id: number | null;
  created_at: string | null;
  owner_user_id: string | null;
  auth_user_id: string | null;

  // DB fields (match public.vendor columns)
  name: string | null;
  email: string | null;
  mobile: string | null;
  landline: string | null;

  shop_name: string | null;
  address: string | null;
  location_url: string | null;

  profile_image_path: string | null;
  banner_path: string | null;
  certificate_paths: string[] | null;
  shop_image_paths: string[] | null;
  shop_video_paths: string[] | null;

  offers_tailoring: boolean | null;
  exports_enabled: boolean | null;
  export_regions: string[];
  tailoring_options: VendorTailoringOptions;

  status: string | null;

  // Optional/legacy / UI aliases (keep so other screens don’t break)
  owner_name: string | null;
  government_permission_url: string | null;
  banner_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  image: string | null;

  // legacy
  location: string | null;
};

const EMPTY_TAILORING_OPTIONS: VendorTailoringOptions = {
  blouse_neck: [],
  sleeves: [],
  trouser: [],
};

const initialState: VendorState = {
  id: null,
  created_at: null,
  owner_user_id: null,
  auth_user_id: null,

  name: null,
  email: null,
  mobile: null,
  landline: null,

  shop_name: null,
  address: null,
  location_url: null,

  profile_image_path: null,
  banner_path: null,
  certificate_paths: null,
  shop_image_paths: null,
  shop_video_paths: null,

  offers_tailoring: null,
  exports_enabled: false,
  export_regions: [],
  tailoring_options: EMPTY_TAILORING_OPTIONS,

  status: null,

  // aliases
  owner_name: null,
  government_permission_url: null,
  banner_url: null,
  images: null,
  videos: null,
  image: null,

  // legacy
  location: null,
};

const vendorSlice = createSlice({
  name: "vendor",
  initialState,
  reducers: {
    setSelectedVendor(state, action: PayloadAction<Partial<VendorState>>) {
      const next: VendorState = {
        ...state,
        ...action.payload,
        export_regions: action.payload.export_regions ?? state.export_regions,
        tailoring_options:
          action.payload.tailoring_options ?? state.tailoring_options,
      };

      // Keep aliases in sync (so old UI code keeps working)
      if (next.owner_name == null && next.name != null) {
        next.owner_name = next.name;
      }
      if (next.banner_url == null && next.banner_path != null) {
        next.banner_url = next.banner_path;
      }
      if (next.images == null && next.shop_image_paths != null) {
        next.images = next.shop_image_paths;
      }
      if (next.videos == null && next.shop_video_paths != null) {
        next.videos = next.shop_video_paths;
      }
      if (next.image == null && next.profile_image_path != null) {
        next.image = next.profile_image_path;
      }

      if (!next.export_regions) {
        next.export_regions = [];
      }

      if (!next.tailoring_options) {
        next.tailoring_options = EMPTY_TAILORING_OPTIONS;
      }

      return next;
    },
    clearSelectedVendor() {
      return initialState;
    },
  },
});

export const { setSelectedVendor, clearSelectedVendor } = vendorSlice.actions;

export default vendorSlice.reducer;