// app/vendor/profile/update-product.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as VideoThumbnails from "expo-video-thumbnails";
import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import {
  ProductPreviewSection,
  SelectionPill,
  UpdateProductBottomBar,
  UpdateProductHeader,
} from "./UpdateProduct.components";
import {
  DressTypeField,
  InventoryStockField,
  OutOfStockNotice,
  StitchedPricingFields,
} from "./UpdateProduct.basic";
import { MediaSection } from "./UpdateProduct.media";
import { styles, stylesVars } from "./UpdateProduct.styles";
import { TailoringStyleDraftCard } from "./UpdateProduct.tailoring";
import {
  MadeOrderVariantDraftCard,
  ReadyVariantDraftCard,
  StitchedVariantInventorySection,
} from "./UpdateProduct.variants";
import {
  cleanNewMadeOrderVariantDraft,
  cleanNewReadyVariantDraft,
  clearProductTailoringSelections,
  editedCategoryFromState,
  emptyTailoringSelections,
  extFromUri,
  getStitchedVariantInventoryInfo,
  guessContentTypeFromExt,
  isHttpUrl,
  makeEmptyMadeOrderVariantDraft,
  makeEmptyReadyVariantDraft,
  makeEmptyTailoringStyleDraft,
  nextVariantNoFromList,
  normalizeStringList,
  readEditableStitchedVariants,
  readMadeOrderVariants,
  readProductTailoringSelections,
  readTailoringStylePresets,
  readVariantArrayWithSource,
  readVendorTailoringOptions,
  resolveProductCategory,
  roundMeter,
  safeInt,
  safeJson,
  safeNonNegInt,
  safeNumOrZero,
  safeText,
  sanitizeNumber,
  sumReadyVariantDraftQty,
  variantDisplayTitle,
  writeEditableStitchedVariantsToJson,
  writeProductTailoringSelections,
} from "./UpdateProduct.helpers";
import type {
  EditableReadyVariant,
  EditableVariantSizeRow,
  NewMadeOrderVariantDraft,
  NewReadyVariantDraft,
  NewTailoringStyleDraft,
  ProductCategory,
  ProductRow,
  ProductTailoringSelections,
  VendorTailoringOptions,
} from "./UpdateProduct.helpers";

const PRODUCTS_TABLE = "products";
const BUCKET_VENDOR = "vendor_images";
export default function UpdateProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId?: string;
    product_id?: string;
  }>();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.id ?? null) ??
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);
  const routeProductId = safeInt(
    (params as any)?.productId ?? (params as any)?.product_id,
  );

  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [vendorLoading, setVendorLoading] = useState(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(() => {
    return products.find((p) => p.id === selectedId) ?? null;
  }, [products, selectedId]);

  const [title, setTitle] = useState("");
  const [moreDescription, setMoreDescription] = useState("");
  const [inventoryQty, setInventoryQty] = useState<number>(0);
  const [inventoryQtyText, setInventoryQtyText] = useState("");

  const [priceMode, setPriceMode] = useState<
    "stitched_total" | "unstitched_per_meter"
  >("unstitched_per_meter");
  const [priceTotal, setPriceTotal] = useState<number>(0);
  const [pricePerMeter, setPricePerMeter] = useState<number>(0);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  const [dyeingEnabled, setDyeingEnabled] = useState<boolean>(false);
  const [dyeingCost, setDyeingCost] = useState<number>(0);

  const [tailoringEnabled, setTailoringEnabled] = useState<boolean>(false);
  const [tailoringCost, setTailoringCost] = useState<number>(0);
  const [tailoringTurnaroundDays, setTailoringTurnaroundDays] =
    useState<number>(0);

  const [vendorOffersTailoring, setVendorOffersTailoring] =
    useState<boolean>(false);
  const [vendorTailoringOptions, setVendorTailoringOptions] =
    useState<VendorTailoringOptions>({
      blouse_neck: [],
      sleeves: [],
      trouser: [],
    });

  const [selectedTailoringStyles, setSelectedTailoringStyles] =
    useState<ProductTailoringSelections>(emptyTailoringSelections());

  const [stitchedVariants, setStitchedVariants] = useState<
    EditableReadyVariant[]
  >([]);

  const [newReadyVariants, setNewReadyVariants] = useState<
    NewReadyVariantDraft[]
  >([]);
  const [newMadeOrderVariants, setNewMadeOrderVariants] = useState<
    NewMadeOrderVariantDraft[]
  >([]);
  const [newTailoringStyles, setNewTailoringStyles] = useState<
    NewTailoringStyleDraft[]
  >([]);

  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});

  const resolvePublicUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    if (isHttpUrl(path)) return path;
    const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, []);

  const toggleStyle = useCallback(
    (group: keyof ProductTailoringSelections, value: string) => {
      const clean = String(value ?? "").trim();
      if (!clean) return;

      setSelectedTailoringStyles((prev) => {
        const current = normalizeStringList(prev[group]);
        const exists = current.includes(clean);

        return {
          ...prev,
          [group]: exists
            ? current.filter((x) => x !== clean)
            : [...current, clean],
        };
      });
    },
    [],
  );

  const updateStitchedVariantSizeQty = useCallback(
    (variantId: string, size: string, rawValue: string) => {
      const qty = safeNonNegInt(sanitizeNumber(rawValue));

      setStitchedVariants((prev) =>
        prev.map((variant) =>
          variant.id === variantId
            ? {
                ...variant,
                sizes: variant.sizes.map((row) =>
                  row.size === size ? { ...row, qty } : row,
                ),
              }
            : variant,
        ),
      );
    },
    [],
  );

  const updateNewReadyVariant = useCallback(
    (
      index: number,
      updater: (prev: NewReadyVariantDraft) => NewReadyVariantDraft,
    ) => {
      setNewReadyVariants((prev) =>
        prev.map((item, i) => (i === index ? updater(item) : item)),
      );
    },
    [],
  );

  const updateNewReadyVariantSizeQty = useCallback(
    (variantIndex: number, size: string, rawValue: string) => {
      const qty = safeNonNegInt(sanitizeNumber(rawValue));
      updateNewReadyVariant(variantIndex, (prev) => ({
        ...prev,
        sizes: prev.sizes.map((row) =>
          row.size === size ? { ...row, qty } : row,
        ),
      }));
    },
    [updateNewReadyVariant],
  );

  const updateNewMadeOrderVariant = useCallback(
    (
      index: number,
      updater: (prev: NewMadeOrderVariantDraft) => NewMadeOrderVariantDraft,
    ) => {
      setNewMadeOrderVariants((prev) =>
        prev.map((item, i) => (i === index ? updater(item) : item)),
      );
    },
    [],
  );

  const updateNewTailoringStyle = useCallback(
    (
      index: number,
      updater: (prev: NewTailoringStyleDraft) => NewTailoringStyleDraft,
    ) => {
      setNewTailoringStyles((prev) =>
        prev.map((item, i) => (i === index ? updater(item) : item)),
      );
    },
    [],
  );

  const toggleNewTailoringStyleOption = useCallback(
    (
      index: number,
      field: "neck_styles" | "sleeve_styles" | "trouser_styles",
      value: string,
    ) => {
      const clean = String(value ?? "").trim();
      if (!clean) return;

      updateNewTailoringStyle(index, (prev) => {
        const current = normalizeStringList(prev[field]);
        const exists = current.includes(clean);
        const nextList = exists
          ? current.filter((item) => item !== clean)
          : [...current, clean];

        const next: NewTailoringStyleDraft = {
          ...prev,
          [field]: nextList,
        };

        if (field === "neck_styles") {
          next.default_neck = nextList[0] ?? "";
        } else if (field === "sleeve_styles") {
          next.default_sleeve = nextList[0] ?? "";
        } else if (field === "trouser_styles") {
          next.default_trouser = nextList[0] ?? "";
        }

        return next;
      });
    },
    [updateNewTailoringStyle],
  );

  async function fetchProducts() {
    if (!vendorId) {
      Alert.alert("Vendor missing", "Please ensure vendor.id is loaded.");
      return;
    }

    try {
      setLoadingList(true);

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, made_on_order, product_category, spec, price, media, created_at, updated_at",
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Load error", error.message);
        return;
      }

      setProducts((data as unknown as ProductRow[]) ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load products.");
    } finally {
      setLoadingList(false);
    }
  }

  const fetchVendorTailoring = useCallback(async () => {
    if (!vendorId) {
      setVendorOffersTailoring(false);
      setVendorTailoringOptions({
        blouse_neck: [],
        sleeves: [],
        trouser: [],
      });
      return;
    }

    try {
      setVendorLoading(true);

      const { data, error } = await supabase
        .from("vendor")
        .select("id, offers_tailoring, tailoring_options")
        .eq("id", vendorId)
        .single();

      if (error) {
        setVendorOffersTailoring(false);
        setVendorTailoringOptions({
          blouse_neck: [],
          sleeves: [],
          trouser: [],
        });
        return;
      }

      setVendorOffersTailoring(Boolean((data as any)?.offers_tailoring));
      setVendorTailoringOptions(
        readVendorTailoringOptions((data as any)?.tailoring_options),
      );
    } catch {
      setVendorOffersTailoring(false);
      setVendorTailoringOptions({
        blouse_neck: [],
        sleeves: [],
        trouser: [],
      });
    } finally {
      setVendorLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void fetchProducts();
    void fetchVendorTailoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    if (routeProductId != null) {
      setSelectedId(routeProductId);
    }
  }, [routeProductId]);

  useEffect(() => {
    if (!selected) return;

    setTitle(safeText(selected.title));
    setMoreDescription(
      safeText(safeJson(selected.spec)?.more_description ?? ""),
    );

    const price = safeJson(selected.price);
    const spec = safeJson(selected.spec);
    const modeRaw = String(price?.mode ?? "").trim();
    const mode: "stitched_total" | "unstitched_per_meter" =
      modeRaw === "stitched_total" ? "stitched_total" : "unstitched_per_meter";
    const isMadeOnOrder = Boolean(selected.made_on_order);
    const nextInventoryQty = isMadeOnOrder
      ? 0
      : safeNumOrZero(selected.inventory_qty ?? spec?.inventory_length_m ?? 0);

    setInventoryQty(nextInventoryQty);
    setInventoryQtyText(
      isMadeOnOrder
        ? "0"
        : nextInventoryQty > 0
          ? String(
              mode === "unstitched_per_meter"
                ? roundMeter(nextInventoryQty)
                : Math.trunc(nextInventoryQty),
            )
          : "",
    );

    setPriceMode(mode);
    setPriceTotal(safeNumOrZero(price?.cost_pkr_total));
    setPricePerMeter(safeNumOrZero(price?.cost_pkr_per_meter));

    setAvailableSizes(
      Array.isArray(price?.available_sizes)
        ? price.available_sizes
            .map((x: any) => String(x).trim())
            .filter(Boolean)
        : [],
    );

    const dyeOn = Boolean(spec?.dyeing_enabled);
    setDyeingEnabled(dyeOn);

    const dyeCostFromPrice = safeNumOrZero(price?.dyeing_cost_pkr ?? 0);
    const dyeCostFromSpec = safeNumOrZero(spec?.dyeing_cost_pkr ?? 0);
    setDyeingCost(dyeCostFromPrice > 0 ? dyeCostFromPrice : dyeCostFromSpec);

    const tailorOn = Boolean(spec?.tailoring_enabled);
    setTailoringEnabled(tailorOn);

    const tailorCostFromPrice = safeNumOrZero(price?.tailoring_cost_pkr ?? 0);
    const tailorCostFromSpec = safeNumOrZero(spec?.tailoring_cost_pkr ?? 0);
    setTailoringCost(
      tailorCostFromPrice > 0 ? tailorCostFromPrice : tailorCostFromSpec,
    );

    const daysFromSpec = safeNumOrZero(spec?.tailoring_turnaround_days ?? 0);
    setTailoringTurnaroundDays(daysFromSpec);

    setSelectedTailoringStyles(readProductTailoringSelections(spec));
    setStitchedVariants(readEditableStitchedVariants(selected));
    setNewReadyVariants([]);
    setNewMadeOrderVariants([]);
    setNewTailoringStyles(
      tailorOn && readTailoringStylePresets(spec).length === 0
        ? [makeEmptyTailoringStyleDraft()]
        : [],
    );
  }, [selected]);

  useEffect(() => {
    if (!dyeingEnabled && dyeingCost !== 0) setDyeingCost(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dyeingEnabled]);

  useEffect(() => {
    if (!tailoringEnabled) {
      if (tailoringCost !== 0) setTailoringCost(0);
      if (tailoringTurnaroundDays !== 0) setTailoringTurnaroundDays(0);
      setSelectedTailoringStyles(emptyTailoringSelections());
      setNewTailoringStyles([]);
    }
  }, [tailoringCost, tailoringEnabled, tailoringTurnaroundDays]);

  const inventoryEditable = useMemo(() => {
    if (!selected) return false;
    return !Boolean(selected.made_on_order);
  }, [selected]);

  const stitchedVariantInventoryInfo = useMemo(() => {
    return getStitchedVariantInventoryInfo(stitchedVariants);
  }, [stitchedVariants]);

  const usesVariantInventory = useMemo(() => {
    return priceMode === "stitched_total" && stitchedVariants.length > 0;
  }, [priceMode, stitchedVariants.length]);

  const media = useMemo(() => safeJson(selected?.media), [selected]);

  const imagePaths = useMemo(
    () => (Array.isArray(media?.images) ? media.images.map(String) : []),
    [media],
  );
  const videoPaths = useMemo(
    () => (Array.isArray(media?.videos) ? media.videos.map(String) : []),
    [media],
  );
  const thumbPaths = useMemo(
    () => (Array.isArray(media?.thumbs) ? media.thumbs.map(String) : []),
    [media],
  );

  const imageUrls = useMemo(
    () =>
      imagePaths
        .map((p: string) => resolvePublicUrl(p))
        .filter(Boolean) as string[],
    [imagePaths, resolvePublicUrl],
  );

  const previewImageUrl = imageUrls[0] ?? null;

  const videoUrls = useMemo(
    () =>
      videoPaths
        .map((p: string) => resolvePublicUrl(p))
        .filter(Boolean) as string[],
    [videoPaths, resolvePublicUrl],
  );

  const thumbUrls = useMemo(
    () =>
      thumbPaths
        .map((p: string) => resolvePublicUrl(p))
        .filter(Boolean) as string[],
    [thumbPaths, resolvePublicUrl],
  );

  useEffect(() => {
    let cancelled = false;

    async function ensureThumb(url: string) {
      const u = String(url || "").trim();
      if (!u) return;
      if (videoThumbs[u]) return;

      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(u, {
          time: 1500,
        });
        if (cancelled) return;
        if (uri) {
          setVideoThumbs((prev) => (prev[u] ? prev : { ...prev, [u]: uri }));
          try {
            Image.prefetch(uri);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    const list = (videoUrls ?? []).slice(0, 20);
    (async () => {
      for (let i = 0; i < list.length; i++) {
        await ensureThumb(list[i]);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(videoUrls)]);

  const isUnstitched = priceMode === "unstitched_per_meter";

  const currentProductCategory = useMemo(
    () => resolveProductCategory(selected),
    [selected],
  );

  const editedProductCategory = useMemo(
    () => editedCategoryFromState(priceMode, dyeingEnabled, tailoringEnabled),
    [dyeingEnabled, priceMode, tailoringEnabled],
  );

  const blouseNeckOptions = useMemo(
    () => normalizeStringList(vendorTailoringOptions?.blouse_neck),
    [vendorTailoringOptions?.blouse_neck],
  );

  const sleeveOptions = useMemo(
    () => normalizeStringList(vendorTailoringOptions?.sleeves),
    [vendorTailoringOptions?.sleeves],
  );

  const trouserOptions = useMemo(
    () => normalizeStringList(vendorTailoringOptions?.trouser),
    [vendorTailoringOptions?.trouser],
  );

  const hasAnyVendorStyleOptions = useMemo(() => {
    return Boolean(
      blouseNeckOptions.length || sleeveOptions.length || trouserOptions.length,
    );
  }, [blouseNeckOptions.length, sleeveOptions.length, trouserOptions.length]);

  const existingTailoringStylePresets = useMemo(
    () => readTailoringStylePresets(selected?.spec),
    [selected?.spec],
  );

  useEffect(() => {
    if (!tailoringEnabled) return;
    if (existingTailoringStylePresets.length || newTailoringStyles.length) {
      return;
    }
    setNewTailoringStyles([makeEmptyTailoringStyleDraft()]);
  }, [
    tailoringEnabled,
    existingTailoringStylePresets.length,
    newTailoringStyles.length,
  ]);

  const canSave = useMemo(() => {
    if (!vendorId) return false;
    if (!selectedId) return false;
    if (!title.trim()) return false;

    if (priceMode === "unstitched_per_meter") {
      const n = Number(pricePerMeter ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;

      if (dyeingEnabled) {
        const d = Number(dyeingCost ?? 0);
        if (!Number.isFinite(d) || d <= 0) return false;
      }

      if (tailoringEnabled) {
        if (!vendorOffersTailoring) return false;

        const t = Number(tailoringCost ?? 0);
        if (!Number.isFinite(t) || t <= 0) return false;

        const days = Number(tailoringTurnaroundDays ?? 0);
        if (!Number.isFinite(days) || days < 0) return false;

        if (
          existingTailoringStylePresets.length + newTailoringStyles.length <
          1
        ) {
          return false;
        }
      }
    } else {
      const n = Number(priceTotal ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
    }

    return true;
  }, [
    vendorId,
    selectedId,
    title,
    priceMode,
    pricePerMeter,
    priceTotal,
    dyeingEnabled,
    dyeingCost,
    tailoringEnabled,
    tailoringCost,
    tailoringTurnaroundDays,
    vendorOffersTailoring,
    existingTailoringStylePresets.length,
    newTailoringStyles.length,
  ]);

  async function saveUpdate() {
    if (saving) return;

    if (
      priceMode === "unstitched_per_meter" &&
      tailoringEnabled &&
      existingTailoringStylePresets.length + newTailoringStyles.length < 1
    ) {
      Alert.alert(
        "Missing style cards",
        "Please add at least one tailoring style card.",
      );
      return;
    }

    if (!canSave) {
      Alert.alert(
        "Incomplete",
        "Please select a product and fill required fields.",
      );
      return;
    }

    if (!vendorId || !selectedId) {
      Alert.alert("Missing", "Vendor or product is missing.");
      return;
    }

    for (const variant of newReadyVariants) {
      if (!String(variant.name ?? "").trim()) {
        Alert.alert(
          "Missing style name",
          "Please enter a name for each new ready-to-wear style.",
        );
        return;
      }
      if (sumReadyVariantDraftQty(variant) <= 0) {
        Alert.alert(
          "Missing stock",
          "Each new ready-to-wear style needs stock in at least one size.",
        );
        return;
      }
    }

    for (const variant of newMadeOrderVariants) {
      if (!String(variant.name ?? "").trim()) {
        Alert.alert(
          "Missing style name",
          "Please enter a name for each new made-on-order style.",
        );
        return;
      }
    }

    for (const style of newTailoringStyles) {
      if (!String(style.title ?? "").trim()) {
        Alert.alert(
          "Missing style title",
          "Please enter a title for each new tailoring style card.",
        );
        return;
      }
      if (!style.images.length) {
        Alert.alert(
          "Missing style image",
          "Each new tailoring style card needs at least one reference image.",
        );
        return;
      }
    }

    try {
      setSaving(true);

      const prevSpec = safeJson(selected?.spec);
      const prevPrice = safeJson(selected?.price);

      let nextPrice: any = {
        ...(prevPrice ?? {}),
        mode: priceMode,
      };

      if (priceMode === "unstitched_per_meter") {
        nextPrice = {
          ...nextPrice,
          cost_pkr_per_meter: Number(pricePerMeter ?? 0),
          dyeing_cost_pkr: dyeingEnabled ? Number(dyeingCost ?? 0) : 0,
          tailoring_cost_pkr: tailoringEnabled ? Number(tailoringCost ?? 0) : 0,
        };

        if ("cost_pkr_total" in nextPrice) {
          nextPrice.cost_pkr_total = nextPrice.cost_pkr_total ?? undefined;
        }
      } else {
        nextPrice = {
          ...nextPrice,
          cost_pkr_total: Number(priceTotal ?? 0),
          available_sizes: (availableSizes ?? [])
            .map((x) => String(x).trim())
            .filter(Boolean),
        };

        nextPrice.dyeing_cost_pkr = 0;
        nextPrice.tailoring_cost_pkr = 0;
      }

      let nextSpec: any = {
        ...(prevSpec ?? {}),
      };

      nextSpec.more_description = String(moreDescription ?? "").trim();
      const nextProductCategory = editedCategoryFromState(
        priceMode,
        dyeingEnabled,
        tailoringEnabled,
      );
      nextSpec.product_category = nextProductCategory;

      if (priceMode === "unstitched_per_meter") {
        nextSpec.dyeing_enabled = Boolean(dyeingEnabled);
        nextSpec.dyeing_cost_pkr = dyeingEnabled ? Number(dyeingCost ?? 0) : 0;
        nextSpec.dyeing_pricing_unit =
          nextProductCategory === "unstitched_dyeing"
            ? "per_meter"
            : "per_order";

        nextSpec.tailoring_enabled = Boolean(tailoringEnabled);
        nextSpec.tailoring_cost_pkr = tailoringEnabled
          ? Number(tailoringCost ?? 0)
          : 0;
        nextSpec.tailoring_turnaround_days = tailoringEnabled
          ? Math.max(0, Number(tailoringTurnaroundDays ?? 0))
          : 0;

        if (tailoringEnabled) {
          nextSpec = writeProductTailoringSelections(
            nextSpec,
            selectedTailoringStyles,
          );
        }

        nextSpec.fabric_purchase_mode =
          nextProductCategory === "unstitched_dyeing_tailoring"
            ? "dress_length"
            : "by_meter";
      } else {
        nextSpec.dyeing_enabled = false;
        nextSpec.dyeing_cost_pkr = 0;

        nextSpec.tailoring_enabled = false;
        nextSpec.tailoring_cost_pkr = 0;
        nextSpec.tailoring_turnaround_days = 0;
        nextSpec = clearProductTailoringSelections(nextSpec);
      }

      if (priceMode === "stitched_total" && stitchedVariants.length > 0) {
        const written = writeEditableStitchedVariantsToJson({
          prevPrice,
          prevSpec,
          nextPrice,
          nextSpec,
          variants: stitchedVariants,
        });

        nextPrice = written.nextPrice;
        nextSpec = written.nextSpec;
      }

      if (
        priceMode === "stitched_total" &&
        !Boolean(selected?.made_on_order) &&
        newReadyVariants.length > 0
      ) {
        const sourceInfo = readVariantArrayWithSource(prevPrice, prevSpec);
        const key = sourceInfo.key || "variants";
        const source = sourceInfo.source || "price";
        const currentVariants = Array.isArray(
          source === "spec" ? nextSpec?.[key] : nextPrice?.[key],
        )
          ? [...(source === "spec" ? nextSpec[key] : nextPrice[key])]
          : [...sourceInfo.variants];
        let nextNo = nextVariantNoFromList(currentVariants);
        const additions: any[] = [];

        for (let i = 0; i < newReadyVariants.length; i += 1) {
          const variant = newReadyVariants[i];
          const imagePaths: string[] = [];

          if (selected?.product_code) {
            for (
              let imgIndex = 0;
              imgIndex < (variant.images ?? []).length;
              imgIndex += 1
            ) {
              const uri = String(variant.images[imgIndex]?.uri ?? "").trim();
              if (!uri) continue;

              const path = await uploadOneAsset({
                kind: "image",
                uri,
                vendorId,
                productCode: String(selected.product_code),
                index: imgIndex,
              });

              imagePaths.push(path);
            }
          }

          additions.push(
            cleanNewReadyVariantDraft(variant, nextNo++, imagePaths),
          );
        }
        const merged = [...currentVariants, ...additions];

        if (source === "spec") {
          nextSpec[key] = merged;
        } else {
          nextPrice[key] = merged;
        }
        nextPrice.variants = Array.isArray(nextPrice.variants)
          ? nextPrice.variants
          : merged;
      }

      if (
        priceMode === "stitched_total" &&
        Boolean(selected?.made_on_order) &&
        newMadeOrderVariants.length > 0
      ) {
        const currentMadeOrder = [...readMadeOrderVariants(nextPrice)];
        let nextNo = nextVariantNoFromList(currentMadeOrder);
        const additions: any[] = [];

        for (let i = 0; i < newMadeOrderVariants.length; i += 1) {
          const variant = newMadeOrderVariants[i];
          const imagePaths: string[] = [];

          if (selected?.product_code) {
            for (
              let imgIndex = 0;
              imgIndex < (variant.images ?? []).length;
              imgIndex += 1
            ) {
              const uri = String(variant.images[imgIndex]?.uri ?? "").trim();
              if (!uri) continue;

              const path = await uploadOneAsset({
                kind: "image",
                uri,
                vendorId,
                productCode: String(selected.product_code),
                index: imgIndex,
              });

              imagePaths.push(path);
            }
          }

          additions.push(
            cleanNewMadeOrderVariantDraft(variant, nextNo++, imagePaths),
          );
        }

        nextSpec.made_on_order = true;
        nextSpec.variant_mode = "made_order_variants";
        nextPrice.made_order_variants = [...currentMadeOrder, ...additions];
      }

      if (
        priceMode === "unstitched_per_meter" &&
        tailoringEnabled &&
        newTailoringStyles.length > 0 &&
        selected?.product_code
      ) {
        const existingStylePresets = [...readTailoringStylePresets(nextSpec)];
        const additions: any[] = [];

        for (let i = 0; i < newTailoringStyles.length; i += 1) {
          const style = newTailoringStyles[i];
          const imageObjects: any[] = [];

          for (
            let imgIndex = 0;
            imgIndex < style.images.length;
            imgIndex += 1
          ) {
            const uri = String(style.images[imgIndex]?.uri ?? "").trim();
            if (!uri) continue;
            const path = await uploadOneAsset({
              kind: "image",
              uri,
              vendorId,
              productCode: String(selected.product_code),
              index: imgIndex,
            });
            imageObjects.push({ uri: path, path });
          }

          additions.push({
            id: `tailoring-style-${Date.now()}-${i + 1}`,
            title: String(style.title ?? "").trim(),
            note: String(style.note ?? "").trim(),
            extra_cost_pkr: safeNonNegInt(style.extra_cost_pkr),
            images: imageObjects,
            default_neck: String(
              style.default_neck ||
                normalizeStringList(style.neck_styles)[0] ||
                "",
            ).trim(),
            default_sleeve: String(
              style.default_sleeve ||
                normalizeStringList(style.sleeve_styles)[0] ||
                "",
            ).trim(),
            default_trouser: String(
              style.default_trouser ||
                normalizeStringList(style.trouser_styles)[0] ||
                "",
            ).trim(),
            allowed_neck_variations: normalizeStringList(style.neck_styles),
            allowed_sleeve_variations: normalizeStringList(style.sleeve_styles),
            allowed_trouser_variations: normalizeStringList(
              style.trouser_styles,
            ),
            allow_custom_note: true,
          });
        }

        nextSpec.tailoring_style_presets = [
          ...existingStylePresets,
          ...additions,
        ];
      }

      const updatePayload: any = {
        title: title.trim(),
        product_category: nextProductCategory,
        price: nextPrice,
        spec: nextSpec,
        updated_at: new Date().toISOString(),
      };

      if (Boolean(selected?.made_on_order)) {
        updatePayload.inventory_qty = 0;
      } else if (
        priceMode === "stitched_total" &&
        (stitchedVariants.length > 0 || newReadyVariants.length > 0)
      ) {
        updatePayload.inventory_qty =
          stitchedVariantInventoryInfo.totalQty +
          newReadyVariants.reduce(
            (sum, variant) => sum + sumReadyVariantDraftQty(variant),
            0,
          );
      } else if (inventoryEditable) {
        const parsedInventoryInput = Number(
          sanitizeNumber(inventoryQtyText) || "0",
        );
        const inventoryInputNumber = Number.isFinite(parsedInventoryInput)
          ? parsedInventoryInput
          : 0;
        const nextInventoryQty =
          priceMode === "unstitched_per_meter"
            ? roundMeter(Math.max(0, inventoryInputNumber))
            : Math.max(0, Math.trunc(inventoryInputNumber));

        updatePayload.inventory_qty = nextInventoryQty;

        if (priceMode === "unstitched_per_meter") {
          nextSpec.inventory_unit = "m";
          nextSpec.inventory_length_m = nextInventoryQty;
        }
      }

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, made_on_order, product_category, spec, price, media, created_at, updated_at",
        )
        .single();

      if (error) {
        Alert.alert("Update failed", error.message);
        return;
      }

      const updated = data as unknown as ProductRow;
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );

      Alert.alert(
        "Updated",
        `Saved changes for ${safeText(updated.product_code)}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update product.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMedia(nextMedia: any) {
    if (!vendorId || !selectedId) return;
    if (savingMedia) return;

    try {
      setSavingMedia(true);

      const updatePayload = {
        media: nextMedia,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, made_on_order, product_category, spec, price, media, created_at, updated_at",
        )
        .single();

      if (error) {
        Alert.alert("Media update failed", error.message);
        return;
      }

      const updated = data as unknown as ProductRow;
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update media.");
    } finally {
      setSavingMedia(false);
    }
  }

  function confirmRemoveImage(idx: number) {
    Alert.alert(
      "Remove image?",
      "This image will be removed from the product.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void removeImageAt(idx),
        },
      ],
    );
  }

  function confirmRemoveVideo(idx: number) {
    Alert.alert(
      "Remove video?",
      "This video will be removed from the product.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void removeVideoAt(idx),
        },
      ],
    );
  }

  async function removeImageAt(idx: number) {
    if (!selected) return;

    const m = safeJson(selected.media);
    const images = Array.isArray(m.images) ? [...m.images] : [];
    if (idx < 0 || idx >= images.length) return;

    images.splice(idx, 1);

    const next = {
      ...m,
      images,
    };

    await saveMedia(next);
  }

  async function removeVideoAt(idx: number) {
    if (!selected) return;

    const m = safeJson(selected.media);
    const videos = Array.isArray(m.videos) ? [...m.videos] : [];
    const thumbs = Array.isArray(m.thumbs) ? [...m.thumbs] : [];

    if (idx < 0 || idx >= videos.length) return;

    videos.splice(idx, 1);
    if (idx < thumbs.length) thumbs.splice(idx, 1);

    const next = {
      ...m,
      videos,
      thumbs,
    };

    await saveMedia(next);
  }

  async function uploadOneAsset(args: {
    kind: "image" | "video";
    uri: string;
    vendorId: number;
    productCode: string;
    index: number;
  }) {
    const ext = extFromUri(args.uri) || (args.kind === "image" ? "jpg" : "mp4");
    const contentType = guessContentTypeFromExt(ext);

    const base64 = await FileSystem.readAsStringAsync(args.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const folder = args.kind === "image" ? "images" : "videos";
    const filename = `${Date.now()}_${args.index}_${Math.random().toString(16).slice(2)}.${ext}`;
    const storagePath = `vendors/${args.vendorId}/products/${args.productCode}/${folder}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_VENDOR)
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);
    return storagePath;
  }

  async function pickNewTailoringStyleImages(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow media library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
      allowsMultipleSelection: true,
    });

    if (result.canceled) return;

    const assets = (result.assets ?? [])
      .map((asset: any) => String(asset?.uri ?? "").trim())
      .filter(Boolean)
      .map((uri: string) => ({ uri }));

    if (!assets.length) return;

    updateNewTailoringStyle(index, (prev) => ({
      ...prev,
      images: [...prev.images, ...assets],
    }));
  }

  async function pickNewReadyVariantImages(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow media library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
      allowsMultipleSelection: true,
    });

    if (result.canceled) return;

    const assets = (result.assets ?? [])
      .map((asset: any) => String(asset?.uri ?? "").trim())
      .filter(Boolean)
      .map((uri: string) => ({ uri }));

    if (!assets.length) return;

    updateNewReadyVariant(index, (prev) => ({
      ...prev,
      images: [...(prev.images ?? []), ...assets],
    }));
  }

  async function pickNewMadeOrderVariantImages(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow media library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
      allowsMultipleSelection: true,
    });

    if (result.canceled) return;

    const assets = (result.assets ?? [])
      .map((asset: any) => String(asset?.uri ?? "").trim())
      .filter(Boolean)
      .map((uri: string) => ({ uri }));

    if (!assets.length) return;

    updateNewMadeOrderVariant(index, (prev) => ({
      ...prev,
      images: [...(prev.images ?? []), ...assets],
    }));
  }

  async function pickAndUpload(kind: "image" | "video") {
    if (!vendorId || !selectedId || !selected?.product_code) {
      Alert.alert("Missing", "Select a product first.");
      return;
    }
    if (savingMedia) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow media library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "image" ? ["images"] : ["videos"],
      quality: kind === "image" ? 0.9 : undefined,
      allowsEditing: false,
      allowsMultipleSelection: true,
    });

    if (result.canceled) return;

    const assets = (result.assets ?? []).filter((a: any) => !!a?.uri);
    if (!assets.length) return;

    try {
      setSavingMedia(true);

      const productCode = String(selected.product_code);

      const m = safeJson(selected.media);
      const nextImages = Array.isArray(m.images) ? [...m.images] : [];
      const nextVideos = Array.isArray(m.videos) ? [...m.videos] : [];
      const nextThumbs = Array.isArray(m.thumbs) ? [...m.thumbs] : [];

      const seenUri = new Set<string>();

      for (let i = 0; i < assets.length; i++) {
        const uri = String(assets[i]?.uri || "").trim();
        if (!uri) continue;
        if (seenUri.has(uri)) continue;
        seenUri.add(uri);

        const storagePath = await uploadOneAsset({
          kind,
          uri,
          vendorId,
          productCode,
          index: i,
        });

        if (kind === "image") {
          nextImages.push(storagePath);
        } else {
          nextVideos.push(storagePath);

          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(
              uri,
              {
                time: 1500,
              },
            );

            if (thumbUri) {
              const thumbPath = await uploadOneAsset({
                kind: "image",
                uri: thumbUri,
                vendorId,
                productCode,
                index: i,
              });

              nextThumbs.push(thumbPath);
            }
          } catch {
            // thumb optional
          }
        }
      }

      const next = {
        ...m,
        images: nextImages,
        videos: nextVideos,
        thumbs: nextThumbs,
      };

      const updatePayload = {
        media: next,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, made_on_order, product_category, spec, price, media, created_at, updated_at",
        )
        .single();

      if (error) {
        Alert.alert("Media update failed", error.message);
        return;
      }

      const updated = data as unknown as ProductRow;
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not upload media.");
    } finally {
      setSavingMedia(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <UpdateProductHeader
          hasVendor={Boolean(vendorId)}
          onClose={() => router.back()}
        />
        <ProductPreviewSection
          selected={selected}
          previewImageUrl={previewImageUrl}
          usesVariantInventory={usesVariantInventory}
          stitchedVariantInventoryTotalQty={
            stitchedVariantInventoryInfo.totalQty
          }
          isUnstitched={isUnstitched}
          onBack={() => router.back()}
        />

        <MediaSection
          selected={selected}
          savingMedia={savingMedia}
          imageUrls={imageUrls}
          videoUrls={videoUrls}
          thumbUrls={thumbUrls}
          videoThumbs={videoThumbs}
          moreDescription={moreDescription}
          onMoreDescriptionChange={setMoreDescription}
          onAddImage={() => pickAndUpload("image")}
          onAddVideo={() => pickAndUpload("video")}
          onRemoveImage={confirmRemoveImage}
          onRemoveVideo={confirmRemoveVideo}
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Details</Text>

          {!selected ? (
            <Text style={styles.empty}>Select a product above to edit.</Text>
          ) : (
            <>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Bridal heavy embroidered lehenga"
                placeholderTextColor={stylesVars.placeholder}
                style={styles.input}
                maxLength={80}
              />

              {!Boolean(selected?.made_on_order) &&
              (usesVariantInventory
                ? stitchedVariantInventoryInfo.allOutOfStock
                : Number(inventoryQty ?? 0) <= 0) ? (
                <OutOfStockNotice />
              ) : null}

              <DressTypeField
                priceMode={priceMode}
                madeOnOrder={Boolean(selected?.made_on_order)}
                editedProductCategory={editedProductCategory}
                currentProductCategory={currentProductCategory}
              />

              {!Boolean(selected?.made_on_order) && !usesVariantInventory ? (
                <InventoryStockField
                  isUnstitched={isUnstitched}
                  value={inventoryQtyText}
                  onChangeText={(t) => {
                    const nextText = sanitizeNumber(t);
                    const raw = Number(nextText || "0");
                    const next = Number.isFinite(raw) ? raw : 0;
                    setInventoryQtyText(nextText);
                    setInventoryQty(
                      isUnstitched
                        ? roundMeter(Math.max(0, next))
                        : Math.max(0, Math.trunc(next)),
                    );
                  }}
                />
              ) : null}

              {priceMode === "stitched_total" ? (
                <>
                  <StitchedPricingFields
                    madeOnOrder={Boolean(selected?.made_on_order)}
                    priceTotal={priceTotal}
                    availableSizes={availableSizes}
                    onPriceTotalChangeText={(t) =>
                      setPriceTotal(Number(sanitizeNumber(t) || "0"))
                    }
                    onAvailableSizesChangeText={(t) =>
                      setAvailableSizes(
                        t
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      )
                    }
                  />

                  <StitchedVariantInventorySection
                    variants={stitchedVariants}
                    resolvePublicUrl={resolvePublicUrl}
                    onSizeQtyChange={updateStitchedVariantSizeQty}
                  />

                  {!Boolean(selected?.made_on_order) ? (
                    <View style={styles.appendBox}>
                      <Text style={styles.appendTitle}>
                        Add New Product Styles
                      </Text>
                      {/* <Text style={styles.hint}>Add new styles below.</Text> */}

                      {newReadyVariants.map((variant, index) => (
                        <ReadyVariantDraftCard
                          key={`new-ready-${index}`}
                          variant={variant}
                          index={index}
                          existingVariantCount={stitchedVariants.length}
                          onDiscard={(variantIndex) =>
                            setNewReadyVariants((prev) =>
                              prev.filter((_, i) => i !== variantIndex),
                            )
                          }
                          onNameChange={(variantIndex, value) =>
                            updateNewReadyVariant(variantIndex, (prev) => ({
                              ...prev,
                              name: value,
                            }))
                          }
                          onAdditionalPriceChangeText={(variantIndex, value) =>
                            updateNewReadyVariant(variantIndex, (prev) => ({
                              ...prev,
                              additional_price_pkr: Number(
                                sanitizeNumber(value) || "0",
                              ),
                            }))
                          }
                          onPickImages={pickNewReadyVariantImages}
                          onRemoveImage={(variantIndex, imageIndex) =>
                            updateNewReadyVariant(variantIndex, (prev) => ({
                              ...prev,
                              images: (prev.images ?? []).filter(
                                (_, i) => i !== imageIndex,
                              ),
                            }))
                          }
                          onSizeQtyChange={updateNewReadyVariantSizeQty}
                        />
                      ))}
                      <Pressable
                        onPress={() =>
                          setNewReadyVariants((prev) => [
                            ...prev,
                            makeEmptyReadyVariantDraft(),
                          ])
                        }
                        style={({ pressed }) => [
                          styles.addFullBtn,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text style={styles.addFullBtnText}>
                          + Add New Style
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.appendBox}>
                      <Text style={styles.appendTitle}>
                        Add new made-on-order styles
                      </Text>
                      <Text style={styles.hint}>
                        Already added made-on-order styles:
                      </Text>

                      {readMadeOrderVariants(selected?.price).length ? (
                        <View style={styles.readonlyListBox}>
                          {readMadeOrderVariants(selected?.price).map(
                            (variant, index) => (
                              <Text
                                key={`old-made-${index}`}
                                style={styles.readonlyValue}
                              >
                                {variantDisplayTitle(variant, index + 1)}
                              </Text>
                            ),
                          )}
                        </View>
                      ) : null}

                      {newMadeOrderVariants.map((variant, index) => (
                        <MadeOrderVariantDraftCard
                          key={`new-made-${index}`}
                          variant={variant}
                          index={index}
                          existingVariantCount={
                            readMadeOrderVariants(selected?.price).length
                          }
                          onDiscard={(variantIndex) =>
                            setNewMadeOrderVariants((prev) =>
                              prev.filter((_, i) => i !== variantIndex),
                            )
                          }
                          onNameChange={(variantIndex, value) =>
                            updateNewMadeOrderVariant(variantIndex, (prev) => ({
                              ...prev,
                              name: value,
                            }))
                          }
                          onAdditionalPriceChangeText={(variantIndex, value) =>
                            updateNewMadeOrderVariant(variantIndex, (prev) => ({
                              ...prev,
                              additional_price_pkr: Number(
                                sanitizeNumber(value) || "0",
                              ),
                            }))
                          }
                          onEstimatedDaysChangeText={(variantIndex, value) =>
                            updateNewMadeOrderVariant(variantIndex, (prev) => ({
                              ...prev,
                              estimated_days: Number(
                                sanitizeNumber(value) || "0",
                              ),
                            }))
                          }
                          onPickImages={pickNewMadeOrderVariantImages}
                          onRemoveImage={(variantIndex, imageIndex) =>
                            updateNewMadeOrderVariant(variantIndex, (prev) => ({
                              ...prev,
                              images: (prev.images ?? []).filter(
                                (_, i) => i !== imageIndex,
                              ),
                            }))
                          }
                        />
                      ))}
                      <Pressable
                        onPress={() =>
                          setNewMadeOrderVariants((prev) => [
                            ...prev,
                            makeEmptyMadeOrderVariantDraft(),
                          ])
                        }
                        style={({ pressed }) => [
                          styles.addFullBtn,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text style={styles.addFullBtnText}>
                          + Add New Made-on-order Style
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* <Text style={styles.hint}>
                    Dyeing and stitching services apply only to unstitched
                    products.
                  </Text> */}
                </>
              ) : (
                <>
                  <Text style={styles.label}>Cost per Meter (PKR) *</Text>
                  <FastNumberInput
                    value={String(pricePerMeter ?? "")}
                    onChangeText={(t) =>
                      setPricePerMeter(Number(sanitizeNumber(t) || "0"))
                    }
                    placeholder="e.g., 1800"
                    placeholderTextColor={stylesVars.placeholder}
                    style={styles.input}
                    keyboardType="decimal-pad"
                    maxLength={12}
                  />

                  <View style={styles.inlineToggleRow}>
                    <Text style={[styles.label, { marginTop: 0 }]}>
                      Dyeable
                    </Text>

                    <Pressable
                      onPress={() => {
                        if (!isUnstitched) return;
                        if (dyeingEnabled && tailoringEnabled) {
                          Alert.alert(
                            "Dyeing is required",
                            "Turn off stitching before turning off dyeing.",
                          );
                          return;
                        }
                        setDyeingEnabled((v) => !v);
                      }}
                      style={({ pressed }) => [
                        styles.inlineTogglePill,
                        dyeingEnabled ? styles.inlineTogglePillOn : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.inlineTogglePillText,
                          dyeingEnabled ? styles.inlineTogglePillTextOn : null,
                        ]}
                      >
                        {dyeingEnabled ? "Yes" : "No"}
                      </Text>
                    </Pressable>
                  </View>

                  {dyeingEnabled ? (
                    <>
                      <Text style={styles.hint}>
                        Buyer will pick a dye shade at checkout.
                      </Text>

                      <Text style={styles.label}>Dyeing Cost (PKR) *</Text>
                      <FastNumberInput
                        value={String(dyeingCost ?? "")}
                        onChangeText={(t) =>
                          setDyeingCost(Number(sanitizeNumber(t) || "0"))
                        }
                        placeholder="e.g., 800"
                        placeholderTextColor={stylesVars.placeholder}
                        style={styles.input}
                        keyboardType="decimal-pad"
                        maxLength={12}
                      />
                    </>
                  ) : null}

                  <View style={styles.inlineToggleRow}>
                    <Text style={[styles.label, { marginTop: 0 }]}>
                      Stitching available
                    </Text>

                    <Pressable
                      onPress={() => {
                        if (!isUnstitched) return;
                        if (!vendorOffersTailoring) {
                          Alert.alert(
                            "Tailoring not enabled",
                            "This vendor profile does not offer tailoring.",
                          );
                          return;
                        }
                        setTailoringEnabled((v) => {
                          const next = !v;
                          if (next) setDyeingEnabled(true);
                          return next;
                        });
                      }}
                      style={({ pressed }) => [
                        styles.inlineTogglePill,
                        tailoringEnabled ? styles.inlineTogglePillOn : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.inlineTogglePillText,
                          tailoringEnabled
                            ? styles.inlineTogglePillTextOn
                            : null,
                        ]}
                      >
                        {tailoringEnabled ? "Yes" : "No"}
                      </Text>
                    </Pressable>
                  </View>

                  {vendorLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator />
                      <Text style={styles.loadingText}>
                        Loading tailoring styles…
                      </Text>
                    </View>
                  ) : null}

                  {!vendorLoading && !vendorOffersTailoring ? (
                    <Text style={styles.hint}>
                      Vendor profile currently does not offer tailoring.
                    </Text>
                  ) : null}

                  {tailoringEnabled ? (
                    <>
                      <Text style={styles.label}>Tailoring Cost (PKR) *</Text>
                      <FastNumberInput
                        value={String(tailoringCost ?? "")}
                        onChangeText={(t) =>
                          setTailoringCost(Number(sanitizeNumber(t) || "0"))
                        }
                        placeholder="e.g., 2500"
                        placeholderTextColor={stylesVars.placeholder}
                        style={styles.input}
                        keyboardType="decimal-pad"
                        maxLength={12}
                      />

                      <Text style={styles.label}>
                        Tailoring Turnaround (days)
                      </Text>
                      <FastNumberInput
                        value={String(tailoringTurnaroundDays ?? "")}
                        onChangeText={(t) =>
                          setTailoringTurnaroundDays(
                            Number(sanitizeNumber(t) || "0"),
                          )
                        }
                        placeholder="e.g., 12"
                        placeholderTextColor={stylesVars.placeholder}
                        style={styles.input}
                        keyboardType="number-pad"
                        maxLength={3}
                      />

                      {existingTailoringStylePresets.length ? null : (
                        <>
                          <Text style={styles.label}>Neck Styles</Text>
                          {blouseNeckOptions.length ? (
                            <View style={styles.optionWrap}>
                              {blouseNeckOptions.map((item) => (
                                <SelectionPill
                                  key={`neck-${item}`}
                                  label={item}
                                  selected={selectedTailoringStyles.blouse_neck.includes(
                                    item,
                                  )}
                                  onPress={() =>
                                    toggleStyle("blouse_neck", item)
                                  }
                                />
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.emptyInline}>
                              No neck styles found in vendor profile.
                            </Text>
                          )}

                          <Text style={styles.label}>Sleeve Styles</Text>
                          {sleeveOptions.length ? (
                            <View style={styles.optionWrap}>
                              {sleeveOptions.map((item) => (
                                <SelectionPill
                                  key={`sleeve-${item}`}
                                  label={item}
                                  selected={selectedTailoringStyles.sleeves.includes(
                                    item,
                                  )}
                                  onPress={() => toggleStyle("sleeves", item)}
                                />
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.emptyInline}>
                              No sleeve styles found in vendor profile.
                            </Text>
                          )}

                          <Text style={styles.label}>Trouser Styles</Text>
                          {trouserOptions.length ? (
                            <View style={styles.optionWrap}>
                              {trouserOptions.map((item) => (
                                <SelectionPill
                                  key={`trouser-${item}`}
                                  label={item}
                                  selected={selectedTailoringStyles.trouser.includes(
                                    item,
                                  )}
                                  onPress={() => toggleStyle("trouser", item)}
                                />
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.emptyInline}>
                              No trouser styles found in vendor profile.
                            </Text>
                          )}

                          {!hasAnyVendorStyleOptions ? (
                            <Text style={styles.hint}>
                              Add tailoring styles in vendor profile
                              first, then return here.
                            </Text>
                          ) : null}
                        </>
                      )}

                      <View style={styles.appendBox}>
                        <Text style={styles.appendTitle}>
                          Add new tailoring style cards
                        </Text>
                        <Text style={styles.hint}>
                          Existing tailoring style cards remain active. New
                          style cards become available after Save Changes.
                        </Text>

                        {existingTailoringStylePresets.length ? (
                          <View style={styles.readonlyListBox}>
                            {existingTailoringStylePresets.map(
                              (style, index) => (
                                <Text
                                  key={`old-style-${index}`}
                                  style={styles.readonlyValue}
                                >
                                  {index + 1}. {safeText(style?.title)}
                                </Text>
                              ),
                            )}
                          </View>
                        ) : null}

                        {newTailoringStyles.map((style, index) => (
                          <TailoringStyleDraftCard
                            key={`new-tailoring-style-${index}`}
                            style={style}
                            index={index}
                            existingStyleCount={
                              existingTailoringStylePresets.length
                            }
                            newStyleCount={newTailoringStyles.length}
                            blouseNeckOptions={blouseNeckOptions}
                            sleeveOptions={sleeveOptions}
                            trouserOptions={trouserOptions}
                            onDiscard={(styleIndex) =>
                              setNewTailoringStyles((prev) =>
                                prev.filter((_, i) => i !== styleIndex),
                              )
                            }
                            onTitleChange={(styleIndex, value) =>
                              updateNewTailoringStyle(styleIndex, (prev) => ({
                                ...prev,
                                title: value,
                              }))
                            }
                            onNoteChange={(styleIndex, value) =>
                              updateNewTailoringStyle(styleIndex, (prev) => ({
                                ...prev,
                                note: value,
                              }))
                            }
                            onExtraCostChangeText={(styleIndex, value) =>
                              updateNewTailoringStyle(styleIndex, (prev) => ({
                                ...prev,
                                extra_cost_pkr: Number(
                                  sanitizeNumber(value) || "0",
                                ),
                              }))
                            }
                            onToggleOption={toggleNewTailoringStyleOption}
                            onPickImages={pickNewTailoringStyleImages}
                          />
                        ))}
                        <Pressable
                          onPress={() =>
                            setNewTailoringStyles((prev) => [
                              ...prev,
                              makeEmptyTailoringStyleDraft(),
                            ])
                          }
                          style={({ pressed }) => [
                            styles.addFullBtn,
                            pressed ? styles.pressed : null,
                          ]}
                        >
                          <Text style={styles.addFullBtnText}>
                            + Add New Tailoring Style Card
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </>
              )}
            </>
          )}
        </View>

        {!vendorId ? (
          <Text style={styles.warn}>
            Vendor not loaded. Please ensure vendorSlice has vendor.id (bigint).
          </Text>
        ) : null}
      </ScrollView>

      <UpdateProductBottomBar
        visible={Boolean(selected)}
        canSave={canSave}
        saving={saving}
        onCancel={() => router.back()}
        onSave={saveUpdate}
      />
    </View>
  );
}
