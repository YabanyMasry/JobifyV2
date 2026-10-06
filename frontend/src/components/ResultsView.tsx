import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { buildFilename, downloadMarkdown, downloadPdf } from "../lib/download";
import type { GeneratedBundle } from "../lib/api";
import type { GenerationKind } from "../types";

type Props = {
  bundle: GeneratedBundle;
  candidateName: string;
  company: string;
  onBack: () => void;
  onRefine: (instruction: string) => Promise<void>;
  refining: boolean;
  refineError: string | null;
};

const REFINE_EXAMPLES = [
  "ELEVATE_SUMMARY_TONE",
  "PURGE_WEAKEST_PROJECT",
  "CASUALIZE_COVER_LETTER",
  "EMPHASIZE_TYPESCRIPT_USAGE",
];

export function ResultsView({
  bundle,
  candidateName,
  company,
  onBack,
  onRefine,
  refining,
  refineError,
}: Props) {
  const [instruction, setInstruction] = useState("");
  const score = extractScore(bundle.atsReport);
  const scoreSummary = extractScoreSummary(bundle.atsReport);

  const submitRefine = async () => {
    const value = instruction.trim();
    if (!value || refining) return;
    await onRefine(value);
    setInstruction("");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-mono selection:bg-[#eab308] selection:text-black">
      <header className="sticky top-0 z-30 bg-black text-white border-b-4 border-black">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 font-bold uppercase hover:text-[#eab308] transition-colors"
          >
            <span className="bg-white text-black px-1.5 py-0.5 border border-white text-xs">ESC</span> ABORT
          </button>
          <div className="flex-1 text-center font-bold uppercase tracking-widest text-sm hidden sm:block">
            {company ? `TARGET :: ${company}` : "TARGET :: UNKNOWN"}
          </div>
          {score ? <ScoreBadge score={score} /> : <div className="w-16" />}
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 pb-48 space-y-12">
        {scoreSummary && (
          <div className="border-4 border-black bg-[#eab308] p-6 brutal-shadow text-black">
            <div className="font-bold text-xl uppercase mb-2 border-b-2 border-black pb-1 inline-block">
              SYS_DIAGNOSTIC
            </div>
            <p className="text-lg font-medium leading-relaxed font-sans bg-black text-white p-3 border-2 border-black">
              {scoreSummary}
            </p>
          </div>
        )}

        <SectionLabel
          eyebrow="OUTPUT_BUFFER"
          title="COMPILED_DOCUMENTS"
          description="REVIEW PAYLOAD. DOWNLOAD OR SUBMIT REFINEMENT COMMANDS BELOW."
        />

        <DocCard
          title="CURRICULUM_VITAE"
          content={bundle.cv}
          kind="cv"
          candidateName={candidateName}
          company={company}
        />

        <DocCard
          title="COVER_LETTER"
          content={bundle.coverLetter}
          kind="cover-letter"
          candidateName={candidateName}
          company={company}
        />

        <SectionLabel
          eyebrow="ANALYSIS_BUFFER"
          title="ATS_MATCH_REPORT"
          description="RAW SCORING AND GAP ANALYSIS OF THE PROVIDED JOB SPECS."
        />

        <AtsCard content={bundle.atsReport} />

        <EditTips content={bundle.editInstructions} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-black border-t-4 border-black p-4 brutal-shadow-sm">
        <div className="max-w-4xl mx-auto">
          {!refining && (
            <div className="flex flex-wrap gap-2 mb-4 hidden sm:flex">
              <span className="text-[#eab308] font-bold text-xs uppercase self-center mr-2">QUICK_MACROS:</span>
              {REFINE_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInstruction(ex)}
                  className="text-xs font-bold uppercase border-2 border-white text-white px-2 py-1 hover:bg-white hover:text-black transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-4">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitRefine();
                }
              }}
              disabled={refining}
              placeholder="> ENTER_REFINEMENT_COMMAND"
              className="flex-1 border-4 border-white bg-black text-white px-4 py-3 text-lg focus:outline-none focus:border-[#eab308] focus:bg-[#111] disabled:opacity-50 placeholder:text-gray-500 font-mono"
            />
            <button
              onClick={submitRefine}
              disabled={refining || instruction.trim().length < 3}
              className="border-4 border-white bg-white text-black px-6 py-3 font-bold text-xl uppercase hover:bg-[#eab308] hover:border-[#eab308] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {refining ? (
                <>
                  <span className="w-4 h-4 bg-black animate-pulse" />
                  EXEC...
                </>
              ) : (
                "EXECUTE"
              )}
            </button>
          </div>
          {refineError && (
            <div className="mt-4 border-2 border-red-500 bg-red-900 text-white p-2 font-bold uppercase">
              [!] ERROR: {refineError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <div className="text-sm font-bold uppercase bg-black text-white px-2 py-1 inline-block border-2 border-black mb-2">
        {eyebrow}
      </div>
      <h2 className="text-4xl font-black font-sans uppercase text-black leading-none">{title}</h2>
      <p className="text-sm font-bold mt-2 text-black border-l-4 border-[#eab308] pl-3 uppercase max-w-lg">{description}</p>
    </div>
  );
}

function DocCard({
  title,
  content,
  kind,
  candidateName,
  company,
}: {
  title: string;
  content: string;
  kind: GenerationKind;
  candidateName: string;
  company: string;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const onCopyMd = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const onDownloadMd = () =>
    downloadMarkdown(content, buildFilename(candidateName, company, kind, "md"));
  const onDownloadPdf = () => {
    const html = articleRef.current?.innerHTML ?? "";
    const title = buildFilename(candidateName, company, kind, "pdf").replace(/\.pdf$/, "");
    downloadPdf(html, title);
  };

  return (
    <section className="border-4 border-black bg-white brutal-shadow mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b-4 border-black bg-[#eab308]">
        <h3 className="text-2xl font-black uppercase text-black">{title}</h3>
        <div className="flex flex-wrap gap-2">
          <ToolbarButton onClick={onCopyMd}>{copied ? "COPIED" : "CP_MARKDOWN"}</ToolbarButton>
          <ToolbarButton onClick={onDownloadMd}>DL_MD</ToolbarButton>
          <ToolbarButton onClick={onDownloadPdf} primary>
            DL_PDF
          </ToolbarButton>
        </div>
      </div>
      <article ref={articleRef} className="generated-doc px-6 py-8 sm:px-12 sm:py-12 bg-white">
        <ReactMarkdown
          components={{
            a: ({ node, href, children, ...props }) => {
              if (!href) return <a {...props}>{children}</a>;
              const displayUrl = href.replace(/^(mailto|tel):/, "");
              
              let text = "";
              if (typeof children === "string") text = children;
              else if (Array.isArray(children)) text = children.join("");

              const isGeneric = /^(linkedin|github|portfolio|website|email|resume|cv|link)$/i.test(text.trim());
              const isAlreadyUrl = text.includes("http") || text.includes(displayUrl) || text.includes("www.");

              if (isGeneric || isAlreadyUrl) {
                return (
                  <a href={href} {...props} className="break-all">
                    {displayUrl}
                  </a>
                );
              }

              return (
                <a href={href} {...props}>
                  {children} <span className="break-all">({displayUrl})</span>
                </a>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </section>
  );
}

function ToolbarButton({
  onClick,
  primary,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        primary
          ? "border-2 border-black bg-black text-white px-3 py-1 font-bold text-sm uppercase hover:bg-white hover:text-black transition-colors"
          : "border-2 border-black bg-white text-black px-3 py-1 font-bold text-sm uppercase hover:bg-black hover:text-white transition-colors"
      }
    >
      {children}
    </button>
  );
}

function AtsCard({ content }: { content: string }) {
  return (
    <section className="border-4 border-black bg-white brutal-shadow mb-12">
      <div className="px-6 py-4 border-b-4 border-black bg-black text-white">
        <h3 className="text-xl font-black uppercase">ATS_SCORING_ENGINE</h3>
      </div>
      <div className="generated-doc px-6 py-8 sm:px-12 sm:py-12 bg-white [&_h2]:hidden">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </section>
  );
}

function EditTips({ content }: { content: string }) {
  return (
    <details className="border-4 border-black bg-white brutal-shadow group mb-8">
      <summary className="cursor-pointer px-6 py-4 font-black uppercase text-xl text-black hover:bg-[#eab308] select-none flex items-center justify-between transition-colors">
        <span>MANUAL_REVISION_GUIDE</span>
        <span className="text-black font-bold group-open:rotate-180 transition-transform" aria-hidden>
          ▼
        </span>
      </summary>
      <div className="generated-doc px-6 py-8 sm:px-12 sm:py-8 text-black [&_h2]:hidden border-t-4 border-black">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </details>
  );
}

function ScoreBadge({ score }: { score: string }) {
  const n = parseFloat(score);
  const tone =
    n >= 8
      ? { bg: "bg-black", text: "text-[#eab308]", mark: "PASS" }
      : n >= 5
      ? { bg: "bg-black", text: "text-white", mark: "WARN" }
      : { bg: "bg-red-600", text: "text-white", mark: "FAIL" };

  return (
    <div
      className={`flex items-center border-2 border-white ${tone.bg} ${tone.text} font-bold px-2 py-1 uppercase text-sm`}
    >
      <span className="bg-white text-black px-1 mr-2 text-xs">{tone.mark}</span>
      MATCH_LVL :: {score}/10
    </div>
  );
}

const SCORE_RE = /(?<![\d.])(\d{1,2}(?:\.\d+)?)\s*\/\s*10\b/;

function extractScore(atsReport: string): string | null {
  const m = atsReport.match(SCORE_RE);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n) || n < 0 || n > 10) return null;
  return String(n);
}

function extractScoreSummary(atsReport: string): string | null {
  const m = atsReport.match(
    /(?<![\d.])\d{1,2}(?:\.\d+)?\s*\/\s*10\b[^\n]*(?:\n(?!\s*$)[^\n]+)*/,
  );
  if (!m) return null;
  const line = m[0].replace(/\*\*/g, "").replace(/^\s*-\s*/, "").trim();
  if (line.length > 280) return line.slice(0, 277) + "…";
  return line;
}
