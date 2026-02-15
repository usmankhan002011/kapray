import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";
import * as ImagePicker from "expo-image-picker";

export type PriceMode = "unstitched_per_meter" | "stitched_total";

export type ProductDraftSpec = {
  dressTypeIds: number[];
  fabricTypeIds: string[];
  colorShadeIds: string[]; // red/green/...
  workTypeIds: string[];
  workDensityIds: string[];
  originCityIds: string[];
  wearStateIds: string[];
};

export type ProductDraftPrice = {
  currency: "PKR";
  mode: PriceMode;
  cost_pkr_per_meter?: number | null; // unstitched
  cost_pkr_total?: number | null; // stitched / ready-to-wear
  available_sizes?: string[]; // stitched / ready-to-wear only
};

export type ProductDraftMedia = {
  // During draft: ImagePicker assets (local URIs)
  // After upload step later: we will also store storage paths into DB
  images: ImagePicker.ImagePickerAsset[];
  videos: ImagePicker.ImagePickerAsset[];
};

export type ProductDraft = {
  title: string;
  inventory_qty: number;
  spec: ProductDraftSpec;
  price: ProductDraftPrice;
  media: ProductDraftMedia;
};

type ProductDraftContextValue = {
  draft: ProductDraft;

  setTitle: (title: string) => void;
  setInventoryQty: (qty: number) => void;

  setPriceMode: (mode: PriceMode) => void;
  setPricePerMeter: (value: number | null) => void;
  setPriceTotal: (value: number | null) => void;
  setAvailableSizes: (sizes: string[]) => void;

  // Selection setters (modal screens write here)
  setDressTypeIds: (ids: number[]) => void;
  setFabricTypeIds: (ids: string[]) => void;
  setColorShadeIds: (ids: string[]) => void;
  setWorkTypeIds: (ids: string[]) => void;
  setWorkDensityIds: (ids: string[]) => void;
  setOriginCityIds: (ids: string[]) => void;
  setWearStateIds: (ids: string[]) => void;

  // Media setters (add-product writes here)
  setImages: (
    next:
      | ImagePicker.ImagePickerAsset[]
      | ((prev: ImagePicker.ImagePickerAsset[]) => ImagePicker.ImagePickerAsset[])
  ) => void;

  setVideos: (
    next:
      | ImagePicker.ImagePickerAsset[]
      | ((prev: ImagePicker.ImagePickerAsset[]) => ImagePicker.ImagePickerAsset[])
  ) => void;

  // For later edit flow: hydrate draft from DB record
  setDraft: (next: ProductDraft) => void;

  resetDraft: () => void;
};

const DEFAULT_DRAFT: ProductDraft = {
  title: "",
  inventory_qty: 0,
  spec: {
    dressTypeIds: [],
    fabricTypeIds: [],
    colorShadeIds: [],
    workTypeIds: [],
    workDensityIds: [],
    originCityIds: [],
    wearStateIds: []
  },
  price: {
    currency: "PKR",
    mode: "stitched_total",
    cost_pkr_per_meter: null,
    cost_pkr_total: null,
    available_sizes: []
  },
  media: {
    images: [],
    videos: []
  }
};

const ProductDraftContext = createContext<ProductDraftContextValue | null>(null);

export function ProductDraftProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [draft, _setDraft] = useState<ProductDraft>(DEFAULT_DRAFT);

  const setDraft = useCallback((next: ProductDraft) => {
    _setDraft(next);
  }, []);

  const resetDraft = useCallback(() => {
    _setDraft(DEFAULT_DRAFT);
  }, []);

  const setTitle = useCallback((title: string) => {
    _setDraft((prev) => ({ ...prev, title }));
  }, []);

  const setInventoryQty = useCallback((qty: number) => {
    const safe = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
    _setDraft((prev) => ({ ...prev, inventory_qty: safe }));
  }, []);

  const setPriceMode = useCallback((mode: PriceMode) => {
    _setDraft((prev) => {
      if (mode === prev.price.mode) return prev;

      const nextPrice: ProductDraftPrice = {
        ...prev.price,
        mode
      };

      // UX: keep only the relevant field populated
      if (mode === "unstitched_per_meter") {
        nextPrice.cost_pkr_total = null;
        nextPrice.available_sizes = [];
      } else {
        nextPrice.cost_pkr_per_meter = null;
      }

      return { ...prev, price: nextPrice };
    });
  }, []);

  const setPricePerMeter = useCallback((value: number | null) => {
    _setDraft((prev) => ({
      ...prev,
      price: {
        ...prev.price,
        cost_pkr_per_meter: value
      }
    }));
  }, []);

  const setPriceTotal = useCallback((value: number | null) => {
    _setDraft((prev) => ({
      ...prev,
      price: {
        ...prev.price,
        cost_pkr_total: value
      }
    }));
  }, []);

  const setAvailableSizes = useCallback((sizes: string[]) => {
    _setDraft((prev) => ({
      ...prev,
      price: { ...prev.price, available_sizes: sizes }
    }));
  }, []);

  const setDressTypeIds = useCallback((ids: number[]) => {
    _setDraft((prev) => ({
      ...prev,
      spec: { ...prev.spec, dressTypeIds: ids }
    }));
  }, []);

  const setFabricTypeIds = useCallback((ids: string[]) => {
    _setDraft((prev) => ({
      ...prev,
      spec: { ...prev.spec, fabricTypeIds: ids }
    }));
  }, []);

  const setColorShadeIds = useCallback((ids: string[]) => {
    _setDraft((prev) => ({
      ...prev,
      spec: { ...prev.spec, colorShadeIds: ids }
    }));
  }, []);

  const setWorkTypeIds = useCallback((ids: string[]) => {
    _setDraft((prev) => ({
      ...prev,
      spec: { ...prev.spec, workTypeIds: ids }
    }));
  }, []);

  const setWorkDensityIds = useCallback((ids: string[]) => {
    _setDraft((prev) => ({
      ...prev,
      spec: { ...prev.spec, workDensityIds: ids }
    }));
  }, []);

  const setOriginCityIds = useCallback((ids: string[]) => {
    _setDraft((prev) => ({
      ...prev,
      spec: { ...prev.spec, originCityIds: ids }
    }));
  }, []);

  const setWearStateIds = useCallback((ids: string[]) => {
    _setDraft((prev) => ({
      ...prev,
      spec: { ...prev.spec, wearStateIds: ids }
    }));
  }, []);

  const setImages = useCallback(
    (
      next:
        | ImagePicker.ImagePickerAsset[]
        | ((
            prev: ImagePicker.ImagePickerAsset[]
          ) => ImagePicker.ImagePickerAsset[])
    ) => {
      _setDraft((prev) => {
        const nextImages =
          typeof next === "function" ? (next as any)(prev.media.images) : next;

        return {
          ...prev,
          media: { ...prev.media, images: nextImages }
        };
      });
    },
    []
  );

  const setVideos = useCallback(
    (
      next:
        | ImagePicker.ImagePickerAsset[]
        | ((
            prev: ImagePicker.ImagePickerAsset[]
          ) => ImagePicker.ImagePickerAsset[])
    ) => {
      _setDraft((prev) => {
        const nextVideos =
          typeof next === "function" ? (next as any)(prev.media.videos) : next;

        return {
          ...prev,
          media: { ...prev.media, videos: nextVideos }
        };
      });
    },
    []
  );

  const value = useMemo<ProductDraftContextValue>(
    () => ({
      draft,

      setTitle,
      setInventoryQty,

      setPriceMode,
      setPricePerMeter,
      setPriceTotal,
      setAvailableSizes,

      setDressTypeIds,
      setFabricTypeIds,
      setColorShadeIds,
      setWorkTypeIds,
      setWorkDensityIds,
      setOriginCityIds,
      setWearStateIds,

      setImages,
      setVideos,

      setDraft,
      resetDraft
    }),
    [
      draft,
      setTitle,
      setInventoryQty,
      setPriceMode,
      setPricePerMeter,
      setPriceTotal,
      setAvailableSizes,
      setDressTypeIds,
      setFabricTypeIds,
      setColorShadeIds,
      setWorkTypeIds,
      setWorkDensityIds,
      setOriginCityIds,
      setWearStateIds,
      setImages,
      setVideos,
      setDraft,
      resetDraft
    ]
  );

  return (
    <ProductDraftContext.Provider value={value}>
      {children}
    </ProductDraftContext.Provider>
  );
}

export function useProductDraft() {
  const ctx = useContext(ProductDraftContext);
  if (!ctx) {
    throw new Error("useProductDraft must be used within ProductDraftProvider");
  }
  return ctx;
}
