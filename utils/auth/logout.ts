import { supabase } from "@/utils/supabase/client";
import { AppDispatch } from "@/store";
import { clearBuyer } from "@/store/buyerSlice";
import { clearSelectedVendor } from "@/store/vendorSlice";

export async function logoutBuyer(dispatch: AppDispatch) {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Buyer logout error:", e);
  } finally {
    dispatch(clearBuyer());
    dispatch(clearSelectedVendor());
  }
}

export async function logoutVendor(dispatch: AppDispatch) {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Vendor logout error:", e);
  } finally {
    dispatch(clearSelectedVendor());
    dispatch(clearBuyer());
  }
}
