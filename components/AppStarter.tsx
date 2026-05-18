import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Href, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Session } from "@supabase/supabase-js";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch } from "@/store/hooks";
import { clearBuyer, setBuyer } from "@/store/buyerSlice";
import { clearSelectedVendor, setSelectedVendor } from "@/store/vendorSlice";

SplashScreen.preventAutoHideAsync();

type AppRole = "buyer" | "vendor" | null;

function getRoleFromSession(session: Session | null): AppRole {
  const role = session?.user?.user_metadata?.role;

  if (role === "buyer") return "buyer";
  if (role === "vendor") return "vendor";

  return null;
}

export default function AppStarter() {
  const dispatch = useAppDispatch();
  const colorScheme = useColorScheme();
  const segments = useSegments();

  const [bootstrapped, setBootstrapped] = useState(false);

  const didBootstrapRef = useRef(false);
  const lastHandledSessionRef = useRef<string | null>(null);

  const hydrateFromSession = useCallback(
    async (session: Session | null) => {
      const role = getRoleFromSession(session);

      dispatch(clearBuyer());
      dispatch(clearSelectedVendor());

      if (!session || !role) {
        return { role: null as AppRole };
      }

      const user = session.user;

      if (role === "buyer") {
        dispatch(
          setBuyer({
            userId: user.id,
            email: user.email ?? null,
            name: user.user_metadata?.name ?? null,
            role: "buyer",
            isAuthenticated: true,
          }),
        );

        return { role: "buyer" as const };
      }

      if (role === "vendor") {
        const { data: vendor, error } = await supabase
          .from("vendor")
          .select("*")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        // Important:
        // Vendor auth account may exist before create-shop inserts vendor row.
        // Keep the vendor logged in and let /vendor route gate decide next step.
        if (error) {
          console.warn("Vendor hydrate error:", error);

          dispatch(
            setSelectedVendor({
              id: null,
              auth_user_id: user.id,
              email: user.email ?? null,
              name: user.user_metadata?.name ?? null,
              owner_name: user.user_metadata?.name ?? null,
              has_shop: false,
            }),
          );

          return { role: "vendor" as const };
        }

        if (!vendor) {
          dispatch(
            setSelectedVendor({
              id: null,
              auth_user_id: user.id,
              email: user.email ?? null,
              name: user.user_metadata?.name ?? null,
              owner_name: user.user_metadata?.name ?? null,
              has_shop: false,
            }),
          );

          return { role: "vendor" as const };
        }

        dispatch(
          setSelectedVendor({
            ...(vendor as any),
            id: Number((vendor as any).id),
            auth_user_id: (vendor as any).auth_user_id ?? user.id,
            has_shop:
              (vendor as any).has_shop != null
                ? Boolean((vendor as any).has_shop)
                : Boolean((vendor as any).shop_name),
          }),
        );

        return { role: "vendor" as const };
      }

      return { role: null as AppRole };
    },
    [dispatch],
  );

  const navigateForRole = useCallback(
    (role: AppRole) => {
      const inAuth = segments[0] === "(auth)";
      const inVendor = segments[0] === "vendor";

      if (role === "vendor") {
        if (!inVendor) {
          router.replace("/vendor" as Href);
        }
        return;
      }

      if (role === "buyer") {
        if (inAuth || inVendor) {
          router.replace("/" as Href);
        }
        return;
      }

      if (!role && inVendor) {
        router.replace("/vendor/signin" as Href);
      }
    },
    [segments],
  );

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;

      lastHandledSessionRef.current = session?.access_token ?? null;

      const { role } = await hydrateFromSession(session);
      navigateForRole(role);
    } catch (error) {
      console.warn("App bootstrap error:", error);
      dispatch(clearBuyer());
      dispatch(clearSelectedVendor());
      navigateForRole(null);
    } finally {
      setBootstrapped(true);
      await SplashScreen.hideAsync();
    }
  }, [dispatch, hydrateFromSession, navigateForRole]);

  useEffect(() => {
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionKey = session?.access_token ?? null;

        if (lastHandledSessionRef.current === sessionKey && bootstrapped) {
          return;
        }

        lastHandledSessionRef.current = sessionKey;

        const { role } = await hydrateFromSession(session);
        navigateForRole(role);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [bootstrapped, hydrateFromSession, navigateForRole]);

  if (!bootstrapped) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
