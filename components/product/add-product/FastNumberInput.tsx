import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { TextInput, type TextInputProps } from "react-native";

function sanitizeNumberText(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

type Props = Omit<TextInputProps, "value" | "onChangeText"> & {
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
    onBlur,
    onSubmitEditing,
    ...props
  },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [text, setText] = useState(value == null ? "" : String(value));

  useImperativeHandle(ref, () => inputRef.current as TextInput);

  useEffect(() => {
    const next = value == null ? "" : String(value);
    setText((prev) => (prev === next ? prev : next));
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function commit(next: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    onChangeText(next);
  }

  function scheduleCommit(next: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChangeText(next);
      timerRef.current = null;
    }, commitDelayMs);
  }

  return (
    <TextInput
      {...props}
      ref={inputRef}
      value={text}
      onChangeText={(raw) => {
        const next = sanitize(raw);
        setText(next);
        scheduleCommit(next);
      }}
      onBlur={(event) => {
        commit(text);
        onBlur?.(event);
      }}
      onSubmitEditing={(event) => {
        commit(text);
        onSubmitEditing?.(event);
      }}
    />
  );
});

export default FastNumberInput;
