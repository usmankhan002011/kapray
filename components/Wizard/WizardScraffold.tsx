import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>{backLabel}</Text>
            </Pressable>

            <Text style={styles.stepText}>
              Step {stepIndex + 1} of {totalSteps}
            </Text>
          </View>

          <Text style={styles.title}>{title}</Text>

          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Progress */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={onNext}
            disabled={nextDisabled}
            style={({ pressed }) => [
              styles.nextButton,
              nextDisabled && styles.nextButtonDisabled,
              pressed && !nextDisabled && styles.pressed,
            ]}
          >
            <Text style={styles.nextButtonText}>{nextLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },

  flex: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 10,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  backButtonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },

  stepText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },

  title: {
    marginTop: 16,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    fontWeight: "500",
  },

  progressTrack: {
    marginTop: 18,
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 22,
  },

  nextButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },

    elevation: 3,
  },

  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  nextButtonDisabled: {
    opacity: 0.5,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
  },
});
