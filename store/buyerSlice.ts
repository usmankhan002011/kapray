import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type BuyerState = {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: "buyer" | null;
  isAuthenticated: boolean;
};

const initialState: BuyerState = {
  userId: null,
  email: null,
  name: null,
  role: null,
  isAuthenticated: false,
};

const buyerSlice = createSlice({
  name: "buyer",
  initialState,
  reducers: {
    setBuyer(state, action: PayloadAction<Partial<BuyerState>>) {
      state.userId = action.payload.userId ?? state.userId;
      state.email = action.payload.email ?? state.email;
      state.name = action.payload.name ?? state.name;
      state.role =
        (action.payload.role as BuyerState["role"] | undefined) ?? state.role;
      state.isAuthenticated =
        action.payload.isAuthenticated ??
        Boolean(action.payload.userId ?? state.userId);
    },
    clearBuyer() {
      return initialState;
    },
  },
});

export const { setBuyer, clearBuyer } = buyerSlice.actions;
export default buyerSlice.reducer;
