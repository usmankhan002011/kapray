import React from "react";
import { Stack } from "expo-router";

export default function PurchaseLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="size"
        options={{
          title: "Select Size",
          presentation: "modal"
        }}
      />
      <Stack.Screen
        name="place-order"
        options={{
          title: "Place Order"
        }}
      />
    </Stack>
  );
}
