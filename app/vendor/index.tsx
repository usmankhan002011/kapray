import React from "react";
import { Redirect } from "expo-router";
import { useAppSelector } from "@/store/hooks";

export default function VendorIndexScreen() {
  const vendor = useAppSelector((s) => s.vendor);

  const isAuthenticatedVendor = Boolean(vendor?.auth_user_id);
  const hasShop = vendor?.has_shop;

  if (!isAuthenticatedVendor) {
    return <Redirect href="/vendor/signin" />;
  }

  if (!hasShop) {
    return <Redirect href="/vendor/create-shop" />;
  }

  return <Redirect href="/vendor/profile/settings" />;
}
