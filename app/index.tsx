import { useRouter } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

export default function MainPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Kapray</Text>
      <Button
        title="Login as User"
        onPress={() => router.push("/(tabs)?role=user")}
      />
      <View style={{ height: 20 }} />
      <Button
        title="Login as Venue"
        onPress={() => router.push("/(tabs)?role=venue")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
  },
});
