import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  ComponentProps,
  forwardRef,
  ReactNode,
  useEffect,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  type TextInput,
  type TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { usePathname, useRouter } from "expo-router";

import { useProductDraft } from "@/components/product/ProductDraftContext";
import {
  apColors,
  apStyles,
} from "@/components/product/addProductStyles";
import {
  AppTextInput,
  type AppTextInputProps,
} from "@/components/ui/AppTextInput";

export type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

type WizardStep = {
  key: string;
  label: string;
  match: (pathname: string) => boolean;
};

function isStitchedStylePath(pathname: string) {
  return (
    pathname.includes("/q06b1-ready-variant-choice") ||
    pathname.includes("/q06b1-simple-ready-inventory") ||
    pathname.includes("/q06b2-piece-count") ||
    pathname.includes("/q06b3-ready-variants") ||
    pathname.includes("/q06b4-made-order-variant-choice") ||
    pathname.includes("/q06b4-made-order-variants")
  );
}

function isStylePath(pathname: string) {
  return (
    isStitchedStylePath(pathname) ||
    pathname.includes("/q06b2-tailoring-styles")
  );
}

const STEPS: WizardStep[] = [
  {
    key: "basics",
    label: "Basics",
    match: (p) =>
      p.endsWith("/add-product") ||
      p.includes("/q01-title") ||
      p.includes("/q02-category") ||
      p.includes("/q03-made-on-order"),
  },
  {
    key: "pricing",
    label: "Pricing",
    match: (p) =>
      p.includes("/q04-inventory") ||
      p.includes("/q05") ||
      p.includes("/q06a") ||
      p.includes("/q06b-services-costs"),
  },
  {
    key: "shipping",
    label: "Shipping",
    match: (p) => p.includes("/q06c-shipping"),
  },
  {
    key: "media",
    label: "Media",
    match: (p) => p.includes("/q09-images") || p.includes("/q10-videos"),
  },
  {
    key: "styles",
    label: "Styles",
    match: isStylePath,
  },
  {
    key: "details",
    label: "Details",
    match: (p) => p.includes("/q11-description") || p.includes("/q12-more"),
  },
  {
    key: "review",
    label: "Review",
    match: (p) => p.includes("/review") || p.includes("/submit"),
  },
];

function moveStylesAfterDetails(steps: WizardStep[]) {
  const styleStep = steps.find((step) => step.key === "styles");
  const withoutStyle = steps.filter((step) => step.key !== "styles");
  const detailsIndex = withoutStyle.findIndex((step) => step.key === "details");

  if (!styleStep || detailsIndex < 0) return steps;

  return [
    ...withoutStyle.slice(0, detailsIndex + 1),
    styleStep,
    ...withoutStyle.slice(detailsIndex + 1),
  ];
}

const STEPS_STYLE_AFTER_DETAILS = moveStylesAfterDetails(STEPS);

function getVisibleSteps(pathname: string, draft: any) {
  const spec = draft?.spec ?? {};
  const isStitched = String(spec?.product_category ?? "") === "stitched_ready";
  const isReadyStyleFlow =
    isStitched ||
    Boolean(spec?.has_ready_variants) ||
    spec?.variant_mode === "ready_variants" ||
    spec?.variant_mode === "made_order_variants" ||
    isStitchedStylePath(pathname);
  const includeStyles =
    Boolean(spec?.tailoring_enabled) ||
    isReadyStyleFlow ||
    isStylePath(pathname);

  if (!includeStyles) return STEPS.filter((step) => step.key !== "styles");

  return isReadyStyleFlow ? STEPS : STEPS_STYLE_AFTER_DETAILS;
}

function getActiveStep(pathname: string, steps: WizardStep[]) {
  const index = steps.findIndex((step) => step.match(pathname));
  return index >= 0 ? index : 0;
}

function hasNonEmptyArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function hasPositiveNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function hasText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

export function isPristineProductDraft(draft: any) {
  const spec = draft?.spec ?? {};
  const price = draft?.price ?? {};
  const media = draft?.media ?? {};

  return !(
    hasText(draft?.title) ||
    hasPositiveNumber(draft?.inventory_qty) ||
    hasText(spec?.product_category) ||
    spec?.made_on_order === true ||
    hasText(spec?.more_description) ||
    hasNonEmptyArray(spec?.more_description_parts) ||
    hasNonEmptyArray(spec?.dressTypeIds) ||
    hasNonEmptyArray(spec?.fabricTypeIds) ||
    hasNonEmptyArray(spec?.colorShadeIds) ||
    hasNonEmptyArray(spec?.workTypeIds) ||
    hasNonEmptyArray(spec?.workDensityIds) ||
    hasNonEmptyArray(spec?.originCityIds) ||
    hasNonEmptyArray(spec?.wearStateIds) ||
    hasNonEmptyArray(media?.images) ||
    hasNonEmptyArray(media?.videos) ||
    hasPositiveNumber(price?.cost_pkr_per_meter) ||
    hasPositiveNumber(price?.cost_pkr_total) ||
    hasNonEmptyArray(price?.available_sizes) ||
    hasNonEmptyArray(price?.simple_ready_inventory) ||
    hasNonEmptyArray(price?.variants) ||
    hasNonEmptyArray(price?.made_order_variants)
  );
}

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return visible;
}

export function AddProductProgress() {
  const pathname = usePathname();
  const { draft } = useProductDraft() as any;
  const currentPath = pathname ?? "";
  const steps = getVisibleSteps(currentPath, draft);
  const activeIndex = getActiveStep(currentPath, steps);

  return (
    <View
      accessibilityLabel={`Product progress: ${steps[activeIndex]?.label ?? ""}`}
      style={apStyles.progressWrap}
    >
      {steps.map((step, index) => {
        const active = index === activeIndex;

        return (
          <View
            key={step.key}
            pointerEvents="none"
            style={[apStyles.progressPill, active ? apStyles.progressPillOn : null]}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={[
                apStyles.progressText,
                active ? apStyles.progressTextOn : null,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function AddProductIconButton({
  icon,
  label,
  onPress,
}: {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        apStyles.iconBtn,
        pressed ? apStyles.pressed : null,
      ]}
    >
      <MaterialIcons name={icon} size={20} color={apColors.blue} />
    </Pressable>
  );
}

export function AddProductHeader({
  title,
  onBack,
  backLabel = "Close",
  backIcon,
  showProgress = true,
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
  backIcon?: MaterialIconName;
  showProgress?: boolean;
}) {
  return (
    <>
      <View style={apStyles.headerRow}>
        <Text style={apStyles.title}>{title}</Text>
        {backIcon ? (
          <AddProductIconButton
            icon={backIcon}
            label={backLabel}
            onPress={onBack}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}
            style={({ pressed }) => [
              apStyles.linkBtn,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={apStyles.linkText}>{backLabel}</Text>
          </Pressable>
        )}
      </View>
      {showProgress ? <AddProductProgress /> : null}
    </>
  );
}

export function AddProductPrimaryButton({
  label,
  icon,
  disabled,
  onPress,
  style,
}: {
  label: string;
  icon?: MaterialIconName | null;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        apStyles.primaryBtn,
        disabled ? apStyles.primaryBtnDisabled : null,
        style,
        pressed ? apStyles.pressed : null,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={apStyles.iconTextRow}>
        <Text style={apStyles.primaryText}>{label}</Text>
        {icon ? (
          <MaterialIcons name={icon} size={18} color={apColors.white} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function AddProductSecondaryButton({
  label,
  icon,
  onPress,
  disabled,
  style,
}: {
  label: string;
  icon?: MaterialIconName | null;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        apStyles.secondaryBtn,
        disabled ? apStyles.primaryBtnDisabled : null,
        style,
        pressed ? apStyles.pressed : null,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={apStyles.iconTextRow}>
        {icon ? <MaterialIcons name={icon} size={18} color={apColors.blue} /> : null}
        <Text style={apStyles.secondaryText}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function AddProductFooter({
  topContent,
  primaryLabel = "Continue",
  primaryIcon,
  onPrimaryPress,
  primaryDisabled,
  disabledHint,
  secondaryLabel,
  secondaryIcon,
  onSecondaryPress,
  secondaryDisabled,
}: {
  topContent?: ReactNode;
  primaryLabel?: string;
  primaryIcon?: MaterialIconName | null;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  disabledHint?: string;
  secondaryLabel?: string;
  secondaryIcon?: MaterialIconName | null;
  onSecondaryPress?: () => void;
  secondaryDisabled?: boolean;
}) {
  const keyboardVisible = useKeyboardVisible();

  return (
    <View
      style={[
        apStyles.footer,
        keyboardVisible ? apStyles.footerKeyboardVisible : null,
      ]}
    >
      {topContent}

      {disabledHint ? (
        <Text
          style={[
            apStyles.footerHint,
            primaryDisabled ? apStyles.footerHintWarn : null,
          ]}
        >
          {disabledHint}
        </Text>
      ) : null}

      {secondaryLabel && onSecondaryPress ? (
        <AddProductSecondaryButton
          label={secondaryLabel}
          icon={secondaryIcon}
          onPress={onSecondaryPress}
          disabled={secondaryDisabled}
        />
      ) : null}

      <AddProductPrimaryButton
        label={primaryLabel}
        icon={primaryIcon}
        onPress={onPrimaryPress}
        disabled={primaryDisabled}
      />
    </View>
  );
}

export function AddProductCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[apStyles.card, style]}>{children}</View>;
}

export function AddProductField({
  label,
  hint,
  required,
  children,
  style,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[apStyles.fieldBlock, style]}>
      <Text style={apStyles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      {hint ? <Text style={apStyles.helperText}>{hint}</Text> : null}
      {children}
    </View>
  );
}

type AddProductInputProps = AppTextInputProps;

export const AddProductInput = forwardRef<TextInput, AddProductInputProps>(
  function AddProductInput(
    {
      placeholderTextColor = apColors.muted,
      style,
      ...props
    },
    ref,
  ) {
    return (
      <AppTextInput
        {...props}
        ref={ref}
        placeholderTextColor={placeholderTextColor}
        style={[apStyles.input, style]}
      />
    );
  },
);

export function AddProductNotice({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "warning" | "success";
}) {
  return (
    <View
      style={[
        apStyles.notice,
        tone === "warning" ? apStyles.noticeWarning : null,
        tone === "success" ? apStyles.noticeSuccess : null,
      ]}
    >
      {title ? <Text style={apStyles.noticeTitle}>{title}</Text> : null}
      {typeof children === "string" ? (
        <Text style={apStyles.noticeText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function AddProductChoice({
  title,
  description,
  selected,
  onPress,
  disabled,
  icon,
  showCheckIcon = false,
}: {
  title: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  icon?: MaterialIconName;
  showCheckIcon?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected), disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        apStyles.segment,
        selected ? apStyles.segmentOn : null,
        disabled ? apStyles.segmentDisabled : null,
        pressed ? apStyles.pressed : null,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {icon ? (
          <MaterialIcons
            name={icon}
            size={20}
            color={selected ? apColors.blue : apColors.muted}
          />
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              apStyles.segmentText,
              selected ? apStyles.segmentTextOn : null,
            ]}
          >
            {title}
          </Text>
          {description ? (
            <Text style={apStyles.choiceDescription}>{description}</Text>
          ) : null}
        </View>
        {selected && showCheckIcon ? (
          <MaterialIcons name="check-circle" size={20} color={apColors.blue} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function AddProductChip({
  label,
  selected,
  onPress,
  disabled,
  textStyle,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected), disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        apStyles.sizeChip,
        selected ? apStyles.sizeChipOn : null,
        disabled ? apStyles.segmentDisabled : null,
        pressed ? apStyles.pressed : null,
      ]}
    >
      <Text
        style={[
          apStyles.sizeChipText,
          selected ? apStyles.sizeChipTextOn : null,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AddProductScreen({
  title,
  onBack,
  backLabel,
  backIcon,
  children,
  footer,
  contentStyle,
  showProgress = true,
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
  backIcon?: MaterialIconName;
  children: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  showProgress?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { draft, draftResetReason, draftSessionId } = useProductDraft() as any;

  useEffect(() => {
    const currentPath = pathname ?? "";
    const normalizedPath =
      currentPath.length > 1 && currentPath.endsWith("/")
        ? currentPath.slice(0, -1)
        : currentPath;

    if (!normalizedPath.startsWith("/vendor/profile/add-product")) return;
    if (normalizedPath === "/vendor/profile/add-product") return;
    if (draftResetReason !== "start-new-product") return;
    if (!isPristineProductDraft(draft)) return;

    router.replace("/vendor/profile/add-product" as any);
  }, [draft, draftResetReason, draftSessionId, pathname, router]);

  return (
    <KeyboardAvoidingView
      style={apStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={apStyles.screen}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          style={apStyles.screen}
          contentContainerStyle={[
            apStyles.content,
            footer ? apStyles.contentWithFooter : null,
            contentStyle,
          ]}
        >
          <AddProductHeader
            title={title}
            onBack={onBack}
            backLabel={backLabel}
            backIcon={backIcon}
            showProgress={showProgress}
          />
          {children}
        </ScrollView>
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}
