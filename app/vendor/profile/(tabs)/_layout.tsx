// app/vendor/profile/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

function CircleTab({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={[styles.circle, focused && styles.circleActive]}>
      <Text style={[styles.circleText, focused && styles.circleTextActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function VendorProfileTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <CircleTab label="SETTINGS" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          tabBarIcon: ({ focused }) => (
            <CircleTab label="PRODUCTS" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <CircleTab label="ORDERS" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: "#FFFFFF",
  black: "#000000",
};

const styles = StyleSheet.create({
  tabBar: {
    height: 66,
    paddingBottom: 0,
    paddingTop: 0,
    backgroundColor: stylesVars.cardBg,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
  },

  circle: {
    width: 112,
    height: 40,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  circleActive: {
    backgroundColor: stylesVars.blue,
  },

  circleText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  circleTextActive: {
    color: stylesVars.white,
  },
});
