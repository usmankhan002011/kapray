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

        {/* SETTINGS TAB */}
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <CircleTab label="SETTINGS" focused={focused} />
            )
          }}
        />

        {/* HIDE ALL OTHER FILES */}
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="view-profile" options={{ href: null }} />
        <Tabs.Screen name="update" options={{ href: null }} />
        <Tabs.Screen name="confirmation" options={{ href: null }} />

        {/* HIDE PRODUCT MODALS GROUP */}
        <Tabs.Screen name="(product-modals)" options={{ href: null }} />

        {/* HIDE ADD PRODUCT SCREEN (opened from products tab) */}
        <Tabs.Screen name="add-product" options={{ href: null }} />
      </Tabs>
    </ProductDraftProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 80,
    paddingBottom: 15,
    paddingTop: 10
  },

  circle: {
    width: 130,
    height: 46,
    borderRadius: 30,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center"
  },

  circleActive: {
    backgroundColor: "#0b2f6b"
  },

  circleText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#333"
  },

  circleTextActive: {
    color: "#fff"
  }
});
