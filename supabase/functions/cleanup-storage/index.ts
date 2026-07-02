import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type QueueRow = {
  id: number;
  bucket_id: string;
  object_path: string;
  attempts: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cleanup-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function readPositiveInt(name: string, fallback: number, max: number) {
  const raw = Number(Deno.env.get(name) ?? "");
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.trunc(raw), max);
}

function groupByBucket(rows: QueueRow[]) {
  const groups = new Map<string, QueueRow[]>();

  for (const row of rows) {
    const bucketRows = groups.get(row.bucket_id) ?? [];
    bucketRows.push(row);
    groups.set(row.bucket_id, bucketRows);
  }

  return groups;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const cleanupSecret = (Deno.env.get("CLEANUP_STORAGE_SECRET") ?? "").trim();
  if (cleanupSecret) {
    const url = new URL(req.url);
    const provided =
      req.headers.get("x-cleanup-secret") ??
      url.searchParams.get("secret") ??
      "";

    if (provided !== cleanupSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("KAPRAY_SUPABASE_SECRET_KEY") ??
    Deno.env.get("KAPRAY_SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        error:
          "SUPABASE_URL or KAPRAY_SUPABASE_SECRET_KEY is missing",
      },
      500,
    );
  }

  const batchSize = readPositiveInt("CLEANUP_STORAGE_BATCH_SIZE", 100, 250);
  const maxAttempts = readPositiveInt("CLEANUP_STORAGE_MAX_ATTEMPTS", 5, 25);
  const runId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: rows, error: selectError } = await supabase
    .from("storage_delete_queue")
    .select("id,bucket_id,object_path,attempts")
    .is("processed_at", null)
    .lt("attempts", maxAttempts)
    .order("id", { ascending: true })
    .limit(batchSize);

  if (selectError) {
    return jsonResponse({ error: selectError.message }, 500);
  }

  const pendingRows = (rows ?? []) as QueueRow[];
  if (!pendingRows.length) {
    return jsonResponse({
      ok: true,
      runId,
      selected: 0,
      deleted: 0,
      failed: 0,
    });
  }

  const selectedIds = pendingRows.map((row) => row.id);
  const { error: lockError } = await supabase
    .from("storage_delete_queue")
    .update({
      locked_at: nowIso,
      locked_by: runId,
    })
    .in("id", selectedIds);

  if (lockError) {
    return jsonResponse({ error: lockError.message }, 500);
  }

  let deleted = 0;
  let failed = 0;
  const failures: Array<{ bucket: string; count: number; error: string }> = [];

  for (const [bucketId, bucketRows] of groupByBucket(pendingRows)) {
    const paths = bucketRows.map((row) => row.object_path);
    const { error: removeError } = await supabase.storage
      .from(bucketId)
      .remove(paths);

    if (!removeError) {
      const processedAt = new Date().toISOString();
      const ids = bucketRows.map((row) => row.id);

      const { error: markProcessedError } = await supabase
        .from("storage_delete_queue")
        .update({
          processed_at: processedAt,
          locked_at: null,
          locked_by: null,
          last_error: null,
        })
        .in("id", ids);

      if (markProcessedError) {
        failures.push({
          bucket: bucketId,
          count: bucketRows.length,
          error: `Deleted from storage but failed to mark processed: ${markProcessedError.message}`,
        });
        failed += bucketRows.length;
      } else {
        deleted += bucketRows.length;
      }
      continue;
    }

    const message = removeError.message.slice(0, 1000);
    failures.push({
      bucket: bucketId,
      count: bucketRows.length,
      error: message,
    });
    failed += bucketRows.length;

    for (const row of bucketRows) {
      const { error: markFailedError } = await supabase
        .from("storage_delete_queue")
        .update({
          attempts: row.attempts + 1,
          locked_at: null,
          locked_by: null,
          last_error: message,
        })
        .eq("id", row.id);

      if (markFailedError) {
        failures.push({
          bucket: bucketId,
          count: 1,
          error: `Failed to record cleanup error for queue row ${row.id}: ${markFailedError.message}`,
        });
      }
    }
  }

  return jsonResponse({
    ok: failures.length === 0,
    runId,
    selected: pendingRows.length,
    deleted,
    failed,
    failures,
  });
});
