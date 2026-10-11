import { useEffect, useMemo, useState } from "react";
import { ProfileForm } from "./components/ProfileForm";
import { ProfileSwitcher } from "./components/ProfileSwitcher";
import { ResultsView } from "./components/ResultsView";
import { ImportCvModal } from "./components/ImportCvModal";
import { ChatView } from "./components/ChatView";
import { createProfile, loadStore, saveStore, uid, exportStore, importStore } from "./lib/storage";
import { generate, refine, type GeneratedBundle, type RoleTarget } from "./lib/api";
import { extractFileText } from "./lib/pdf";
import { profileDisplayName, type Profile, type GenerationDocType, type CvSource } from "./types";

type Tab = "profile" | "generate" | "chat";
type GenMode = "posting" | "role";

const ROLE_PRESETS = [
  "Frontend Developer",
  "React Engineer",
  "UI/UX Designer",
  "Product Designer",
  "Full-Stack Developer",
  "Backend Developer",
  "Mobile Developer",
  "Software Engineer",
  "Data Analyst",
  "DevOps Engineer",
];

const SENIORITY_LEVELS = ["Intern", "Junior", "Mid-Level", "Senior"];

export default function App() {
  const initial = useMemo(() => loadStore(), []);
  const [profiles, setProfiles] = useState<Profile[]>(initial.profiles);
  const [activeId, setActiveId] = useState<string>(initial.activeId);

  const [tab, setTab] = useState<Tab>("profile");
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [bundle, setBundle] = useState<GeneratedBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [genMode, setGenMode] = useState<GenMode>("posting");
  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState("");
  const [focus, setFocus] = useState("");
  const [usedTarget, setUsedTarget] = useState<RoleTarget | null>(null);

  // Cover letter only & existing CV features
  const [docType, setDocType] = useState<GenerationDocType>("all");
  const [cvSource, setCvSource] = useState<CvSource>("profile");
  const [existingCvText, setExistingCvText] = useState("");
  const [existingCvFileName, setExistingCvFileName] = useState<string | null>(null);
  const [customCandidateName, setCustomCandidateName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    saveStore({ profiles, activeId });
  }, [profiles, activeId]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? profiles[0],
    [profiles, activeId],
  );

  const setActiveProfile = (next: Profile) => {
    setProfiles((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  };

  const hasExistingData = useMemo(() => {
    if (!activeProfile) return false;
    return (
      activeProfile.fullName.trim().length > 0 ||
      activeProfile.email.trim().length > 0 ||
      activeProfile.experience.length > 0 ||
      activeProfile.education.length > 0 ||
      activeProfile.skills.length > 0
    );
  }, [activeProfile]);

  const profileReady = useMemo(
    () =>
      activeProfile &&
      activeProfile.fullName.trim().length > 0 &&
      activeProfile.email.trim().length > 0,
    [activeProfile],
  );

  const canGenerate = useMemo(() => {
    if (loading) return false;
    const targetValid =
      genMode === "role" ? role.trim().length >= 2 : jobDescription.trim().length >= 20;
    if (!targetValid) return false;

    if (docType === "cover-letter" && cvSource === "custom") {
      return existingCvText.trim().length >= 50;
    }

    return !!profileReady;
  }, [loading, genMode, role, jobDescription, docType, cvSource, existingCvText, profileReady]);

  async function handleCvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExistingCvFileName(file.name);
    setUploadError(null);
    try {
      const text = await extractFileText(file);
      if (text.trim().length < 50) {
        throw new Error("Insufficient text extracted from file (min 50 characters).");
      }
      setExistingCvText(text);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to read CV file");
    }
    e.target.value = "";
  }

  function onCreateProfile() {
    const next = createProfile();
    setProfiles((prev) => [...prev, next]);
    setActiveId(next.id);
    setTab("profile");
  }

  function onDuplicateProfile() {
    if (!activeProfile) return;
    const dup: Profile = {
      ...activeProfile,
      id: uid(),
      label: (activeProfile.label || activeProfile.fullName || "Profile") + " (COPY)",
      experience: activeProfile.experience.map((x) => ({ ...x, id: uid() })),
      education: activeProfile.education.map((x) => ({ ...x, id: uid() })),
      projects: activeProfile.projects.map((x) => ({ ...x, id: uid() })),
      certifications: activeProfile.certifications.map((x) => ({ ...x, id: uid() })),
      languages: activeProfile.languages.map((x) => ({ ...x, id: uid() })),
      background: (activeProfile.background ?? []).map((x) => ({ ...x, id: uid() })),
    };
    setProfiles((prev) => [...prev, dup]);
    setActiveId(dup.id);
    setTab("profile");
  }

  function onDeleteProfile() {
    if (profiles.length <= 1) return;
    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== activeId);
      setActiveId(next[0].id);
      return next;
    });
  }

  function onImportApply(imported: Profile, mode: "replace" | "new") {
    if (mode === "new") {
      const next: Profile = { ...imported, id: uid() };
      setProfiles((prev) => [...prev, next]);
      setActiveId(next.id);
    } else if (activeProfile) {
      // A CV never contains the personal dossier — keep the existing one.
      setActiveProfile({
        ...imported,
        id: activeProfile.id,
        label: activeProfile.label,
        background: activeProfile.background ?? [],
        aboutMe: activeProfile.aboutMe ?? "",
      });
    }
  }

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setBundle(null);
    setRefineError(null);
    const target: RoleTarget | null =
      genMode === "role"
        ? {
            role: role.trim(),
            seniority: seniority || undefined,
            focus: focus.trim() || undefined,
          }
        : null;
    try {
      const result = await generate(
        cvSource === "custom" && docType === "cover-letter" ? null : activeProfile,
        jobDescription,
        target,
        {
          docType,
          existingCv: docType === "cover-letter" && cvSource === "custom" ? existingCvText : undefined,
        },
      );
      setUsedTarget(target);
      setBundle(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SYSTEM FAILURE: GENERATION ABORTED");
    } finally {
      setLoading(false);
    }
  }

  async function onRefine(instruction: string) {
    if (!bundle) return;
    setRefining(true);
    setRefineError(null);
    try {
      const result = await refine(
        cvSource === "custom" && docType === "cover-letter" ? null : activeProfile,
        jobDescription,
        bundle,
        instruction,
        usedTarget,
        {
          docType,
          existingCv: docType === "cover-letter" && cvSource === "custom" ? existingCvText : undefined,
        },
      );
      setBundle(result);
    } catch (e) {
      setRefineError(e instanceof Error ? e.message : "SYSTEM FAILURE: REFINEMENT ABORTED");
    } finally {
      setRefining(false);
    }
  }

  function onExportData() {
    exportStore({ profiles, activeId });
  }

  async function onImportData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const store = await importStore(file);
      setProfiles(store.profiles);
      setActiveId(store.activeId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import data");
    }
    e.target.value = "";
  }

  function onBackToEditor() {
    setBundle(null);
    setRefineError(null);
  }

  if (bundle) {
    const effectiveCandidateName =
      docType === "cover-letter" && cvSource === "custom" && customCandidateName.trim()
        ? customCandidateName.trim()
        : activeProfile?.fullName || "Candidate";

    return (
      <ResultsView
        bundle={bundle}
        candidateName={effectiveCandidateName}
        company={company || (usedTarget ? [usedTarget.seniority, usedTarget.role].filter(Boolean).join(" ") : "")}
        onBack={onBackToEditor}
        onRefine={onRefine}
        refining={refining}
        refineError={refineError}
      />
    );
  }

  if (!activeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-2xl font-bold uppercase tracking-widest font-mono animate-pulse text-black">
          [ BOOTING SYSTEM... ]
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black bg-white sticky top-0 z-10 brutal-shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            JOBIFY <span className="font-mono text-sm tracking-widest text-[#eab308] bg-black px-2 py-0.5 ml-2 border-2 border-black">DOCUMENT_ENGINE_V1</span>
          </h1>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <ProfileSwitcher
              profiles={profiles}
              activeId={activeId}
              onSwitch={setActiveId}
              onCreate={onCreateProfile}
              onDuplicate={onDuplicateProfile}
              onDelete={onDeleteProfile}
            />
            <nav className="flex bg-black border-2 border-black">
              <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>
                01. PROFILE
              </TabButton>
              <TabButton
                active={tab === "generate"}
                onClick={() => setTab("generate")}
              >
                02. GENERATOR
              </TabButton>
              <TabButton
                active={tab === "chat"}
                onClick={() => setTab("chat")}
                disabled={!profileReady}
              >
                03. AI_CHAT
              </TabButton>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {tab === "profile" && (
          <div>
            <div className="mb-8 border-b-2 border-black pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-bold font-sans uppercase break-all">
                  {profileDisplayName(activeProfile)}
                </h2>
                <p className="text-sm font-mono mt-2 uppercase bg-[#eab308] border-2 border-black px-2 py-1 inline-block font-bold">
                  LOCAL_STORAGE_ACTIVE :: DATA_SECURE
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {!profileReady && (
                  <span className="text-xs text-white bg-black font-mono px-3 py-2 uppercase font-bold border-2 border-black">
                    [!] REQ: NAME + EMAIL
                  </span>
                )}
                <div className="flex items-center gap-2 border-2 border-black bg-white p-1 brutal-shadow-sm">
                  <button onClick={onExportData} className="text-xs font-mono font-bold px-2 py-1 bg-[#eab308] hover:bg-black hover:text-[#eab308] transition-colors border-2 border-black">
                    EXPORT_JSON
                  </button>
                  <label className="text-xs font-mono font-bold px-2 py-1 bg-[#eab308] hover:bg-black hover:text-[#eab308] transition-colors border-2 border-black cursor-pointer">
                    IMPORT_JSON
                    <input type="file" accept=".json" className="hidden" onChange={onImportData} />
                  </label>
                </div>
                <button
                  onClick={() => setImportOpen(true)}
                  className="brutal-btn-secondary"
                >
                  IMPORT_CV_DATA
                </button>
              </div>
            </div>
            <ProfileForm profile={activeProfile} onChange={setActiveProfile} />
          </div>
        )}

        {tab === "generate" && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 text-center border-4 border-black p-6 bg-[#eab308] brutal-shadow">
              <h2 className="text-5xl font-black uppercase mb-4">EXECUTE_GENERATION</h2>
              <p className="text-sm font-mono font-bold max-w-xl mx-auto bg-black text-white p-3 border-2 border-black">
                {docType === "cover-letter" ? (
                  cvSource === "custom" ? (
                    <>
                      MODE: COVER_LETTER_ONLY [CUSTOM_CV_PAYLOAD]<br />
                      {genMode === "posting"
                        ? "SUPPLIED CV + TARGET JOB POSTING -> ASSEMBLE TAILORED COVER LETTER"
                        : "SUPPLIED CV + TARGET ROLE -> ASSEMBLE REUSABLE COVER LETTER"}
                    </>
                  ) : (
                    <>
                      MODE: COVER_LETTER_ONLY [PROFILE: {profileDisplayName(activeProfile)}]<br />
                      {genMode === "posting"
                        ? "PROFILE EVIDENCE + TARGET JOB POSTING -> ASSEMBLE TAILORED COVER LETTER"
                        : "PROFILE EVIDENCE + TARGET ROLE -> ASSEMBLE REUSABLE COVER LETTER"}
                    </>
                  )
                ) : (
                  <>
                    TARGET_PROFILE: {profileDisplayName(activeProfile)}<br />
                    {genMode === "posting"
                      ? "FEED JOB SPECS BELOW TO ASSEMBLE CV + LETTER"
                      : "SELECT A ROLE TO ASSEMBLE A GENERAL-PURPOSE CV + LETTER"}
                  </>
                )}
              </p>
            </div>

            {/* Step 1: Payload Target Selector */}
            <div className="mb-6">
              <div className="text-xs font-mono font-bold uppercase mb-2 flex items-center justify-between">
                <span>01. SELECT_OUTPUT_PAYLOAD</span>
                <span className="bg-black text-[#eab308] px-2 py-0.5 text-xs font-bold font-mono">
                  {docType === "all" ? "PACK: FULL_APPLICATION" : "PACK: COVER_LETTER_ONLY"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 border-4 border-black bg-white brutal-shadow-sm">
                <button
                  type="button"
                  onClick={() => setDocType("all")}
                  className={`p-4 text-left transition-colors font-mono cursor-pointer ${
                    docType === "all"
                      ? "bg-black text-[#eab308]"
                      : "bg-white text-black hover:bg-[#eab308]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-sans font-black text-base uppercase">FULL_APPLICATION</span>
                    {docType === "all" && (
                      <span className="text-[10px] bg-[#eab308] text-black font-bold px-1.5 py-0.5 border border-black">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-80 uppercase leading-snug">
                    CURATED CV + MATCHING COVER LETTER + ATS DIAGNOSTIC REPORT
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDocType("cover-letter")}
                  className={`p-4 text-left border-t-4 sm:border-t-0 sm:border-l-4 border-black transition-colors font-mono cursor-pointer ${
                    docType === "cover-letter"
                      ? "bg-black text-[#eab308]"
                      : "bg-white text-black hover:bg-[#eab308]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-sans font-black text-base uppercase">COVER_LETTER_ONLY</span>
                    {docType === "cover-letter" && (
                      <span className="text-[10px] bg-[#eab308] text-black font-bold px-1.5 py-0.5 border border-black">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-80 uppercase leading-snug">
                    ALREADY HAVE A CV? ASSEMBLE A TARGETED, HIGH-IMPACT COVER LETTER
                  </p>
                </button>
              </div>
            </div>

            {/* Step 1.1: If Cover Letter Only, choose CV source */}
            {docType === "cover-letter" && (
              <div className="border-4 border-black bg-white p-6 mb-6 brutal-shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
                  <div>
                    <span className="font-mono font-bold text-sm uppercase block">
                      EXISTING_CV_DATA_SOURCE
                    </span>
                    <span className="font-mono text-xs text-gray-600 uppercase">
                      WHERE IS YOUR EXISTING CV LOCATED?
                    </span>
                  </div>
                  <div className="flex border-2 border-black self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCvSource("profile")}
                      className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                        cvSource === "profile"
                          ? "bg-black text-[#eab308]"
                          : "bg-white text-black hover:bg-[#eab308]"
                      }`}
                    >
                      ACTIVE_PROFILE
                    </button>
                    <button
                      type="button"
                      onClick={() => setCvSource("custom")}
                      className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border-l-2 border-black transition-colors cursor-pointer ${
                        cvSource === "custom"
                          ? "bg-black text-[#eab308]"
                          : "bg-white text-black hover:bg-[#eab308]"
                      }`}
                    >
                      UPLOAD_OR_PASTE_CV
                    </button>
                  </div>
                </div>

                {cvSource === "profile" ? (
                  <div className="border-2 border-black bg-slate-50 p-4 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold uppercase">
                      <span>PROFILE_REF :: {profileDisplayName(activeProfile)}</span>
                      <span className="bg-black text-white px-2 py-0.5">READY</span>
                    </div>
                    <p className="text-gray-700">
                      The cover letter will be built using all verified skills ({activeProfile.skills.length}), experiences ({activeProfile.experience.length}), and projects ({activeProfile.projects.length}) from your current profile.
                    </p>
                    {!profileReady && (
                      <div className="border-2 border-red-500 bg-red-100 text-red-900 p-2 font-bold uppercase text-[11px]">
                        [!] Active profile requires Full Name and Email. Fill them in tab 01. PROFILE, or switch source to "UPLOAD_OR_PASTE_CV" below.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 font-mono">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <label className="text-xs font-bold uppercase">
                          PASTE_EXISTING_CV_OR_UPLOAD
                        </label>
                        <label className="text-xs font-mono font-bold px-3 py-1 bg-[#eab308] hover:bg-black hover:text-[#eab308] transition-colors border-2 border-black cursor-pointer inline-flex items-center gap-1.5">
                          <span>{existingCvFileName ? `FILE: ${existingCvFileName}` : "UPLOAD_CV_FILE (.PDF / .TXT)"}</span>
                          <input
                            type="file"
                            accept=".pdf,.txt"
                            className="hidden"
                            onChange={handleCvFileUpload}
                          />
                        </label>
                      </div>
                      <textarea
                        rows={7}
                        className="brutal-input text-xs font-mono"
                        value={existingCvText}
                        onChange={(e) => setExistingCvText(e.target.value)}
                        placeholder="[ PASTE YOUR EXISTING CV / RESUME TEXT HERE — IT WILL BE USED AS DIRECT EVIDENCE IN THE COVER LETTER ]"
                      />
                      <div className="flex justify-between text-[11px] font-mono mt-1 text-gray-700 font-bold uppercase">
                        <span>CHAR_COUNT: {existingCvText.trim().length}</span>
                        <span>MIN: 50</span>
                      </div>
                      {uploadError && (
                        <div className="mt-2 border-2 border-red-500 bg-red-100 text-red-900 p-2 font-bold uppercase text-xs">
                          [!] {uploadError}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">
                        CANDIDATE_NAME <span className="text-gray-500 font-normal">(OPTIONAL · FOR LETTER HEADER & SIGNATURE)</span>
                      </label>
                      <input
                        type="text"
                        className="brutal-input text-sm"
                        value={customCandidateName}
                        onChange={(e) => setCustomCandidateName(e.target.value)}
                        placeholder={activeProfile.fullName || "E.G. ALEX MORGAN"}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Target Job Specification */}
            <div className="text-xs font-mono font-bold uppercase mb-2 flex items-center justify-between">
              <span>02. TARGET_JOB_SPECIFICATION</span>
              <span className="bg-black text-white px-2 py-0.5 text-xs font-bold font-mono">
                {genMode === "posting" ? "SPECIFIC_POSTING" : "GENERAL_ROLE"}
              </span>
            </div>

            <div className="grid grid-cols-2 border-4 border-black mb-6 brutal-shadow-sm" role="tablist">
              <button
                id="mode-posting"
                role="tab"
                aria-selected={genMode === "posting"}
                onClick={() => setGenMode("posting")}
                className={`px-4 py-3 font-mono font-bold uppercase text-sm transition-colors cursor-pointer ${
                  genMode === "posting" ? "bg-black text-[#eab308]" : "bg-white text-black hover:bg-[#eab308]"
                }`}
              >
                MODE_A :: SPECIFIC_POSTING
              </button>
              <button
                id="mode-role"
                role="tab"
                aria-selected={genMode === "role"}
                onClick={() => setGenMode("role")}
                className={`px-4 py-3 font-mono font-bold uppercase text-sm border-l-4 border-black transition-colors cursor-pointer ${
                  genMode === "role" ? "bg-black text-[#eab308]" : "bg-white text-black hover:bg-[#eab308]"
                }`}
              >
                MODE_B :: GENERAL_ROLE
              </button>
            </div>

            <div className="border-4 border-black bg-white p-8 space-y-6 brutal-shadow">
              {genMode === "posting" && (
              <>
              <div>
                <label className="block text-lg font-bold uppercase mb-2">
                  TARGET_COMPANY_NAME
                  <span className="text-sm font-normal ml-3 font-mono bg-black text-white px-2 py-0.5">USED_FOR_FILENAME</span>
                </label>
                <input
                  type="text"
                  className="brutal-input text-lg"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="ACME_CORP"
                />
              </div>

              <div>
                <label className="block text-lg font-bold uppercase mb-2">
                  RAW_JOB_DESCRIPTION
                </label>
                <textarea
                  rows={12}
                  className="brutal-input"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="[ PASTE FULL JOB REQUIREMENTS & SPECS HERE ]"
                />
                <p className="text-xs font-mono font-bold mt-2 uppercase flex justify-between">
                  <span>CHAR_COUNT: {jobDescription.trim().length}</span>
                  <span>MIN: 20</span>
                </p>
              </div>
              </>
              )}

              {genMode === "role" && (
                <>
                  <div>
                    <label htmlFor="role-input" className="block text-lg font-bold uppercase mb-2">
                      TARGET_ROLE
                      <span className="text-sm font-normal ml-3 font-mono bg-black text-white px-2 py-0.5">
                        PICK OR TYPE
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {ROLE_PRESETS.map((r) => {
                        const active = role.trim().toLowerCase() === r.toLowerCase();
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`text-xs font-mono font-bold uppercase border-2 border-black px-2 py-1 transition-colors ${
                              active ? "bg-black text-[#eab308]" : "bg-white text-black hover:bg-[#eab308]"
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      id="role-input"
                      type="text"
                      className="brutal-input text-lg"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="E.G. MOTION DESIGNER, VUE DEVELOPER..."
                    />
                  </div>

                  <div>
                    <span className="block text-lg font-bold uppercase mb-2">
                      SENIORITY
                      <span className="text-sm font-normal ml-3 font-mono bg-black text-white px-2 py-0.5">OPTIONAL</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 border-2 border-black">
                      {SENIORITY_LEVELS.map((s, i) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSeniority(seniority === s ? "" : s)}
                          className={`px-3 py-2 font-mono font-bold uppercase text-sm transition-colors ${
                            i > 0 ? "sm:border-l-2 border-black" : ""
                          } ${seniority === s ? "bg-black text-[#eab308]" : "bg-white text-black hover:bg-[#eab308]"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="focus-input" className="block text-lg font-bold uppercase mb-2">
                      FOCUS_NOTES
                      <span className="text-sm font-normal ml-3 font-mono bg-black text-white px-2 py-0.5">OPTIONAL</span>
                    </label>
                    <textarea
                      id="focus-input"
                      rows={3}
                      className="brutal-input"
                      value={focus}
                      onChange={(e) => setFocus(e.target.value)}
                      placeholder="[ E.G. EMPHASIZE TYPESCRIPT + DESIGN SYSTEMS, TARGETING STARTUPS, REMOTE ]"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-bold uppercase mb-2">
                      LABEL
                      <span className="text-sm font-normal ml-3 font-mono bg-black text-white px-2 py-0.5">
                        OPTIONAL · USED_FOR_FILENAME
                      </span>
                    </label>
                    <input
                      type="text"
                      className="brutal-input text-lg"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder={role ? role.toUpperCase().replace(/\s+/g, "_") : "DEFAULTS_TO_ROLE_NAME"}
                    />
                  </div>

                  <p className="text-xs font-mono font-bold uppercase border-l-4 border-[#eab308] pl-3">
                    {docType === "cover-letter"
                      ? "OUTPUT TARGETS TYPICAL MARKET REQUIREMENTS FOR THIS ROLE. COVER LETTER WILL BE SPECIFIC WITH [PLACEHOLDERS] FOR TARGET COMPANY DETAILS."
                      : "OUTPUT TARGETS TYPICAL MARKET REQUIREMENTS FOR THIS ROLE. COVER LETTER WILL INCLUDE [PLACEHOLDERS] TO FILL PER APPLICATION."}
                  </p>
                </>
              )}

              {error && (
                <div className="border-4 border-black bg-red-600 text-white px-4 py-3 font-mono font-bold uppercase brutal-shadow-sm">
                  [!] ERROR: {error}
                </div>
              )}

              <button
                onClick={onGenerate}
                disabled={!canGenerate}
                className="w-full brutal-btn-primary text-xl flex items-center justify-center gap-4 group cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-5 h-5 bg-black animate-ping" />
                    <span>
                      {docType === "cover-letter"
                        ? "ASSEMBLING_COVER_LETTER..."
                        : "PROCESSING_DATA..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {docType === "cover-letter"
                        ? "GENERATE_COVER_LETTER"
                        : "INITIALIZE_BUILD"}
                    </span>
                    <span className="bg-black text-[#eab308] px-2 py-0.5 group-hover:bg-white group-hover:text-black border-2 border-black transition-colors">
                      &#9654;
                    </span>
                  </>
                )}
              </button>

              {loading && (
                <p className="text-sm font-mono font-bold text-center mt-4 bg-black text-white py-1 uppercase">
                  ETA: {docType === "cover-letter" ? "15-30 SECONDS" : "30-60 SECONDS"}
                </p>
              )}

              {!canGenerate && !loading && (
                <div className="text-xs font-mono font-bold uppercase text-center text-gray-700 bg-gray-100 p-2 border-2 border-dashed border-black">
                  {docType === "cover-letter" && cvSource === "custom" && existingCvText.trim().length < 50
                    ? "[!] PASTE OR UPLOAD AN EXISTING CV (MIN 50 CHARACTERS)"
                    : !profileReady && (docType === "all" || cvSource === "profile")
                    ? "[!] PROFILE INCOMPLETE: SET NAME & EMAIL IN 01. PROFILE OR SWITCH CV SOURCE"
                    : genMode === "posting" && jobDescription.trim().length < 20
                    ? "[!] PASTE A JOB DESCRIPTION (MIN 20 CHARACTERS)"
                    : genMode === "role" && role.trim().length < 2
                    ? "[!] ENTER OR SELECT A TARGET ROLE"
                    : "[!] COMPLETE REQUIRED FIELDS TO BUILD"}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "chat" && <ChatView key={activeProfile.id} profile={activeProfile} />}
      </main>

      <ImportCvModal
        open={importOpen}
        hasExistingData={hasExistingData}
        canCreateNew={true}
        onClose={() => setImportOpen(false)}
        onApply={onImportApply}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 text-sm font-bold font-mono transition-colors ${
        active 
          ? "bg-white text-black border-2 border-transparent" 
          : "bg-black text-white hover:bg-[#eab308] hover:text-black"
      } ${disabled ? "opacity-30 cursor-not-allowed hover:bg-black hover:text-white" : ""}`}
    >
      {children}
    </button>
  );
}
