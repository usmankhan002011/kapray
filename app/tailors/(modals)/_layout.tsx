import React from "react";
import { Stack } from "expo-router";

export default function TailorsModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerTitleAlign: "center"
      }}
    >
      <Stack.Screen name="tailor-list_modal" options={{ title: "Select Tailor" }} />
      <Stack.Screen name="size_modal" options={{ title: "Select Size" }} />
    </Stack>
  );
}
