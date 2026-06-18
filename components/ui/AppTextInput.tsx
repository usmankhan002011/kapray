import React, {
  forwardRef,
  type MutableRefObject,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  Platform,
  TextInput,
  type TextInputProps,
  type TextStyle,
} from "react-native";

type CommitMode = "change" | "debounce" | "blur";

export const appInputFontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

export const appInputTextStyle: TextStyle = {
  fontFamily: appInputFontFamily,
  fontWeight: "500",
  includeFontPadding: false,
  letterSpacing: 0,
};

export type AppTextInputProps = Omit<TextInputProps, "onChangeText"> & {
  commitDelayMs?: number;
  commitMode?: CommitMode;
  onChangeText?: (text: string) => void;
  sanitizeText?: (text: string) => string;
  textValueRef?: MutableRefObject<string>;
};

function cleanText(text: string, sanitizeText?: (text: string) => string) {
  return sanitizeText ? sanitizeText(text) : text;
}

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  function AppTextInput(
    {
      commitDelayMs = 90,
      commitMode = "change",
      defaultValue,
      onBlur,
      onChangeText,
      onSubmitEditing,
      sanitizeText,
      style,
      textValueRef,
      value,
      ...props
    },
    ref,
  ) {
    const inputRef = useRef<TextInput>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasUncommittedTextRef = useRef(false);
    const initialText = cleanText(
      String(value ?? defaultValue ?? ""),
      sanitizeText,
    );
    const textRef = useRef(initialText);

    useImperativeHandle(ref, () => inputRef.current as TextInput);

    useEffect(() => {
      if (value === undefined || hasUncommittedTextRef.current) return;

      const next = cleanText(String(value ?? ""), sanitizeText);
      if (textRef.current === next) return;

      textRef.current = next;
      if (textValueRef) textValueRef.current = next;
      inputRef.current?.setNativeProps({ text: next });
    }, [sanitizeText, textValueRef, value]);

    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    function emit(next: string) {
      onChangeText?.(next);
    }

    function scheduleEmit(next: string) {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        hasUncommittedTextRef.current = false;
        emit(next);
        timerRef.current = null;
      }, commitDelayMs);
    }

    function flush() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      hasUncommittedTextRef.current = false;
      emit(textRef.current);
    }

    function handleChangeText(raw: string) {
      const next = cleanText(raw, sanitizeText);

      if (next !== raw) {
        inputRef.current?.setNativeProps({ text: next });
      }

      textRef.current = next;
      if (textValueRef) textValueRef.current = next;

      if (commitMode === "change") {
        hasUncommittedTextRef.current = false;
        emit(next);
      } else if (commitMode === "debounce") {
        hasUncommittedTextRef.current = true;
        scheduleEmit(next);
      } else {
        hasUncommittedTextRef.current = true;
      }
    }

    return (
      <TextInput
        {...props}
        ref={inputRef}
        defaultValue={initialText}
        onBlur={(event) => {
          if (commitMode !== "change") flush();
          onBlur?.(event);
        }}
        onChangeText={handleChangeText}
        onSubmitEditing={(event) => {
          if (commitMode !== "change") flush();
          onSubmitEditing?.(event);
        }}
        style={[{ textAlignVertical: "center" }, style, appInputTextStyle]}
        underlineColorAndroid="transparent"
      />
    );
  },
);
