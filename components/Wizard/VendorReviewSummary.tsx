import {
  prettyNameFromPicked,
  VendorWizardData,
} from "@/utils/helpers/wizardHelpers";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  form: VendorWizardData;
  jumpToStep: (index: number) => void;
}

function joinOrDash(items?: string[]) {
  return items && items.length ? items.join(", ") : "—";
}

export default function VendorReviewSummary({ form, jumpToStep }: Props) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.card} onPress={() => jumpToStep(0)}>
        <Text style={styles.title}>Owner</Text>
        <Text style={styles.value}>{form.ownerName || "—"}</Text>
        <Text style={styles.edit}>Edit</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => jumpToStep(1)}>
        <Text style={styles.title}>Email</Text>
        <Text style={styles.value}>{form.email || "—"}</Text>
        <Text style={styles.edit}>Edit</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => jumpToStep(2)}>
        <Text style={styles.title}>Mobile</Text>
        <Text style={styles.value}>{form.mobile || "—"}</Text>
        <Text style={styles.edit}>Edit</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => jumpToStep(3)}>
        <Text style={styles.title}>Shop name</Text>
        <Text style={styles.value}>{form.shopName || "—"}</Text>
        <Text style={styles.edit}>Edit</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => jumpToStep(4)}>
        <Text style={styles.title}>Address</Text>
        <Text style={styles.value}>{form.address || "—"}</Text>
        <Text style={styles.edit}>Edit</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => jumpToStep(5)}>
        <Text style={styles.title}>Map location</Text>
        <Text style={styles.value}>{form.locationUrl || "—"}</Text>
        <Text style={styles.edit}>Edit</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => jumpToStep(6)}>
        <Text style={styles.title}>Tailoring and export services</Text>

        <Text style={styles.value}>
          Tailoring:{" "}
          {form.offersTailoring ? "Yes, tailoring available" : "No tailoring service"}
        </Text>

        {form.offersTailoring ? (
          <>
            <Text style={styles.value}>
              Blouse neck: {joinOrDash(form.tailoringOptions?.blouse_neck)}
            </Text>
            <Text style={styles.value}>
              Sleeves: {joinOrDash(form.tailoringOptions?.sleeves)}
            </Text>
            <Text style={styles.value}>
              Trouser: {joinOrDash(form.tailoringOptions?.trouser)}
            </Text>
          </>
        ) : null}

        <Text style={styles.value}>
          Export: {form.exportsEnabled ? "Yes" : "No"}
        </Text>

        {form.exportsEnabled ? (
          <Text style={styles.value}>
            Export regions: {joinOrDash(form.exportRegions)}
          </Text>
        ) : null}

        <Text style={styles.edit}>Edit</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => jumpToStep(7)}>
        <Text style={styles.title}>Media</Text>

        <Text style={styles.value}>
          Profile:{" "}
          {form.profile
            ? prettyNameFromPicked(form.profile, "profile")
            : "None"}
        </Text>

        <Text style={styles.value}>
          Permission:{" "}
          {form.govPermission
            ? prettyNameFromPicked(form.govPermission, "permission")
            : "None"}
        </Text>

        <Text style={styles.value}>
          Banner:{" "}
          {form.banner ? prettyNameFromPicked(form.banner, "banner") : "None"}
        </Text>

        <Text style={styles.value}>Shop images: {form.images.length}</Text>
        <Text style={styles.value}>Shop videos: {form.videos.length}</Text>

        <Text style={styles.edit}>Edit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },

    elevation: 2,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },

  value: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 3,
    lineHeight: 20,
  },

  edit: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
});