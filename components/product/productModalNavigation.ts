import type { Href, Router } from "expo-router";

export function closeProductModal(
  router: Router,
  returnTo: string | null | undefined,
  fallback: Href = "/vendor/profile/add-product",
) {
  const target = String(returnTo ?? "").trim();

  if (target) {
    router.dismissTo(target as Href);
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
