// File: components/Wizard/WizardScraffold.tsx

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import {
  apColors,
  apFontFamily,
  apRadii,
  apSpacing,
} from "@/components/product/addProductStyles";

interface WizardScaffoldProps {
  title: string;
  subtitle?: string;
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
}

export default function WizardScaffold({
  title,
  subtitle,
  stepIndex,
  totalSteps,
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
  nextDisabled = false,
  children,
}: WizardScaffoldProps) {
  const progress = ((stepIndex + 1) / totalSteps) * 100;
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const windowHeight = Dimensions.get("window").height;
      const screenY = Number(event.endCoordinates?.screenY ?? 0);
      const fallbackHeight = Number(event.endCoordinates?.height ?? 0);
      const overlap = screenY > 0 ? Math.max(0, windowHeight - screenY) : 0;
      const nextInset = Math.max(overlap, fallbackHeight);

      setKeyboardInset(nextInset);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.keyboardRoot}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          enableOnAndroid
          extraScrollHeight={12}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <Pressable
                accessibilityRole="button"
                onPress={onBack}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={18}
                  color={apColors.text}
                />
                <Text style={styles.backButtonText}>{backLabel}</Text>
              </Pressable>

              <Text style={styles.stepText}>
                Step {stepIndex + 1} of {totalSteps}
              </Text>
            </View>

            <Text style={styles.title}>{title}</Text>

            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          <View style={styles.content}>{children}</View>
        </KeyboardAwareScrollView>

        <View
          style={[
            styles.footer,
            keyboardInset > 0
              ? { paddingBottom: keyboardInset + 28 }
              : null,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={onNext}
            disabled={nextDisabled}
            style={({ pressed }) => [
              styles.nextButton,
              nextDisabled && styles.nextButtonDisabled,
              pressed && !nextDisabled && styles.pressed,
            ]}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.nextButtonText}>{nextLabel}</Text>
              <MaterialIcons
                name="arrow-forward"
                size={18}
                color={apColors.white}
              />
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: apColors.bg,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },

  scroll: {
    flex: 1,
  },

  keyboardRoot: {
    flex: 1,
  },

  header: {
    paddingHorizontal: apSpacing.pagePad,
    paddingTop: apSpacing.pagePad,
    paddingBottom: 8,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: apRadii.control,
    backgroundColor: apColors.card,
    borderWidth: 1,
    borderColor: apColors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  backButtonText: {
    color: apColors.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: apFontFamily,
  },

  stepText: {
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: apFontFamily,
  },

  title: {
    marginTop: 16,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: apColors.text,
    fontFamily: apFontFamily,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: apColors.muted,
    fontWeight: "500",
    fontFamily: apFontFamily,
  },

  progressTrack: {
    marginTop: 16,
    width: "100%",
    height: 6,
    borderRadius: apRadii.pill,
    backgroundColor: apColors.border,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: apColors.blue,
  },

  content: {
    paddingHorizontal: apSpacing.pagePad,
    paddingTop: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },

  footer: {
    paddingHorizontal: apSpacing.pagePad,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: apColors.border,
    backgroundColor: "rgba(248,250,252,0.98)",
  },

  nextButton: {
    minHeight: 52,
    borderRadius: apRadii.control,
    backgroundColor: apColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  nextButtonText: {
    color: apColors.white,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: apFontFamily,
  },

  nextButtonDisabled: {
    opacity: 0.5,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
  },
});
