/** Pure helpers behind `qa:shipping-cache` and `qa:bundle-secrets` (kept separate so they can be tested). */

export interface CacheRun {
  requests: number;
  usageBefore: number;
  usageAfter: number;
}

export interface Report {
  ok: boolean;
  message: string;
}

/** E4-AC2: N identical requests must cost at most one upstream call. */
export function evaluateCacheRun({ requests, usageBefore, usageAfter }: CacheRun): Report {
  const delta = usageAfter - usageBefore;
  if (delta < 0) {
    return { ok: false, message: `usage counter went backwards (${usageBefore} -> ${usageAfter})` };
  }
  if (delta > 1) {
    return {
      ok: false,
      message: `${requests} identical requests caused ${delta} upstream calls (expected at most 1)`,
    };
  }
  return { ok: true, message: `${requests} identical requests caused ${delta} upstream call(s)` };
}

export interface ScannedFile {
  path: string;
  content: string;
}

export interface SecretValue {
  name: string;
  value: string | undefined;
}

export interface Leak {
  name: string;
  path: string;
}

const MIN_SECRET_LENGTH = 8;

/** E4-AC6: which secrets appear verbatim in client files. Output never contains the value. */
export function findLeakedSecrets(files: ScannedFile[], secrets: SecretValue[]): Leak[] {
  const usable = secrets.filter(
    (s): s is { name: string; value: string } => !!s.value && s.value.length >= MIN_SECRET_LENGTH,
  );
  return files.flatMap((file) =>
    usable
      .filter((s) => file.content.includes(s.value))
      .map((s) => ({ name: s.name, path: file.path })),
  );
}
