import { useState } from "react";
import type { Profile, LanguageLevel } from "../types";
import { LANGUAGE_LEVELS, emptyProfile } from "../types";
import { extractFileText } from "../lib/pdf";
import { importCv, type ExtractedProfile } from "../lib/api";
import { uid } from "../lib/storage";

type ApplyMode = "replace" | "new";

type Props = {
  open: boolean;
  hasExistingData: boolean;
  canCreateNew: boolean;
  onClose: () => void;
  onApply: (profile: Profile, mode: ApplyMode) => void;
};

type Stage = "input" | "loading" | "confirm" | "error";

function coerceLevel(raw: string): LanguageLevel {
  const match = LANGUAGE_LEVELS.find((l) => l.toLowerCase() === raw?.toLowerCase());
  return match ?? "Fluent";
}

function hydrate(extracted: ExtractedProfile): Profile {
  const base = emptyProfile();
  return {
    ...base,
    ...extracted,
    languages: (extracted.languages ?? []).map((l) => ({
      id: uid(),
      name: l.name ?? "",
      level: coerceLevel(l.level),
    })),
    experience: (extracted.experience ?? []).map((e) => ({ id: uid(), ...e })),
    education: (extracted.education ?? []).map((e) => ({ id: uid(), ...e })),
    projects: (extracted.projects ?? []).map((p) => ({ id: uid(), ...p })),
    certifications: (extracted.certifications ?? []).map((c) => ({ id: uid(), ...c })),
  };
}

export function ImportCvModal({ open, hasExistingData, canCreateNew, onClose, onApply }: Props) {
  const [stage, setStage] = useState<Stage>("input");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Profile | null>(null);

  if (!open) return null;

  const reset = () => {
    setStage("input");
    setPastedText("");
    setFileName(null);
    setError(null);
    setPreview(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  async function runExtraction(text: string) {
    setStage("loading");
    setError(null);
    try {
      const extracted = await importCv(text);
      setPreview(hydrate(extracted));
      setStage("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "EXTRACTION_ABORTED");
      setStage("error");
    }
  }

  async function onFileSelected(file: File) {
    setFileName(file.name);
    setStage("loading");
    setError(null);
    try {
      const text = await extractFileText(file);
      if (text.trim().length < 50) {
        throw new Error("INSUFFICIENT_DATA_IN_FILE. TXT/PDF PARSE FAILED.");
      }
      await runExtraction(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "FILE_READ_ERROR");
      setStage("error");
    }
  }

  function onPasteSubmit() {
    if (pastedText.trim().length < 50) {
      setError("MINIMUM 50 CHARS REQUIRED.");
      setStage("error");
      return;
    }
    void runExtraction(pastedText);
  }

  function apply(mode: ApplyMode) {
    if (!preview) return;
    onApply(preview, mode);
    close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(234,179,8,1)] w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-black px-6 py-4 bg-black text-white">
          <h3 className="text-xl font-black uppercase">DATA_IMPORT_MODULE</h3>
          <button onClick={close} className="border-2 border-white bg-black text-white hover:bg-white hover:text-black font-bold px-2 py-0.5 text-xs transition-colors" aria-label="Close">
            [X] TERMINATE
          </button>
        </div>

        <div className="px-8 py-8 overflow-y-auto">
          {stage === "input" && (
            <div className="space-y-8">
              <p className="text-base font-bold uppercase bg-slate-100 p-3 border-2 border-black inline-block">
                INPUT PDF OR TXT FOR AUTOMATED EXTRACTION.
              </p>

              <label className="block border-4 border-black border-dashed p-8 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFileSelected(f);
                  }}
                />
                <div className="text-xl font-black uppercase mb-2">SELECT_FILE</div>
                <div className="text-sm font-bold bg-black text-white px-2 py-1 inline-block">MAX_SIZE :: ~5MB</div>
                {fileName && <div className="text-sm font-bold text-[#eab308] bg-black mt-4 px-3 py-1 inline-block border-2 border-black">SELECTED :: {fileName}</div>}
              </label>

              <div className="relative text-center border-t-4 border-black border-dashed mt-8 mb-8">
                <span className="bg-white px-4 text-black font-black uppercase relative -top-3 text-lg">OR_MANUAL_FEED</span>
              </div>

              <textarea
                rows={8}
                className="w-full border-4 border-black bg-white p-4 font-mono text-sm focus:outline-none focus:bg-[#fefce8] brutal-shadow-sm transition-all"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="[ PASTE RAW TEXT BUFFER HERE ]"
              />

              <div className="flex justify-end gap-4">
                <button onClick={close} className="brutal-btn-secondary">
                  CANCEL
                </button>
                <button
                  onClick={onPasteSubmit}
                  disabled={pastedText.trim().length < 50}
                  className="brutal-btn-primary px-6 py-2"
                >
                  EXTRACT_DATA
                </button>
              </div>
            </div>
          )}

          {stage === "loading" && (
            <div className="py-20 text-center border-4 border-black bg-[#eab308] brutal-shadow flex flex-col items-center">
              <div className="w-16 h-16 bg-black animate-ping mb-8" />
              <p className="text-2xl font-black uppercase text-black mb-2">EXTRACTING_PAYLOAD...</p>
              <p className="text-sm font-bold font-mono bg-white text-black px-4 py-1 border-2 border-black">ESTIMATED_TIME :: 10-20S</p>
            </div>
          )}

          {stage === "confirm" && preview && (
            <div className="space-y-6">
              <p className="text-lg font-bold uppercase border-l-4 border-[#eab308] pl-3">
                EXTRACTION_COMPLETE. VERIFY PAYLOAD DESTINATION.
              </p>

              <div className="border-4 border-black bg-slate-50 p-6 text-sm space-y-3 max-h-72 overflow-y-auto brutal-shadow-sm">
                <PreviewRow label="NAME" value={preview.fullName || "NULL"} />
                <PreviewRow label="HEADLINE" value={preview.headline || "NULL"} />
                <PreviewRow label="EMAIL" value={preview.email || "NULL"} />
                <PreviewRow label="PHONE" value={preview.phone || "NULL"} />
                <PreviewRow label="LOCATION" value={preview.location || "NULL"} />
                <PreviewRow label="PORTFOLIO" value={preview.portfolio || "NULL"} />
                <PreviewRow label="SUMMARY" value={preview.summary ? `${preview.summary.slice(0, 100)}...` : "NULL"} />
                <PreviewRow label="SKILLS" value={preview.skills.length ? `${preview.skills.length} DETECTED` : "NULL"} />
                <PreviewRow label="LANGUAGES" value={preview.languages.length ? `${preview.languages.length} DETECTED` : "NULL"} />
                <PreviewRow label="EXPERIENCE" value={`${preview.experience.length} ROLES`} />
                <PreviewRow label="EDUCATION" value={`${preview.education.length} ENTRIES`} />
                <PreviewRow label="PROJECTS" value={`${preview.projects.length} ENTRIES`} />
                <PreviewRow label="CERTS" value={`${preview.certifications.length} ENTRIES`} />
              </div>

              {hasExistingData && (
                <div className="bg-black text-[#eab308] font-bold p-3 border-4 border-[#eab308] uppercase text-sm">
                  [!] WARNING: REPLACING WILL OVERWRITE ACTIVE PROFILE DATA.
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
                <button onClick={reset} className="brutal-btn-secondary">
                  RETRY_IMPORT
                </button>
                {canCreateNew && (
                  <button
                    onClick={() => apply("new")}
                    className="brutal-btn-secondary !bg-black !text-white hover:!bg-white hover:!text-black"
                  >
                    APPLY_TO_NEW
                  </button>
                )}
                <button
                  onClick={() => apply("replace")}
                  className="brutal-btn-primary px-4 py-2"
                >
                  {hasExistingData ? "OVERWRITE_ACTIVE" : "COMMIT_DATA"}
                </button>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="space-y-6">
              <div className="border-4 border-black bg-red-600 p-6 text-white brutal-shadow">
                <h4 className="text-2xl font-black uppercase mb-2">SYSTEM_ERROR</h4>
                <p className="font-mono font-bold uppercase bg-black px-3 py-2 border-2 border-white">{error}</p>
              </div>
              <div className="flex justify-end gap-4">
                <button onClick={close} className="brutal-btn-secondary">
                  ABORT
                </button>
                <button onClick={reset} className="brutal-btn-primary px-6 py-2">
                  RETRY
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b-2 border-slate-200 pb-2 last:border-0 last:pb-0">
      <span className="font-black text-black w-32 shrink-0 uppercase">{label}</span>
      <span className="text-slate-700 font-bold break-words">{value}</span>
    </div>
  );
}
