import { Stack } from "expo-router";

import { ProductDraftProvider } from "@/components/product/ProductDraftContext";

export default function VendorProfileLayout() {
  return (
    <ProductDraftProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(product-modals)"
          options={{ presentation: "modal" }}
        />
      </Stack>
    </ProductDraftProvider>
  );
}
