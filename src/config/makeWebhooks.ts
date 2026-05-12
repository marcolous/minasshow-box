export type MakeAccountsFile = {
  active: string;
  accounts: Record<string, { register: string; notify: string }>;
};

export type ResolvedMakeWebhooks = {
  active: string;
  register: string;
  notify: string;
};

function resolveActive(
  json: MakeAccountsFile,
  override?: string | null,
): string {
  const fromEnv =
    typeof import.meta.env.VITE_MAKE_ACCOUNT === "string"
      ? import.meta.env.VITE_MAKE_ACCOUNT.trim()
      : "";
  const fromQuery = override?.trim() ?? "";
  const fallback = json.active.trim();
  return fromQuery || fromEnv || fallback;
}

export async function loadMakeWebhooks(
  activeOverride?: string | null,
): Promise<ResolvedMakeWebhooks> {
  const res = await fetch("/make-accounts.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Could not load /make-accounts.json (${res.status}). Check the file exists in public/.`,
    );
  }
  const json = (await res.json()) as MakeAccountsFile;
  const active = resolveActive(json, activeOverride);
  const entry = json.accounts[active];
  if (!entry?.register?.trim() || !entry?.notify?.trim()) {
    throw new Error(
      `Make.com config missing for account "${active}". Valid keys: ${Object.keys(json.accounts).join(", ")}`,
    );
  }
  return {
    active,
    register: entry.register.trim(),
    notify: entry.notify.trim(),
  };
}
