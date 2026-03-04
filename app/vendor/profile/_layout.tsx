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
        <Tabs.Screen name="view-product" options={{ href: null }} />
        <Tabs.Screen name="view-profile" options={{ href: null }} />
        <Tabs.Screen name="add-product_legacy" options={{ href: null }} />
        <Tabs.Screen name="edit-vendor" options={{ href: null }} />

        {/* IMPORTANT: HIDE THE add-product FOLDER ROUTE (prevents the extra "X" tab) */}
        <Tabs.Screen name="add-product" options={{ href: null }} />

        {/* HIDE MODALS GROUP */}
        <Tabs.Screen name="(product-modals)" options={{ href: null }} />
      </Tabs>
    </ProductDraftProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 66,
    paddingBottom: 0,
    paddingTop: 0
  },

  circle: {
    width: 112,
    height: 40,
    borderRadius: 24,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center"
  },

  circleActive: {
    backgroundColor: "#0b2f6b"
  },

  circleText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#333"
  },

  circleTextActive: {
    color: "#fff"
  }
});