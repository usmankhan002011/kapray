import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: "#1565FF",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarButton: HapticTab,

        tabBarStyle: {
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "rgba(21,101,255,0.10)",

          shadowColor: "#1565FF",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 14,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "900",
          marginTop: -2,
        },

        tabBarItemStyle: {
          paddingVertical: 4,
          borderRadius: 18,
          marginHorizontal: 6,
        },

        tabBarActiveBackgroundColor: "rgba(21,101,255,0.10)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 30 : 27}
              name="house.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="shops"
        options={{
          title: "Vendors",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 30 : 27}
              name="bag.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="flow"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
