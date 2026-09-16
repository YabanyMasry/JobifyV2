import { emptyProfile, type Profile } from "../types";

const STORE_KEY = "jobify.profiles.v1";
const LEGACY_KEY = "jobify.profile.v1";

export type ProfileStore = {
  profiles: Profile[];
  activeId: string;
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createProfile(label = ""): Profile {
  return { ...emptyProfile(), id: uid(), label };
}

function ensureShape(raw: unknown): ProfileStore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.profiles) || r.profiles.length === 0) return null;
  if (typeof r.activeId !== "string") return null;

  const profiles = r.profiles.map((p) => {
    const merged = { ...emptyProfile(), ...(p as Partial<Profile>) };
    if (!merged.id) merged.id = uid();
    return merged;
  });
  const activeId = profiles.some((p) => p.id === r.activeId) ? r.activeId : profiles[0].id;
  return { profiles, activeId };
}

function migrateLegacy(): ProfileStore | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw) as Partial<Profile>;
    const profile: Profile = {
      ...emptyProfile(),
      ...legacy,
      id: uid(),
      label: "",
    };
    return { profiles: [profile], activeId: profile.id };
  } catch {
    return null;
  }
}

export function loadStore(): ProfileStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = ensureShape(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch {
    /* fall through */
  }

  const migrated = migrateLegacy();
  if (migrated) {
    saveStore(migrated);
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
    return migrated;
  }

  const fresh = createProfile();
  return { profiles: [fresh], activeId: fresh.id };
}

export function saveStore(store: ProfileStore): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}
