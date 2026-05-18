// app/(tabs)/flow/orders/track.tsx
import React, { useCallback, useEffect } from "react";
import { BackHandler } from "react-native";
import { useRouter } from "expo-router";

import TrackOrdersScreen from "../../../orders/track";

export default function FlowTrackOrdersScreen() {
  const router = useRouter();

  const goHome = useCallback(() => {
    router.replace("/(tabs)" as any);
    return true;
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goHome);

    return () => sub.remove();
  }, [goHome]);

  return <TrackOrdersScreen />;
}
