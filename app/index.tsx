import { Href, useRouter } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";
import { useAppSelector } from "@/store/hooks";

export default function MainPage() {
  const router = useRouter();

  const buyer = useAppSelector((s) => s.buyer);
  const vendor = useAppSelector((s) => s.vendor);

  const buyerLoggedIn = Boolean(buyer?.isAuthenticated);
  const vendorLoggedIn = Boolean(vendor?.auth_user_id);

  const continueLabel = buyerLoggedIn
    ? "Continue as Buyer"
    : vendorLoggedIn
      ? "Continue to Shopping"
      : "Continue as Guest";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Kapray</Text>

      <Button
        title={continueLabel}
        onPress={() => router.replace("/(tabs)" as Href)}
      />

      <View style={{ height: 20 }} />

      {!buyerLoggedIn && !vendorLoggedIn ? (
        <>
          <Button
            title="Login as Buyer"
            onPress={() => router.push("/(auth)/buyer/signin" as Href)}
          />
          <View style={{ height: 20 }} />

          <Button
            title="Login as Vendor"
            onPress={() => router.push("/(auth)/vendor/signin" as Href)}
          />
        </>
      ) : null}

      {vendorLoggedIn ? (
        <>
          <View style={{ height: 20 }} />
          <Button
            title="Open Vendor Dashboard"
            onPress={() => router.replace("/vendor" as Href)}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
  },
});
