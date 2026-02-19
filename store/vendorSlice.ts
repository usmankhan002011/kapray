import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type VendorState = {
  // Core identifiers
  id: number | null;
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

  status: string | null;

  // Optional/legacy / UI aliases (keep so other screens don’t break)
  owner_name: string | null;
  government_permission_url: string | null;
  banner_url: string | null;
  images: string[] | null;
  videos: string[] | null;

  // legacy
  location: string | null;
};

const initialState: VendorState = {
  id: null,
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

  status: null,

  // aliases
  owner_name: null,
  government_permission_url: null,
  banner_url: null,
  images: null,
  videos: null,

  // legacy
  location: null
};

const vendorSlice = createSlice({
  name: "vendor",
  initialState,
  reducers: {
    setSelectedVendor(state, action: PayloadAction<Partial<VendorState>>) {
      const next = { ...state, ...action.payload };

      // Keep aliases in sync (so old UI code keeps working)
      if (next.owner_name == null && next.name != null) next.owner_name = next.name;
      if (next.banner_url == null && next.banner_path != null) next.banner_url = next.banner_path;
      if (next.images == null && next.shop_image_paths != null) next.images = next.shop_image_paths;
      if (next.videos == null && next.shop_video_paths != null) next.videos = next.shop_video_paths;

      return next;
    },
    clearSelectedVendor() {
      return initialState;
    }
  }
});

export const { setSelectedVendor, clearSelectedVendor } = vendorSlice.actions;

export default vendorSlice.reducer;
