import { Text, View } from "react-native";
import { displayText } from "@/utils/buyer";
import { buyerProfileStyles as styles } from "./buyerProfileStyles";

type Props = {
  label: string;
  value: unknown;
};

export default function BuyerProfileField({ label, value }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayText(value)}</Text>
    </View>
  );
}
