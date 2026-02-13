import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type VendorState = {
  shop_name: string | null;
  owner_name: string | null;

  mobile: string | null;
  landline: string | null;

  address: string | null;
  location_url: string | null;

  government_permission_url: string | null;

  banner_url: string | null;
  images: string[] | null;
  videos: string[] | null;

  status: string | null;
};

const initialState: VendorState = {
  shop_name: null,
  owner_name: null,

  mobile: null,
  landline: null,

  address: null,
  location_url: null,

  government_permission_url: null,

  banner_url: null,
  images: null,
  videos: null,

  status: null
};

const vendorSlice = createSlice({
  name: "vendor",
  initialState,
  reducers: {
    setSelectedVendor(state, action: PayloadAction<Partial<VendorState>>) {
      return { ...state, ...action.payload };
    },
    clearSelectedVendor() {
      return initialState;
    }
  }
});

export const { setSelectedVendor, clearSelectedVendor } =
  vendorSlice.actions;

export default vendorSlice.reducer;
