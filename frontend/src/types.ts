export type Experience = {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type Education = {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  startDate: string;
  endDate: string;
  details?: string;
};

export type Project = {
  id: string;
  name: string;
  link?: string;
  description: string;
};

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  date: string;
};

export const LANGUAGE_LEVELS = ["Native", "Fluent", "Intermediate", "Basic"] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

export type Language = {
  id: string;
  name: string;
  level: LanguageLevel;
};

export type Profile = {
  id: string;
  label: string;
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  skills: string[];
  languages: Language[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
};

export const emptyProfile = (): Profile => ({
  id: "",
  label: "",
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  github: "",
  portfolio: "",
  summary: "",
  skills: [],
  languages: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
});

export function profileDisplayName(p: Profile): string {
  return p.label.trim() || p.fullName.trim() || "Untitled profile";
}

export type GenerationKind = "cv" | "cover-letter";
