import { configureStore } from "@reduxjs/toolkit";
import filtersReducer from "./filtersSlice";
import vendorReducer from "./vendorSlice";

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    vendor: vendorReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
