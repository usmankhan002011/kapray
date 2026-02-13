import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedShop } from "@/store/vendorSlice";
import StandardFilterDisplay, {
  optionStyles
} from "@/components/ui/StandardFilterDisplay";

type ShopRow = {
  shop_id: string;
  shop_name: string;
  owner_name: string;
  mobile: string;
  landline: string | null;
  address: string;
  location_url: string | null;

  government_permission_url: string | null;
  approval_certificate_url: string | null;

  banner_url: string | null;
  images: string[] | null;
  videos: string[] | null;

  status: string;
};

export default function VendorIndexScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const vendorId = useAppSelector((s) => s.user?.userDetails?.userId);

  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!vendorId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("shops")
        .select(
          "shop_id, shop_name, owner_name, mobile, landline, address, location_url, government_permission_url, approval_certificate_url, banner_url, images, videos, status"
        )
        .eq("registered_by", vendorId)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      setShops((data as any) || []);
      setLoading(false);
    };

    run();
  }, [vendorId]);

  const onPickShop = (s: ShopRow) => {
    dispatch(
      setSelectedShop({
        shop_id: s.shop_id,
        shop_name: s.shop_name,
        owner_name: s.owner_name,
        mobile: s.mobile,
        landline: s.landline,
        address: s.address,
        location_url: s.location_url,
        government_permission_url: s.government_permission_url,
        approval_certificate_url: s.approval_certificate_url,
        banner_url: s.banner_url,
        images: s.images,
        videos: s.videos,
        status: s.status
      })
    );
  };

  return (
    <StandardFilterDisplay
      title="Vendor"
      onBack={() => router.back()}
      onAny={undefined}
      onNext={() => router.push("/vendor/create-shop" as any)}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {!vendorId && <Text style={styles.meta}>Login required.</Text>}

        {loading && vendorId && <Text style={styles.meta}>Loading…</Text>}

        {!loading && vendorId && shops.length === 0 && (
          <Text style={styles.meta}>No shops yet.</Text>
        )}

        {!loading &&
          vendorId &&
          shops.map((s) => (
            <View key={s.shop_id} style={optionStyles.card}>
              <Text style={styles.title}>{s.shop_name}</Text>
              <Text style={styles.meta}>{s.owner_name}</Text>
              <Text style={styles.meta}>{s.mobile}</Text>
              <Text style={styles.meta}>{s.address}</Text>
              <Text style={styles.small}>Status: {s.status}</Text>

              <Text style={styles.action} onPress={() => onPickShop(s)}>
                Open
              </Text>
            </View>
          ))}

        <Text
          style={[styles.action, { marginTop: 14 }]}
          onPress={() => router.push("/vendor/create-shop" as any)}
        >
          Create shop
        </Text>
      </ScrollView>
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  title: { fontSize: 16, fontWeight: "700", color: "#111" },
  meta: { marginTop: 6, fontSize: 14, color: "#111", opacity: 0.75 },
  small: { marginTop: 8, fontSize: 12, color: "#111", opacity: 0.7 },
  action: { marginTop: 10, fontSize: 16, fontWeight: "700", color: "#111" }
});
