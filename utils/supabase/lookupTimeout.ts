const DEFAULT_LOOKUP_TIMEOUT_MS = 3500;

export function timeoutAfter<T>(
  ms = DEFAULT_LOOKUP_TIMEOUT_MS,
  message = "Lookup request timed out.",
): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}
