import type { Database } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

type AtomicOrderFunction =
  Database["public"]["Functions"]["create_order_atomic_single_unit"];
type FunctionArgs<T> = T extends { Args: infer Args } ? Args : never;
type FunctionResult<T> = T extends { Returns: infer Result } ? Result : never;
type NullableValues<T> = T extends object
  ? { [Key in keyof T]: T[Key] | null }
  : never;

export type AtomicOrderArgs = NullableValues<FunctionArgs<AtomicOrderFunction>>;
export type AtomicOrderResult =
  FunctionResult<AtomicOrderFunction> extends Array<infer Result>
    ? Result
    : never;
export type AtomicOrderRpcData = AtomicOrderResult[] | AtomicOrderResult | null;

export async function getCurrentBuyerId(): Promise<string | null> {
  const { data } = await appSupabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function createAtomicPurchaseOrder(
  args: AtomicOrderArgs,
): Promise<AtomicOrderRpcData> {
  const { data, error } = await appSupabase.rpc(
    "create_order_atomic_single_unit",
    args as never,
  );

  if (error) throw error;
  return data as AtomicOrderRpcData;
}
