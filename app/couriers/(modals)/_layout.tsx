import React from "react";
import { Stack } from "expo-router";

export default function CouriersModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerTitleAlign: "center"
      }}
    >
      <Stack.Screen name="courier-list_modal" options={{ title: "Select Courier" }} />
    </Stack>
  );
}
