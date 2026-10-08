import type { Profile } from "../types";

export type GeneratedBundle = {
  cv: string;
  atsReport: string;
  coverLetter: string;
  editInstructions: string;
};

export type RoleTarget = {
  role: string;
  seniority?: string;
  focus?: string;
};

/** The dossier (background + aboutMe) is chat-only context — keep it out of CV generation. */
function careerOnly(profile: Profile): Omit<Profile, "background" | "aboutMe"> {
  const rest: Partial<Profile> = { ...profile };
  delete rest.background;
  delete rest.aboutMe;
  return rest as Omit<Profile, "background" | "aboutMe">;
}

export async function generate(
  profile: Profile,
  jobDescription: string,
  target?: RoleTarget | null,
): Promise<GeneratedBundle> {
  const p = careerOnly(profile);
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target ? { profile: p, target } : { profile: p, jobDescription }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }

  return (await res.json()) as GeneratedBundle;
}

export async function refine(
  profile: Profile,
  jobDescription: string,
  previousBundle: GeneratedBundle,
  instruction: string,
  target?: RoleTarget | null,
): Promise<GeneratedBundle> {
  const p = careerOnly(profile);
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      target
        ? { profile: p, target, previousBundle, instruction }
        : { profile: p, jobDescription, previousBundle, instruction },
    ),
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
