// File: app/orders/index.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

type OrderRow = {
  id: number;
  created_at: string;
  order_no: string | null;
  status: string;

  buyer_name: string;
  buyer_mobile: string;
  city: string;

  product_code_snapshot: string;
  title_snapshot: string;

  spec_snapshot: any;

  subtotal_pkr: number | null;
  delivery_pkr: number | null;
  total_pkr: number | null;
  currency: string;
};

type DyeSplit = {
  length_m: number;
  dye_shade_id: string;
  dye_hex: string;
  dye_label: string;
};

type OrdersTab = "active" | "completed";

type VendorExportDetails = {
  id: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  address: string;
};

type OrderExportDetails = {
  orderNo: string;
  status: string;
  buyer: string;
  product: string;
  category: string;
  selectedStyle: string;
  fabric: string;
  dyeing: string;
  city: string;
  total: string;
};

function norm(v: unknown) {
  return (v == null ? "" : String(v)).trim().toLowerCase();
}

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function cleanText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "";
}

function designText(value: unknown, fallback = "") {
  const s = String(value ?? "").trim();
  if (!s || s === "â€”" || s === "—" || s === "Ã¢â‚¬â€") {
    return fallback;
  }

  return (
    s
      .replace(/^(?:Variant|Style)\s+\d+\s*:\s*/i, "")
      .replace(/^(?:Variant|Style)\s+\d+$/i, "")
      .trim() || fallback
  );
}

type SelectionLabel = "style" | "design";

function normalizeSelectionLabel(
  value: unknown,
  fallback: SelectionLabel = "design",
): SelectionLabel {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return s === "style" || s === "styles" ? "style" : fallback;
}

function selectionLabelText(label: SelectionLabel) {
  return label === "style" ? "style" : "design";
}

function selectionLabelTitle(label: SelectionLabel) {
  return label === "style" ? "Style" : "Design";
}

function humanizeCat(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(currency: string, v: any) {
  if (v == null || v === "") return `${currency} —`;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return `${currency} —`;
  return `${currency} ${n.toLocaleString()}`;
}

function numOrNull(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeDyeSplits(v: any): DyeSplit[] {
  const rows = Array.isArray(v) ? v : [];

  return rows
    .map((row) => ({
      length_m: numOrNull(row?.length_m) ?? 0,
      dye_shade_id: cleanText(row?.dye_shade_id),
      dye_hex: cleanText(row?.dye_hex),
      dye_label: cleanText(row?.dye_label),
    }))
    .filter((row) => row.length_m > 0 && (row.dye_hex || row.dye_shade_id));
}

function getSelectedVariant(spec: any) {
  const selectedVariantSnapshot =
    spec?.selected_stitched_variant &&
    typeof spec.selected_stitched_variant === "object"
      ? spec.selected_stitched_variant
      : spec?.selected_variant && typeof spec.selected_variant === "object"
        ? spec.selected_variant
        : {};
  const label = normalizeSelectionLabel(
    spec?.selected_variant_label ??
      selectedVariantSnapshot?.selection_label ??
      selectedVariantSnapshot?.selected_variant_label ??
      selectedVariantSnapshot?.styleLabel ??
      selectedVariantSnapshot?.style_label,
  );
  const title = designText(cleanText(spec?.selected_variant_title));
  const size = cleanText(spec?.selected_variant_size);
  const color = cleanText(spec?.selected_variant_color);
  const price = numOrNull(spec?.selected_variant_price_pkr);

  return {
    hasVariant: !!(title || size || color || price != null),
    label,
    title,
    size,
    color,
    price,
  };
}

function textOrDash(v: any) {
  return cleanText(v) || "-";
}

function escHtml(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrintedAt(date = new Date()) {
  return date.toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tabTitle(tab: OrdersTab) {
  return tab === "active" ? "Active Orders" : "Completed Orders";
}

function getOrderExportDetails(item: OrderRow): OrderExportDetails {
  const spec =
    item.spec_snapshot && typeof item.spec_snapshot === "object"
      ? item.spec_snapshot
      : {};
  const selectedVariant = getSelectedVariant(spec);
  const dyeHex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
  const dyeLabel = cleanText(
    spec?.dye_label ?? spec?.dyeing_label ?? spec?.dye_shade_id ?? "",
  );
  const dyeSplits = normalizeDyeSplits(spec?.dyeing_splits);
  const dyeSplitText = dyeSplits
    .map(
      (row) =>
        `${row.length_m}m${row.dye_label ? ` Code ${row.dye_label}` : ""}`,
    )
    .join(", ");
  const hasDye = dyeHex && dyeHex !== "â€”";
  const dyeing = dyeSplits.length
    ? dyeSplitText
    : dyeLabel
      ? `Code ${dyeLabel}`
      : hasDye
        ? "Selected"
        : "";

  const selectedUnstitchedSize = cleanText(spec?.selected_unstitched_size);
  const selectedFabricLengthM = numOrNull(spec?.selected_fabric_length_m);
  const fabricCostPkr = numOrNull(spec?.fabric_cost_pkr);
  const fabric = [
    selectedUnstitchedSize ? `Size ${selectedUnstitchedSize}` : "",
    selectedFabricLengthM != null ? `${selectedFabricLengthM}m` : "",
    fabricCostPkr != null ? money(item.currency, fabricCostPkr) : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const selectedStyle = selectedVariant.hasVariant
    ? [
        selectedVariant.title ||
          `Selected ${selectionLabelText(selectedVariant.label)}`,
        selectedVariant.size ? `Size ${selectedVariant.size}` : "",
        selectedVariant.color ? `Color ${selectedVariant.color}` : "",
        selectedVariant.price != null
          ? money(item.currency, selectedVariant.price)
          : "",
      ]
        .filter(Boolean)
        .join(" | ")
    : "";

  const destinationType = safeText(spec?.destination_type ?? "");
  const exportRegion = safeText(spec?.export_region ?? "");
  const city = [
    cleanText(item.city) || "-",
    destinationType !== "â€”" ? humanizeCat(destinationType) : "",
    exportRegion !== "â€”" ? exportRegion : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    orderNo: item.order_no || `Order #${item.id}`,
    status: humanizeCat(item.status),
    buyer: `${textOrDash(item.buyer_name)} (${textOrDash(item.buyer_mobile)})`,
    product: [textOrDash(item.title_snapshot), cleanText(item.product_code_snapshot)]
      .filter(Boolean)
      .join(" | "),
    category: humanizeCat(
      spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "",
    ),
    selectedStyle,
    fabric,
    dyeing,
    city,
    total: money(item.currency, item.total_pkr),
  };
}

function buildOrdersPdfHtml(args: {
  tab: OrdersTab;
  rows: OrderRow[];
  vendor: VendorExportDetails;
  printedAt: string;
}) {
  const title = tabTitle(args.tab);
  const totalAmount = args.rows.reduce((sum, row) => {
    const n = numOrNull(row.total_pkr);
    return sum + (n ?? 0);
  }, 0);
  const currency = args.rows[0]?.currency || "PKR";

  const orderRows = args.rows.length
    ? args.rows
        .map((row, index) => {
          const d = getOrderExportDetails(row);
          return `
            <tr>
              <td class="num">${index + 1}</td>
              <td><strong>${escHtml(d.orderNo)}</strong><br><span>${escHtml(d.status)}</span></td>
              <td>${escHtml(d.buyer)}</td>
              <td><strong>${escHtml(d.product)}</strong><br><span>${escHtml(d.category)}</span></td>
              <td>${escHtml(d.selectedStyle || d.fabric || "-")}</td>
              <td>${escHtml(d.dyeing || "-")}</td>
              <td>${escHtml(d.city)}</td>
              <td class="total">${escHtml(d.total)}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="8" class="empty">No orders</td></tr>`;

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4 landscape; margin: 18px; }
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          color: #0F172A;
          background: #FFFFFF;
        }
        .wrap { padding: 4px; }
        .top {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #D7E3FF;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        h1 { margin: 0 0 6px; font-size: 20px; }
        .meta { font-size: 10px; line-height: 1.45; color: #475569; }
        .meta strong { color: #0F172A; }
        .summary {
          text-align: right;
          font-size: 11px;
          line-height: 1.55;
          white-space: nowrap;
        }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th {
          text-align: left;
          font-size: 9px;
          color: #2563EB;
          border-bottom: 1px solid #D7E3FF;
          padding: 6px 5px;
          text-transform: uppercase;
        }
        td {
          font-size: 9px;
          line-height: 1.35;
          border-bottom: 1px solid #E5E7EB;
          padding: 6px 5px;
          vertical-align: top;
          word-break: break-word;
        }
        td span { color: #64748B; }
        .num { width: 28px; color: #64748B; }
        .total { text-align: right; font-weight: 700; white-space: nowrap; }
        .empty { text-align: center; color: #64748B; padding: 18px; }
        .foot {
          margin-top: 10px;
          font-size: 9px;
          color: #64748B;
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="top">
          <div>
            <h1>${escHtml(title)}</h1>
            <div class="meta"><strong>${escHtml(args.vendor.shopName)}</strong></div>
            <div class="meta">Vendor ID: <strong>${escHtml(args.vendor.id)}</strong></div>
            <div class="meta">Owner: <strong>${escHtml(args.vendor.ownerName)}</strong></div>
            <div class="meta">Mobile: <strong>${escHtml(args.vendor.mobile)}</strong></div>
            <div class="meta">Address: <strong>${escHtml(args.vendor.address)}</strong></div>
          </div>
          <div class="summary">
            <div>Printed: <strong>${escHtml(args.printedAt)}</strong></div>
            <div>Orders: <strong>${args.rows.length}</strong></div>
            <div>Total: <strong>${escHtml(money(currency, totalAmount))}</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Order</th>
              <th>Buyer</th>
              <th>Product</th>
              <th>Design/Fabric</th>
              <th>Dyeing</th>
              <th>City</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${orderRows}</tbody>
        </table>

        <div class="foot">Kapray - ${escHtml(title)}</div>
      </div>
    </body>
  </html>
  `;
}

function buildOrdersWhatsAppText(args: {
  tab: OrdersTab;
  rows: OrderRow[];
  vendor: VendorExportDetails;
  printedAt: string;
}) {
  const title = tabTitle(args.tab);
  const totalAmount = args.rows.reduce((sum, row) => {
    const n = numOrNull(row.total_pkr);
    return sum + (n ?? 0);
  }, 0);
  const currency = args.rows[0]?.currency || "PKR";
  const header = [
    `Kapray ${title}`,
    `Printed: ${args.printedAt}`,
    `Shop: ${args.vendor.shopName}`,
    `Vendor ID: ${args.vendor.id}`,
    `Owner: ${args.vendor.ownerName}`,
    `Mobile: ${args.vendor.mobile}`,
    `Orders: ${args.rows.length}`,
    `Total: ${money(currency, totalAmount)}`,
  ];

  const lines = args.rows.map((row, index) => {
    const d = getOrderExportDetails(row);
    return [
      `${index + 1}. ${d.orderNo}`,
      d.status,
      d.buyer,
      d.product,
      d.selectedStyle || d.fabric,
      d.dyeing ? `Dyeing: ${d.dyeing}` : "",
      d.city,
      d.total,
    ]
      .filter(Boolean)
      .join(" | ");
  });

  return [...header, "", ...lines].join("\n");
}

async function openWhatsAppText(text: string) {
  const encoded = encodeURIComponent(text);

  try {
    await Linking.openURL(`whatsapp://send?text=${encoded}`);
    return;
  } catch {
    // Fall through to the web link.
  }

  await Linking.openURL(`https://wa.me/?text=${encoded}`);
}

export default function OrdersIndexScreen() {
  const router = useRouter();
  const vendorIdFromStore = useAppSelector(
    (s) => (s.vendor as any)?.id ?? null,
  );
  const vendorFromStore = useAppSelector((s) => (s.vendor as any) ?? {});

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState<"" | "pdf" | "whatsapp">("");

  const [tab, setTab] = useState<OrdersTab>("active");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const vId = vendorIdFromStore != null ? Number(vendorIdFromStore) : null;

      if (!vId) {
        setRows([]);
        return;
      }

      const activeStatuses = [
        "placed",
        "seen",
        "in_progress",
        "packed",
        "dispatched",
      ];

      let q = supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          order_no,
          status,
          buyer_name,
          buyer_mobile,
          city,
          product_code_snapshot,
          title_snapshot,
          spec_snapshot,
          subtotal_pkr,
          delivery_pkr,
          total_pkr,
          currency
        `,
        )
        .eq("vendor_id", vId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (tab === "active") {
        q = q.in("status", activeStatuses);
      } else {
        q = q.eq("status", "delivered");
      }

      const { data, error } = await q;
      if (error) throw error;

      const mapped: OrderRow[] = (data ?? []).map((o: any) => ({
        id: Number(o.id),
        created_at: String(o.created_at),
        order_no: o.order_no ?? null,
        status: String(o.status ?? "placed"),
        buyer_name: String(o.buyer_name ?? ""),
        buyer_mobile: String(o.buyer_mobile ?? ""),
        city: String(o.city ?? ""),
        product_code_snapshot: String(o.product_code_snapshot ?? ""),
        title_snapshot: String(o.title_snapshot ?? ""),
        spec_snapshot: o.spec_snapshot ?? {},
        subtotal_pkr: o.subtotal_pkr != null ? Number(o.subtotal_pkr) : null,
        delivery_pkr: o.delivery_pkr != null ? Number(o.delivery_pkr) : null,
        total_pkr: o.total_pkr != null ? Number(o.total_pkr) : null,
        currency: String(o.currency ?? "PKR"),
      }));

      setRows(mapped);
    } catch (e: any) {
      console.warn("orders load error:", e?.message ?? e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [vendorIdFromStore, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return rows;

    return rows.filter((r) => {
      const spec =
        r.spec_snapshot && typeof r.spec_snapshot === "object"
          ? r.spec_snapshot
          : {};
      const selectedVariant = getSelectedVariant(spec);

      const dyeHex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
      const dyeSplits = normalizeDyeSplits(spec?.dyeing_splits);
      const dyeSplitText = dyeSplits
        .map((row) => `${row.length_m}m ${row.dye_label}`)
        .join(" ");
      const tailoringEnabled = safeText(
        spec?.tailoring_enabled ?? spec?.tailoring_selected ?? "",
      );
      const tailoringDays = safeText(spec?.tailoring_turnaround_days ?? "");
      const tailoringCost = safeText(spec?.tailoring_cost_pkr ?? "");
      const productCategory = safeText(
        spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "",
      );
      const selectedUnstitchedSize = safeText(
        spec?.selected_unstitched_size ?? "",
      );
      const fabricLength = safeText(spec?.selected_fabric_length_m ?? "");
      const exportRegion = safeText(spec?.export_region ?? "");
      const destinationType = safeText(spec?.destination_type ?? "");

      const hay = [
        r.order_no ?? "",
        r.status,
        r.buyer_name,
        r.buyer_mobile,
        r.city,
        r.product_code_snapshot,
        r.title_snapshot,
        productCategory,
        dyeHex,
        dyeSplitText,
        tailoringEnabled,
        tailoringDays,
        tailoringCost,
        selectedUnstitchedSize,
        fabricLength,
        exportRegion,
        destinationType,
        selectedVariant.title,
        selectedVariant.size,
        selectedVariant.color,
        selectedVariant.price != null ? String(selectedVariant.price) : "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query]);

  const vendorExportDetails = useMemo<VendorExportDetails>(
    () => ({
      id: textOrDash(vendorIdFromStore),
      shopName: textOrDash(
        vendorFromStore.shop_name ??
          vendorFromStore.name ??
          vendorFromStore.owner_name,
      ),
      ownerName: textOrDash(vendorFromStore.owner_name ?? vendorFromStore.name),
      mobile: textOrDash(vendorFromStore.mobile),
      address: textOrDash(vendorFromStore.address ?? vendorFromStore.location),
    }),
    [
      vendorFromStore.address,
      vendorFromStore.location,
      vendorFromStore.mobile,
      vendorFromStore.name,
      vendorFromStore.owner_name,
      vendorFromStore.shop_name,
      vendorIdFromStore,
    ],
  );

  const canExport = Boolean(vendorIdFromStore && rows.length && !exporting);

  const handlePdfExport = useCallback(async () => {
    if (!rows.length) {
      Alert.alert("No orders", `No ${tab} orders to export.`);
      return;
    }

    try {
      setExporting("pdf");
      const printedAt = formatPrintedAt();
      const html = buildOrdersPdfHtml({
        tab,
        rows,
        vendor: vendorExportDetails,
        printedAt,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${tabTitle(tab)} PDF`,
          UTI: "com.adobe.pdf",
        });
      } else {
        await Print.printAsync({ html });
      }
    } catch (e: any) {
      console.warn("orders pdf export failed:", e?.message ?? e);
      Alert.alert("PDF failed", e?.message ?? "Could not create PDF.");
    } finally {
      setExporting("");
    }
  }, [rows, tab, vendorExportDetails]);

  const handleWhatsAppExport = useCallback(async () => {
    if (!rows.length) {
      Alert.alert("No orders", `No ${tab} orders to share.`);
      return;
    }

    try {
      setExporting("whatsapp");
      const text = buildOrdersWhatsAppText({
        tab,
        rows,
        vendor: vendorExportDetails,
        printedAt: formatPrintedAt(),
      });
      await openWhatsAppText(text);
    } catch (e: any) {
      console.warn("orders whatsapp export failed:", e?.message ?? e);
      Alert.alert("WhatsApp unavailable", "Could not open WhatsApp.");
    } finally {
      setExporting("");
    }
  }, [rows, tab, vendorExportDetails]);

  const renderItem = ({ item }: { item: OrderRow }) => {
    const orderNo = item.order_no || `Order #${item.id}`;
    const status = norm(item.status);

    const spec =
      item.spec_snapshot && typeof item.spec_snapshot === "object"
        ? item.spec_snapshot
        : {};
    const selectedVariant = getSelectedVariant(spec);

    const dyeHex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
    const dyeSplits = normalizeDyeSplits(spec?.dyeing_splits);
    const dyeLabel = cleanText(
      spec?.dye_label ?? spec?.dyeing_label ?? spec?.dye_shade_id ?? "",
    );
    const dyeSplitText = dyeSplits
      .map(
        (row) =>
          `${row.length_m}m${row.dye_label ? ` Code ${row.dye_label}` : ""}`,
      )
      .join(", ");
    const hasDyeSplit = dyeSplits.length > 0;
    const dyeSummary = hasDyeSplit
      ? dyeSplitText
      : dyeLabel
        ? `Code ${dyeLabel}`
        : "";
    const hasDye = dyeHex && dyeHex !== "—";

    const dressCat = humanizeCat(
      spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "",
    );

    const selectedUnstitchedSize = safeText(
      spec?.selected_unstitched_size ?? "",
    );
    const selectedFabricLengthM = numOrNull(
      spec?.selected_fabric_length_m ?? null,
    );
    const fabricCostPkr = numOrNull(spec?.fabric_cost_pkr ?? null);
    const destinationType = safeText(spec?.destination_type ?? "");
    const exportRegion = safeText(spec?.export_region ?? "");

    const isNew = status === "placed";

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/flow/orders/[id]",
            params: { id: String(item.id) },
          })
        }
        style={({ pressed }) => [
          styles.card,
          isNew && styles.cardNewRed,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.orderNo} numberOfLines={1}>
            {orderNo}
          </Text>
          <Text
            style={[styles.badge, isNew ? styles.badgeRed : styles.badgeBlue]}
            numberOfLines={1}
          >
            {humanizeCat(item.status)}
          </Text>
        </View>

        <Text style={styles.line} numberOfLines={2}>
          {item.title_snapshot} • {item.product_code_snapshot}
        </Text>

        <Text style={styles.small} numberOfLines={2}>
          Category: {dressCat}
        </Text>

        {selectedVariant.hasVariant ? (
          <View style={styles.variantBox}>
            <Text style={styles.variantTitle} numberOfLines={2}>
              Selected {selectionLabelTitle(selectedVariant.label)}:{" "}
              {selectedVariant.title ||
                `Ready-to-wear ${selectionLabelText(selectedVariant.label)}`}
            </Text>

            <Text style={styles.variantMeta} numberOfLines={2}>
              {selectedVariant.size ? `Size: ${selectedVariant.size}` : ""}
              {selectedVariant.size && selectedVariant.color ? " • " : ""}
              {selectedVariant.color ? `Color: ${selectedVariant.color}` : ""}
              {(selectedVariant.size || selectedVariant.color) &&
              selectedVariant.price != null
                ? " • "
                : ""}
              {selectedVariant.price != null
                ? money(item.currency, selectedVariant.price)
                : ""}
            </Text>
          </View>
        ) : null}

        {!!selectedUnstitchedSize && (
          <Text style={styles.small} numberOfLines={1}>
            Size: {selectedUnstitchedSize}
            {selectedFabricLengthM != null
              ? ` • ${selectedFabricLengthM}m`
              : ""}
          </Text>
        )}

        {fabricCostPkr != null ? (
          <Text style={styles.small} numberOfLines={1}>
            Total Fabric Cost: {money(item.currency, fabricCostPkr)}
          </Text>
        ) : null}

        {hasDye || hasDyeSplit ? (
          <View style={styles.dyeBlock}>
            <View style={styles.dyeHeaderRow}>
              <Text style={styles.dyeTitle}>Dyeing</Text>
              <View style={styles.dyeSwatchStack}>
                {hasDyeSplit ? (
                  dyeSplits.map((row, index) => (
                    <View
                      key={`${row.dye_shade_id}-${index}`}
                      style={[
                        styles.dyeSwatch,
                        { backgroundColor: row.dye_hex || stylesVars.white },
                      ]}
                    />
                  ))
                ) : (
                  <View
                    style={[styles.dyeSwatch, { backgroundColor: dyeHex }]}
                  />
                )}
              </View>
            </View>

            {dyeSummary ? (
              <Text style={styles.dyeText}>{dyeSummary}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.orderFooter}>
          <View style={styles.buyerWrap}>
            <Text style={styles.footerLabel}>Buyer</Text>
            <Text style={styles.footerValue} numberOfLines={2}>
              {item.buyer_name} ({item.buyer_mobile})
            </Text>
          </View>
          <Text style={styles.totalText} numberOfLines={1}>
            {money(item.currency, item.total_pkr)}
          </Text>
        </View>

        <Text style={styles.small} numberOfLines={2}>
          City: {item.city || "—"}
          {destinationType !== "—"
            ? ` • ${humanizeCat(destinationType)}${exportRegion !== "—" ? ` • ${exportRegion}` : ""}`
            : ""}
        </Text>
      </Pressable>
    );
  };

  const vIdLabel = vendorIdFromStore ? String(vendorIdFromStore) : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.rowBetween}>
          <View style={styles.headerMain}>
            <Text style={styles.title}>Orders</Text>
            <Text style={styles.subtitle}>
              Vendor ID: <Text style={styles.subtitleStrong}>{vIdLabel}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab("active")}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === "active" && styles.tabBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.tabText, tab === "active" && styles.tabTextActive]}
            >
              Active
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("completed")}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === "completed" && styles.tabBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                tab === "completed" && styles.tabTextActive,
              ]}
            >
              Completed
            </Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search: order no, buyer, mobile, city, product..."
          placeholderTextColor={stylesVars.placeholder}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.headerActions}>
          <Pressable
            onPress={load}
            disabled={loading || Boolean(exporting)}
            style={({ pressed }) => [
              styles.actionBtn,
              (loading || Boolean(exporting)) && styles.actionBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.actionText} numberOfLines={1}>
              {loading ? "Loading..." : "Refresh"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handlePdfExport}
            disabled={!canExport || loading}
            style={({ pressed }) => [
              styles.actionBtn,
              (!canExport || loading) && styles.actionBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.actionText} numberOfLines={1}>
              {exporting === "pdf" ? "PDF..." : "PDF"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleWhatsAppExport}
            disabled={!canExport || loading}
            style={({ pressed }) => [
              styles.actionBtn,
              (!canExport || loading) && styles.actionBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.actionText} numberOfLines={1}>
              {exporting === "whatsapp" ? "WhatsApp..." : "WhatsApp"}
            </Text>
          </Pressable>
        </View>
      </View>

      {!vendorIdFromStore ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No vendor selected</Text>
          <Text style={styles.emptyText}>
            Open vendor first (enter Vendor ID), then come back to Orders.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => String(x.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>
                Orders will appear here once buyers complete payment.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: apColors.bg,
  cardBg: apColors.card,
  border: apColors.border,
  borderSoft: apColors.borderSoft,
  blue: apColors.blue,
  blueSoft: apColors.blueSoft,
  text: apColors.text,
  subText: apColors.subText,
  mutedText: apColors.muted,
  placeholder: "#94A3B8",
  danger: apColors.danger,
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  white: apColors.white,
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  header: {
    padding: 16,
    gap: 10,
    backgroundColor: stylesVars.bg,
  },

  headerMain: {
    flex: 1,
  },

  title: {
    fontFamily: apFontFamily,
    fontSize: 18,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  subtitle: {
    marginTop: 4,
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  subtitleStrong: {
    fontFamily: apFontFamily,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    minWidth: 0,
  },

  tabRow: {
    flexDirection: "row",
    gap: 10,
  },

  tabBtn: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: apRadii.pill,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
  },

  tabBtnActive: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  tabText: {
    fontFamily: apFontFamily,
    fontWeight: "800",
    fontSize: 12,
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  tabTextActive: {
    color: stylesVars.white,
  },

  search: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: apRadii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: apFontFamily,
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "500",
    backgroundColor: stylesVars.white,
    letterSpacing: 0,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  actionBtn: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: apRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  actionBtnDisabled: {
    opacity: 0.55,
  },

  actionText: {
    fontFamily: apFontFamily,
    fontWeight: "800",
    fontSize: 12,
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  pressed: {
    opacity: 0.82,
  },

  loading: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  list: {
    padding: 16,
    paddingTop: 6,
    gap: 12,
    backgroundColor: stylesVars.bg,
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    padding: 16,
    gap: 8,
    backgroundColor: stylesVars.cardBg,
  },

  cardNewRed: {
    borderColor: stylesVars.dangerBorder,
    backgroundColor: "#FFF7F7",
  },

  orderNo: {
    fontFamily: apFontFamily,
    fontSize: 16,
    fontWeight: "800",
    color: stylesVars.text,
    flex: 1,
    letterSpacing: 0,
  },

  line: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.subText,
    fontWeight: "600",
    letterSpacing: 0,
    flexShrink: 1,
  },

  small: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
    flexShrink: 1,
  },

  variantBox: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 8,
    gap: 3,
  },

  variantTitle: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
    flexShrink: 1,
  },

  variantMeta: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
    flexShrink: 1,
  },

  badge: {
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: apRadii.control,
    overflow: "hidden",
    letterSpacing: 0,
    maxWidth: 132,
    flexShrink: 0,
  },

  badgeRed: {
    color: stylesVars.danger,
    backgroundColor: stylesVars.dangerSoft,
  },

  badgeBlue: {
    color: stylesVars.blue,
    backgroundColor: stylesVars.blueSoft,
  },

  dyeBlock: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 8,
    gap: 7,
    minWidth: 0,
  },

  dyeHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0,
  },

  dyeTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
  },

  dyeText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
    flexShrink: 1,
  },

  dyeSwatchStack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 4,
    maxWidth: 116,
    flexShrink: 1,
  },

  dyeSwatch: {
    width: 18,
    height: 18,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.white,
  },

  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },

  buyerWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  footerLabel: {
    fontFamily: apFontFamily,
    fontSize: 11,
    lineHeight: 15,
    color: stylesVars.mutedText,
    fontWeight: "700",
    letterSpacing: 0,
  },

  footerValue: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.text,
    fontWeight: "700",
    letterSpacing: 0,
  },

  totalText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
    flexShrink: 0,
    textAlign: "right",
  },

  empty: {
    padding: 20,
    gap: 8,
    alignItems: "center",
  },

  emptyTitle: {
    fontFamily: apFontFamily,
    fontSize: 16,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  emptyText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0,
  },
});
