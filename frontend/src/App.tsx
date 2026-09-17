import { useEffect, useMemo, useState } from "react";
import { ProfileForm } from "./components/ProfileForm";
import { ProfileSwitcher } from "./components/ProfileSwitcher";
import { ResultsView } from "./components/ResultsView";
import { ImportCvModal } from "./components/ImportCvModal";
import { createProfile, loadStore, saveStore, uid, exportStore, importStore } from "./lib/storage";
import { generate, refine, type GeneratedBundle } from "./lib/api";
import { profileDisplayName, type Profile } from "./types";

type Tab = "profile" | "generate";

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
      setActiveProfile({ ...imported, id: activeProfile.id, label: activeProfile.label });
    }
  }

  async function onGenerate() {
    if (!activeProfile) return;
    setLoading(true);
    setError(null);
    setBundle(null);
    setRefineError(null);
    try {
      const result = await generate(activeProfile, jobDescription);
      setBundle(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SYSTEM FAILURE: GENERATION ABORTED");
    } finally {
      setLoading(false);
    }
  }

  async function onRefine(instruction: string) {
    if (!bundle || !activeProfile) return;
    setRefining(true);
    setRefineError(null);
    try {
      const result = await refine(activeProfile, jobDescription, bundle, instruction);
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

  if (bundle && activeProfile) {
    return (
      <ResultsView
        bundle={bundle}
        candidateName={activeProfile.fullName}
        company={company}
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
                disabled={!profileReady}
              >
                02. GENERATOR
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
            <div className="mb-10 text-center border-4 border-black p-6 bg-[#eab308] brutal-shadow">
              <h2 className="text-5xl font-black uppercase mb-4">EXECUTE_GENERATION</h2>
              <p className="text-sm font-mono font-bold max-w-xl mx-auto bg-black text-white p-3 border-2 border-black">
                TARGET_PROFILE: {profileDisplayName(activeProfile)}<br />
                FEED JOB SPECS BELOW TO ASSEMBLE CV + LETTER
              </p>
            </div>

            <div className="border-4 border-black bg-white p-8 space-y-6 brutal-shadow">
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

              {error && (
                <div className="border-4 border-black bg-red-600 text-white px-4 py-3 font-mono font-bold uppercase brutal-shadow-sm">
                  [!] ERROR: {error}
                </div>
              )}

              <button
                onClick={onGenerate}
                disabled={loading || jobDescription.trim().length < 20 || !profileReady}
                className="w-full brutal-btn-primary text-xl flex items-center justify-center gap-4 group"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-5 h-5 bg-black animate-ping" />
                    <span>PROCESSING_DATA...</span>
                  </>
                ) : (
                  <>
                    <span>INITIALIZE_BUILD</span>
                    <span className="bg-black text-[#eab308] px-2 py-0.5 group-hover:bg-white group-hover:text-black border-2 border-black transition-colors">
                      &#9654;
                    </span>
                  </>
                )}
              </button>

              {loading && (
                <p className="text-sm font-mono font-bold text-center mt-4 bg-black text-white py-1 uppercase">
                  ETA: 30-60 SECONDS
                </p>
              )}
            </div>
          </div>
        )}
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
