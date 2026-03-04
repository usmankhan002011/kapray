import { useCallback } from "react";
import { TextInput } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * Automatically focuses a TextInput
 * when the screen becomes active.
 *
 * Usage:
 * const inputRef = useRef<TextInput>(null);
 * useAutoFocus(inputRef);
 */
export function useAutoFocus(
  ref: React.RefObject<TextInput>,
  delay: number = 80
) {
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        ref.current?.focus();
      }, delay);

      return () => clearTimeout(timer);
    }, [ref, delay])
  );
}