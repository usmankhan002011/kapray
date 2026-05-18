import { configureStore } from "@reduxjs/toolkit";
import filtersReducer from "./filtersSlice";
import vendorReducer from "./vendorSlice";
import buyerReducer from "./buyerSlice";

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    vendor: vendorReducer,
    buyer: buyerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
