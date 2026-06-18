import React, { forwardRef } from "react";
import { type TextInput } from "react-native";
import {
  AppTextInput,
  type AppTextInputProps,
} from "@/components/ui/AppTextInput";

function sanitizeNumberText(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

type Props = Omit<
  AppTextInputProps,
  "commitDelayMs" | "commitMode" | "onChangeText" | "sanitizeText"
> & {
  value: string | number | null | undefined;
  onChangeText: (text: string) => void;
  sanitize?: (text: string) => string;
  commitDelayMs?: number;
};

const FastNumberInput = forwardRef<TextInput, Props>(function FastNumberInput(
  {
    value,
    onChangeText,
    sanitize = sanitizeNumberText,
    commitDelayMs = 90,
    ...props
  },
  ref,
) {
  return (
    <AppTextInput
      {...props}
      ref={ref}
      commitDelayMs={commitDelayMs}
      commitMode="debounce"
      onChangeText={onChangeText}
      sanitizeText={sanitize}
      value={value == null ? "" : String(value)}
    />
  );
});

export default FastNumberInput;
