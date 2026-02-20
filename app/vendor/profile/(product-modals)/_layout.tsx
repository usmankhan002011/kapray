import React from "react";
import { Stack } from "expo-router";

export default function ProductModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerShown: false
      }}
    />
  );
}
