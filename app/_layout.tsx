import { Stack } from "expo-router";
import "react-native-reanimated";

import { store } from "@/store";
import { Provider } from "react-redux";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AppStarter from "@/components/AppStarter";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppStarter />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />

            <Stack.Screen
              name="results-filters"
              options={{ presentation: "modal", title: "Filters" }}
            />
          </Stack>
        </SafeAreaView>
      </SafeAreaProvider>
    </Provider>
  );
}
