import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  apColors,
  apRadii,
  apSpacing,
} from "@/components/product/addProductStyles";
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

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const EMPTY = "-";

function textOrEmpty(value?: string | null) {
  const text = String(value ?? "").trim();
  return text || EMPTY;
}

function joinOrEmpty(items?: string[]) {
  return items && items.length ? items.join(", ") : EMPTY;
}

function countText(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconBadge}>
        <MaterialIcons name={icon} size={18} color={apColors.blue} />
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={2}>
          {value}
        </Text>
      </View>

      <View style={styles.editBadge}>
        <MaterialIcons name="edit" size={15} color={apColors.blue} />
      </View>
    </Pressable>
  );
}

export default function VendorReviewSummary({ form, jumpToStep }: Props) {
  return (
    <View style={styles.container}>
      <ReviewSection title="Contact">
        <ReviewRow
          icon="person"
          label="Owner"
          value={textOrEmpty(form.ownerName)}
          onPress={() => jumpToStep(0)}
        />
        <ReviewRow
          icon="email"
          label="Email"
          value={textOrEmpty(form.email)}
          onPress={() => jumpToStep(1)}
        />
        <ReviewRow
          icon="phone"
          label="Mobile"
          value={textOrEmpty(form.mobile)}
          onPress={() => jumpToStep(2)}
        />
      </ReviewSection>

      <ReviewSection title="Shop">
        <ReviewRow
          icon="storefront"
          label="Shop name"
          value={textOrEmpty(form.shopName)}
          onPress={() => jumpToStep(3)}
        />
        <ReviewRow
          icon="place"
          label="Address"
          value={textOrEmpty(form.address)}
          onPress={() => jumpToStep(4)}
        />
        <ReviewRow
          icon="map"
          label="Map"
          value={textOrEmpty(form.locationUrl)}
          onPress={() => jumpToStep(5)}
        />
      </ReviewSection>

      <ReviewSection title="Services">
        <ReviewRow
          icon="format-color-fill"
          label="Dyeing"
          value={form.offersDyeing ? "Yes" : "No"}
          onPress={() => jumpToStep(6)}
        />
        <ReviewRow
          icon="content-cut"
          label="Tailoring"
          value={form.offersTailoring ? "Yes" : "No"}
          onPress={() => jumpToStep(6)}
        />
        <ReviewRow
          icon="public"
          label="Export"
          value={form.exportsEnabled ? "Yes" : "No"}
          onPress={() => jumpToStep(6)}
        />
        {form.exportsEnabled ? (
          <ReviewRow
            icon="travel-explore"
            label="Regions"
            value={joinOrEmpty(form.exportRegions)}
            onPress={() => jumpToStep(6)}
          />
        ) : null}
      </ReviewSection>

      <ReviewSection title="Media">
        <ReviewRow
          icon="image"
          label="Profile"
          value={
            form.profile ? prettyNameFromPicked(form.profile, "profile") : "None"
          }
          onPress={() => jumpToStep(7)}
        />
        <ReviewRow
          icon="verified-user"
          label="Permission"
          value={
            form.govPermission
              ? prettyNameFromPicked(form.govPermission, "permission")
              : "None"
          }
          onPress={() => jumpToStep(7)}
        />
        <ReviewRow
          icon="panorama"
          label="Banner"
          value={form.banner ? prettyNameFromPicked(form.banner, "banner") : "None"}
          onPress={() => jumpToStep(7)}
        />
        <ReviewRow
          icon="photo-library"
          label="Photos"
          value={countText(form.images.length, "photo", "photos")}
          onPress={() => jumpToStep(7)}
        />
        <ReviewRow
          icon="video-library"
          label="Videos"
          value={countText(form.videos.length, "video", "videos")}
          onPress={() => jumpToStep(7)}
        />
      </ReviewSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: apSpacing.blockGap,
  },
  sectionCard: {
    borderRadius: apRadii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: apColors.text,
    marginBottom: 8,
  },
  rows: {
    gap: 2,
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: apRadii.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: apColors.text,
  },
  value: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: apColors.subText,
  },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: apRadii.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: apColors.blueSoft,
  },
  pressed: {
    opacity: 0.82,
  },
});
