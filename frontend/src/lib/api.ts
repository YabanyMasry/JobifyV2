import type { Profile, GenerationDocType } from "../types";

export type GeneratedBundle = {
  cv?: string;
  atsReport: string;
  coverLetter: string;
  editInstructions: string;
  docType?: GenerationDocType;
  existingCv?: string;
};

export type RoleTarget = {
  role: string;
  seniority?: string;
  focus?: string;
};

export type GenerateOptions = {
  docType?: GenerationDocType;
  existingCv?: string;
};

/** The dossier (background + aboutMe) is chat-only context — keep it out of CV generation. */
function careerOnly(profile: Profile): Omit<Profile, "background" | "aboutMe"> {
  const rest: Partial<Profile> = { ...profile };
  delete rest.background;
  delete rest.aboutMe;
  return rest as Omit<Profile, "background" | "aboutMe">;
}

export async function generate(
  profile: Profile | null,
  jobDescription: string,
  target?: RoleTarget | null,
  options?: GenerateOptions,
): Promise<GeneratedBundle> {
  const p = profile ? careerOnly(profile) : undefined;
  const payload: Record<string, unknown> = {
    ...(p ? { profile: p } : {}),
    ...(options?.docType ? { docType: options.docType } : {}),
    ...(options?.existingCv ? { existingCv: options.existingCv } : {}),
  };
  if (target) {
    payload.target = target;
  } else {
    payload.jobDescription = jobDescription;
  }

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }

  return (await res.json()) as GeneratedBundle;
}

export async function refine(
  profile: Profile | null,
  jobDescription: string,
  previousBundle: GeneratedBundle,
  instruction: string,
  target?: RoleTarget | null,
  options?: GenerateOptions,
): Promise<GeneratedBundle> {
  const p = profile ? careerOnly(profile) : undefined;
  const payload: Record<string, unknown> = {
    ...(p ? { profile: p } : {}),
    previousBundle,
    instruction,
    ...(options?.docType ? { docType: options.docType } : {}),
    ...(options?.existingCv ? { existingCv: options.existingCv } : {}),
  };
  if (target) {
    payload.target = target;
  } else {
    payload.jobDescription = jobDescription;
  }

  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }

  return (await res.json()) as GeneratedBundle;
}

export type ExtractedProfile = Omit<
  Profile,
  "id" | "label" | "languages" | "experience" | "education" | "projects" | "certifications" | "background" | "aboutMe"
> & {
  languages: { name: string; level: string }[];
  experience: Omit<Profile["experience"][number], "id">[];
  education: Omit<Profile["education"][number], "id">[];
  projects: Omit<Profile["projects"][number], "id">[];
  certifications: Omit<Profile["certifications"][number], "id">[];
};

export async function importCv(text: string): Promise<ExtractedProfile> {
  const res = await fetch("/api/import-cv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }

  const data = (await res.json()) as { profile: ExtractedProfile };
  return data.profile;
}

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export async function chat(profile: Profile, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, messages }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }

  const data = (await res.json()) as { reply: string };
  return data.reply;
}
