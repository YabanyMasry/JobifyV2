import { useState } from "react";
import type { Profile, Experience, Education, Project, Certification, Language, LanguageLevel, BackgroundEntry, BackgroundCategory } from "../types";
import { LANGUAGE_LEVELS, BACKGROUND_CATEGORIES } from "../types";
import { uid } from "../lib/storage";

type Props = {
  profile: Profile;
  onChange: (p: Profile) => void;
};

const inputCls = "brutal-input";
const labelCls = "block text-sm font-bold uppercase tracking-widest text-black mb-2";
const sectionCls = "border-4 border-black p-6 bg-white mb-8 brutal-shadow relative mt-10";
const sectionTitleWrapper = "absolute -top-7 left-4";
const sectionTitle = "text-2xl font-black uppercase tracking-tighter border-4 border-black bg-[#eab308] px-4 py-1 inline-block text-black";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function ProfileForm({ profile, onChange }: Props) {
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    onChange({ ...profile, [key]: value });

  return (
    <div className="space-y-12">
      <section className={sectionCls}>
        <div className={sectionTitleWrapper}>
          <h3 className={sectionTitle}>SYSTEM_PROFILE</h3>
        </div>
        <Field label="PROFILE_LABEL (OPTIONAL)">
          <input
            className={inputCls}
            value={profile.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder="E.G. SOFTWARE_DEV_V1"
          />
        </Field>
        <p className="text-xs font-mono font-bold text-black mt-2 bg-slate-200 inline-block px-2 py-0.5 border-2 border-black">
          IDENTIFIER FOR MULTIPLE PROFILES. LEAVE BLANK FOR FULL NAME.
        </p>
      </section>

      <section className={sectionCls}>
        <div className={sectionTitleWrapper}>
          <h3 className={sectionTitle}>CORE_DATA</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Field label="FULL_NAME">
            <input className={inputCls} value={profile.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="HEADLINE">
            <input className={inputCls} value={profile.headline} onChange={(e) => set("headline", e.target.value)} placeholder="SENIOR_ENGINEER" />
          </Field>
          <Field label="EMAIL">
            <input className={inputCls} type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="PHONE">
            <input className={inputCls} value={profile.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="LOCATION">
            <input className={inputCls} value={profile.location} onChange={(e) => set("location", e.target.value)} />
          </Field>
          <Field label="WEBSITE">
            <input className={inputCls} value={profile.website} onChange={(e) => set("website", e.target.value)} placeholder="DOMAIN.COM" />
          </Field>
          <Field label="LINKEDIN">
            <input className={inputCls} value={profile.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
          </Field>
          <Field label="PORTFOLIO">
            <input className={inputCls} value={profile.portfolio} onChange={(e) => set("portfolio", e.target.value)} placeholder="BEHANCE / GITHUB" />
          </Field>
          <Field label="GITHUB (OPTIONAL)">
            <input className={inputCls} value={profile.github} onChange={(e) => set("github", e.target.value)} placeholder="GITHUB.COM/USER" />
          </Field>
        </div>
      </section>

      <section className={sectionCls}>
        <div className={sectionTitleWrapper}>
          <h3 className={sectionTitle}>EXECUTIVE_SUMMARY</h3>
        </div>
        <textarea
          className={inputCls}
          rows={5}
          value={profile.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="ENTER SUMMARY STATEMENT [2-3 SENTENCES]"
        />
      </section>

      <section className={sectionCls}>
        <div className={sectionTitleWrapper}>
          <h3 className={sectionTitle}>SKILLS_MATRIX</h3>
        </div>
        <ListEditor
          values={profile.skills}
          onChange={(v) => set("skills", v)}
          placeholder="INPUT SKILLS (COMMA OR ENTER)"
        />
      </section>

      <section className={sectionCls}>
        <div className={sectionTitleWrapper}>
          <h3 className={sectionTitle}>LANGUAGES</h3>
        </div>
        <LanguagesEditor
          values={profile.languages}
          onChange={(v) => set("languages", v)}
        />
      </section>

      <Repeater
        title="EXPERIENCE_LOG"
        items={profile.experience}
        onChange={(v) => set("experience", v)}
        empty={(): Experience => ({ id: uid(), title: "", company: "", location: "", startDate: "", endDate: "", description: "" })}
        render={(item, update) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="ROLE"><input className={inputCls} value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} /></Field>
            <Field label="ORGANIZATION"><input className={inputCls} value={item.company} onChange={(e) => update({ ...item, company: e.target.value })} /></Field>
            <Field label="LOCATION"><input className={inputCls} value={item.location ?? ""} onChange={(e) => update({ ...item, location: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="START_DATE"><input className={inputCls} value={item.startDate} onChange={(e) => update({ ...item, startDate: e.target.value })} placeholder="JAN_2022" /></Field>
              <Field label="END_DATE"><input className={inputCls} value={item.endDate} onChange={(e) => update({ ...item, endDate: e.target.value })} placeholder="PRESENT" /></Field>
            </div>
            <div className="sm:col-span-2 mt-2">
              <Field label="ACHIEVEMENTS_&_DUTIES">
                <textarea className={inputCls} rows={4} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} />
              </Field>
            </div>
          </div>
        )}
      />

      <Repeater
        title="EDUCATION_RECORD"
        items={profile.education}
        onChange={(v) => set("education", v)}
        empty={(): Education => ({ id: uid(), degree: "", institution: "", location: "", startDate: "", endDate: "", details: "" })}
        render={(item, update) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="DEGREE"><input className={inputCls} value={item.degree} onChange={(e) => update({ ...item, degree: e.target.value })} /></Field>
            <Field label="INSTITUTION"><input className={inputCls} value={item.institution} onChange={(e) => update({ ...item, institution: e.target.value })} /></Field>
            <Field label="LOCATION"><input className={inputCls} value={item.location ?? ""} onChange={(e) => update({ ...item, location: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="START_DATE"><input className={inputCls} value={item.startDate} onChange={(e) => update({ ...item, startDate: e.target.value })} /></Field>
              <Field label="END_DATE"><input className={inputCls} value={item.endDate} onChange={(e) => update({ ...item, endDate: e.target.value })} /></Field>
            </div>
            <div className="sm:col-span-2 mt-2">
              <Field label="ADDITIONAL_DETAILS">
                <textarea className={inputCls} rows={3} value={item.details ?? ""} onChange={(e) => update({ ...item, details: e.target.value })} />
              </Field>
            </div>
          </div>
        )}
      />

      <Repeater
        title="PROJECTS_&_PORTFOLIO"
        items={profile.projects}
        onChange={(v) => set("projects", v)}
        empty={(): Project => ({ id: uid(), name: "", link: "", description: "" })}
        render={(item, update) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="PROJECT_NAME"><input className={inputCls} value={item.name} onChange={(e) => update({ ...item, name: e.target.value })} placeholder="NAME" /></Field>
            <Field label="URL_LINK"><input className={inputCls} value={item.link ?? ""} onChange={(e) => update({ ...item, link: e.target.value })} /></Field>
            <div className="sm:col-span-2 mt-2">
              <Field label="DESCRIPTION">
                <textarea className={inputCls} rows={3} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} placeholder="METHODS, TOOLS, OUTCOMES" />
              </Field>
            </div>
          </div>
        )}
      />

      <Repeater
        title="CERTIFICATIONS"
        items={profile.certifications}
        onChange={(v) => set("certifications", v)}
        empty={(): Certification => ({ id: uid(), name: "", issuer: "", date: "" })}
        render={(item, update) => (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="NAME"><input className={inputCls} value={item.name} onChange={(e) => update({ ...item, name: e.target.value })} /></Field>
            <Field label="ISSUER"><input className={inputCls} value={item.issuer} onChange={(e) => update({ ...item, issuer: e.target.value })} /></Field>
            <Field label="DATE"><input className={inputCls} value={item.date} onChange={(e) => update({ ...item, date: e.target.value })} /></Field>
          </div>
        )}
      />

      <div className="border-t-4 border-dashed border-black pt-4">
        <p className="inline-block font-mono text-xs font-bold uppercase bg-black text-[#eab308] px-3 py-1 border-2 border-black">
          :: AI_CHAT_CONTEXT — SECTIONS BELOW ARE EXCLUDED FROM CV GENERATION
        </p>
      </div>

      <Repeater
        title="PERSONAL_DOSSIER"
        note="HIGH SCHOOL, CLUBS, AWARDS, VOLUNTEERING, HOBBIES, LIFE EVENTS. ANYTHING THE CHAT SHOULD KNOW ABOUT YOU."
        items={profile.background ?? []}
        onChange={(v) => set("background", v)}
        empty={(): BackgroundEntry => ({ id: uid(), category: "High School", title: "", period: "", details: "" })}
        render={(item, update) => (
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr_180px] gap-4">
            <Field label="CATEGORY">
              <select
                className={inputCls}
                value={item.category}
                onChange={(e) => update({ ...item, category: e.target.value as BackgroundCategory })}
              >
                {BACKGROUND_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </Field>
            <Field label="TITLE">
              <input className={inputCls} value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} placeholder="E.G. ROBOTICS CLUB CAPTAIN" />
            </Field>
            <Field label="PERIOD">
              <input className={inputCls} value={item.period ?? ""} onChange={(e) => update({ ...item, period: e.target.value })} placeholder="2016 — 2019" />
            </Field>
            <div className="sm:col-span-3">
              <Field label="DETAILS">
                <textarea className={inputCls} rows={3} value={item.details} onChange={(e) => update({ ...item, details: e.target.value })} placeholder="WHAT HAPPENED, WHAT YOU DID, WHY IT MATTERS" />
              </Field>
            </div>
          </div>
        )}
      />

      <section className={sectionCls}>
        <div className={sectionTitleWrapper}>
          <h3 className={sectionTitle}>ABOUT_ME :: FREEFORM</h3>
        </div>
        <textarea
          className={inputCls}
          rows={6}
          value={profile.aboutMe ?? ""}
          onChange={(e) => set("aboutMe", e.target.value)}
          placeholder="[ GOALS, VALUES, WORK STYLE, WHY YOU GOT INTO YOUR FIELD, THINGS YOU'D MENTION IN AN INTERVIEW... ]"
        />
      </section>
    </div>
  );
}

function ListEditor({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange([...values, ...parts]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center font-mono font-bold uppercase gap-2 bg-black text-white px-3 py-1 border-2 border-black text-sm">
            {v}
            <button
              type="button"
              className="text-[#eab308] hover:text-white"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              aria-label={`Remove ${v}`}
            >
              [X]
            </button>
          </span>
        ))}
      </div>
      <input
        className={inputCls}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          if (next.includes(",")) {
            commit(next);
            setDraft("");
          } else {
            setDraft(next);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            setDraft("");
          } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            commit(draft);
            setDraft("");
          }
        }}
        placeholder={placeholder}
      />
    </div>
  );
}

function LanguagesEditor({
  values,
  onChange,
}: {
  values: Language[];
  onChange: (v: Language[]) => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<LanguageLevel>("Fluent");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    onChange([...values, { id: uid(), name: n, level }]);
    setName("");
    setLevel("Fluent");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {values.map((lang) => (
          <span
            key={lang.id}
            className="inline-flex items-center gap-2 font-mono font-bold uppercase bg-white text-black px-3 py-1 text-sm border-2 border-black brutal-shadow-sm"
          >
            <span>{lang.name}</span>
            <span className="text-slate-500">::{lang.level}</span>
            <button
              type="button"
              className="ml-2 text-red-600 hover:text-black hover:bg-red-600 hover:text-white px-1"
              onClick={() => onChange(values.filter((l) => l.id !== lang.id))}
              aria-label={`Remove ${lang.name}`}
            >
              [X]
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-sm font-mono font-bold text-slate-400 uppercase">NO_LANGUAGES_RECORDED</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="LANGUAGE_NAME"
        />
        <select
          className={inputCls}
          value={level}
          onChange={(e) => setLevel(e.target.value as LanguageLevel)}
        >
          {LANGUAGE_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          className="brutal-btn-secondary h-full"
        >
          APPEND
        </button>
      </div>
    </div>
  );
}

type RepeaterItem = { id: string };

function Repeater<T extends RepeaterItem>({
  title,
  note,
  items,
  onChange,
  empty,
  render,
}: {
  title: string;
  note?: string;
  items: T[];
  onChange: (v: T[]) => void;
  empty: () => T;
  render: (item: T, update: (v: T) => void) => React.ReactNode;
}) {
  return (
    <section className={sectionCls}>
      <div className={sectionTitleWrapper}>
        <h3 className={sectionTitle}>{title}</h3>
      </div>
      <div className="flex items-start justify-between gap-4 mb-6">
        {note ? <p className="text-xs font-mono font-bold uppercase border-l-4 border-[#eab308] pl-3 pt-1">{note}</p> : <span />}
        <button
          type="button"
          onClick={() => onChange([...items, empty()])}
          className="brutal-btn-secondary !py-1 !px-3 shrink-0"
        >
          + ADD_ENTRY
        </button>
      </div>
      <div className="space-y-8">
        {items.length === 0 && <p className="text-sm font-mono font-bold text-slate-400 uppercase">NO_RECORDS_FOUND.</p>}
        {items.map((item, idx) => (
          <div key={item.id} className="border-2 border-black bg-slate-50 p-6 relative brutal-shadow-sm">
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== idx))}
              className="absolute -top-3 -right-3 bg-red-600 text-white font-mono font-bold border-2 border-black px-2 py-0.5 hover:bg-black text-xs uppercase brutal-shadow-sm"
              aria-label="Remove entry"
            >
              [ REMOVE ]
            </button>
            {render(item, (v) => onChange(items.map((it, j) => (j === idx ? v : it))))}
          </div>
        ))}
      </div>
    </section>
  );
}
