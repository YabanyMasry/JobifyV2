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

export async function generate(
  profile: Profile,
  jobDescription: string,
  target?: RoleTarget | null,
): Promise<GeneratedBundle> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target ? { profile, target } : { profile, jobDescription }),
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
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      target
        ? { profile, target, previousBundle, instruction }
        : { profile, jobDescription, previousBundle, instruction },
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
  "id" | "label" | "languages" | "experience" | "education" | "projects" | "certifications"
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
