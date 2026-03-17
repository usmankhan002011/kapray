// app/vendor/profile/_layout.tsx
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { ProductDraftProvider } from "@/components/product/ProductDraftContext";

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
    <ProductDraftProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar
        }}
      >
        {/* PRODUCTS TAB */}
        <Tabs.Screen
          name="products"
          options={{
            tabBarIcon: ({ focused }) => (
              <CircleTab label="PRODUCTS" focused={focused} />
            )
          }}
        />

        {/* ORDERS TAB */}
        <Tabs.Screen
          name="orders"
          options={{
            tabBarIcon: ({ focused }) => (
              <CircleTab label="ORDERS" focused={focused} />
            )
          }}
        />

        {/* SETTINGS TAB */}
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <CircleTab label="SETTINGS" focused={focused} />
            )
          }}
        />

        {/* HIDE NON-TAB SCREENS */}
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="update-product" options={{ href: null }} />
        <Tabs.Screen name="view-profile" options={{ href: null }} />
        <Tabs.Screen name="add-product_legacy" options={{ href: null }} />
        <Tabs.Screen name="edit-vendor" options={{ href: null }} />
        <Tabs.Screen name="view-product_legacy" options={{ href: null }} />
        <Tabs.Screen name="view-product_legacy_2" options={{ href: null }} />

        {/* HIDE FOLDER/GROUP ROUTES */}
        <Tabs.Screen name="add-product" options={{ href: null }} />
        <Tabs.Screen name="(product-modals)" options={{ href: null }} />

        {/* HIDE VIEW-PRODUCT ROUTE */}
        <Tabs.Screen name="view-product/index" options={{ href: null }} />
      </Tabs>
    </ProductDraftProvider>
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
  black: "#000000"
};

const styles = StyleSheet.create({
  tabBar: {
    height: 66,
    paddingBottom: 0,
    paddingTop: 0,
    backgroundColor: stylesVars.cardBg,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border
  },

  circle: {
    width: 112,
    height: 40,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  circleActive: {
    backgroundColor: stylesVars.blue
  },

  circleText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue
  },

  circleTextActive: {
    color: stylesVars.white
  }
});