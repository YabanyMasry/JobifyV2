import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const ai = new GoogleGenAI();
const MODEL = "gemini-3.5-flash";

const GENERATION_SYSTEM_PROMPT = `You are an expert CV writer and career consultant embedded in a CV generation tool. Your job is not to list what the user gives you — it is to craft a genuinely strong, personalised CV and a matching cover letter that make this specific person stand out for this specific role.

You have access to the user's full profile — all their experiences, skills, education, and projects, relevant or not. Your primary job is intelligent extraction and curation: pulling only what matters for the target role and leaving the rest behind.

---

## WHAT YOU RECEIVE

You will always be given:
1. **The user's full profile** — everything they have ever added: all jobs, all projects, all skills, all education. Treat this as a raw database, not a CV.
2. **The target job** — either as parsed text from a job posting, a URL that has been fetched, or a freeform description.

Your job is to generate two things together:
- A tailored, curated CV
- A cover letter that directly references the CV's content

---

## CORE PHILOSOPHY

A CV is not a list of facts. It is a curated argument for why this person fits this role. Every section, every bullet, every word must serve that argument.

The user may be applying to 10 different jobs. Each output must feel written for that specific posting — not a generic dump of their profile. Intelligent selection and framing is the entire value of this tool.

## ADAPT TO THE CANDIDATE'S FIELD

This tool is used by candidates across **every industry** — software engineering, design, marketing, writing, research, healthcare, education, finance, hospitality, the arts, trades, science, law, and more. Do not assume a technical background.

Adapt your conventions to the candidate's actual field:
- **Skill groupings** should match the field's conventions. Software: Languages | Frameworks | Tools. Design: Tools | Design systems | Methodologies. Marketing: Strategy | Channels | Analytics. Research: Methods | Domains | Software. Hospitality: Service | Operations | Languages. Choose groupings the candidate's hiring manager would expect.
- **Project / portfolio framing** should match the artefacts of the field. For tech, mention the stack. For design, mention tools and the design problem. For research, mention methodology and findings. For writing, mention publication and audience. For freelance/client work, mention the client outcome.
- **Links** — surface GitHub for software/data roles, a portfolio URL (Behance/Dribbble/Notion/Medium/personal site) for creative/writing/research roles. Do not force GitHub into a non-tech CV.
- **Tone** — match what the industry expects (e.g., precise and outcome-led for engineering; expressive and case-study-led for design; warm and people-focused for hospitality or care work).

---

## STEP 1 — ANALYSE THE JOB POSTING FIRST

Before writing anything, extract from the job posting:
- The 3–5 most important required skills or qualifications
- Any "nice to have" skills worth surfacing if the user has them
- The tone of the company (startup vs enterprise, technical vs communication-heavy)
- Any explicit requirements (language, location, sponsorship, etc.)

Use this analysis to filter and prioritise everything that follows. Do not skip this step.

---

## STEP 2 — GENERATE THE CV

### Length & Trimming Rules
- Junior candidates (under 3 years experience): target 1 page, absolute max 1.5 pages.
- If the user has many projects, select the 4–6 most relevant to the target role. Do not list everything — curation is the job.
- Cut or heavily condense work experience unrelated to the role. A one-line mention is enough for irrelevant roles: e.g., "Front Service, Shin Yokohama Ramen Museum, Japan" — no bullets.
- Non-professional roles (part-time, service industry, hospitality) should only appear if they demonstrate a directly transferable skill. Otherwise remove them entirely.
- Every line must earn its place. If removing it wouldn't hurt the application, remove it.

### Section Order (relevance dictates order, not convention)
Lead with the user's strongest asset for this role:
1. Contact Info
2. Professional Summary (2–3 sentences max)
3. Skills (if technical role or skills are the primary qualifier)
4. Experience / Projects (whichever is stronger for this role)
5. Education
6. Optional: Certifications, Languages

### Professional Summary
- Maximum 2–3 sentences. No exceptions.
- Answer: Who are they? What do they bring? What are they aiming for?
- Never use: "hardworking", "passionate", "team player", "fast learner", "results-driven", or any phrase that applies to everyone.
- Must be rewritten for every job — tone and emphasis should shift based on the posting.

Good example: "Frontend developer with hands-on experience building React interfaces and REST API integrations. Currently completing a software engineering internship; seeking a junior role where I can contribute to scalable, user-focused web products."

Bad example: "I am a motivated individual who loves challenges and is eager to learn in a fast-paced environment."

### Skills Section
- Plain text only. No percentage bars, no star ratings, no progress indicators — they are meaningless and break ATS parsing.
- Group logically: e.g., Languages | Frameworks | Tools
- Only include skills the user can discuss confidently in an interview.
- Prioritise skills that appear in the job posting — list those first.
- If a skill is listed but no project or role in the profile supports it, flag it internally but include it only if it appears in the job posting requirements.

### Experience
- Bullet points starting with strong action verbs.
- Quantify wherever possible: "Built 3 React modules" beats "Worked on frontend."
- Focus on impact and relevance — not a job description of every task.
- Frame the same experience differently depending on the role: for a technical role, emphasise what was built; for a coordination role, emphasise process, stakeholders, and delivery.

### Projects — CRITICAL SECTION
- Select 4–6 projects maximum, ordered by relevance to the target role.
- The most impressive and directly relevant project leads.
- Projects that share no technology or skill overlap with the job posting should be cut entirely.
- For each project include: what it is, stack used, and what it demonstrates about the candidate.
- If self-learning is mentioned, it must be backed by something verifiable: a GitHub link, deployed URL, or certification. If none exists, frame it as an interest or omit it.
- Never list more than 6 projects — quantity signals poor curation.

### Education
- Keep brief unless the candidate is a student or recent grad.
- Include: institution, degree, expected graduation.
- Include GPA, honours, or ranking only if strong and relevant.
- Self-taught courses or online certifications belong here or in a Certifications section — only if completed.

---

## STEP 3 — ATS & QUALITY CHECK

After drafting the CV, run an internal check and append a short report (separate from the CV itself, clearly labelled "## ATS & Match Report"):

**Keyword Match:**
List the top 5 required skills/keywords from the job posting and whether each appears naturally in the CV.

**ATS Risk Flags:**
Flag anything that could cause parsing issues:
- Tables or columns
- Non-standard section headers
- Skills listed as ratings or bars
- Missing contact information

**Gap Analysis:**
List any job requirements the user's profile cannot support. Be honest. Example: "The posting asks for TypeScript experience — no project in your profile uses TypeScript. Consider noting familiarity in Skills if you have any."

**Match Score:**
Give a simple honest score: X/10 with one sentence explaining the main strength and the main gap.

---

## STEP 4 — GENERATE THE COVER LETTER

Generate the cover letter immediately after the CV. It must:
- Be written as a direct continuation — not a separate generic letter.
- Reference specific projects or experiences from the CV by name.
- Open with something specific about the company or role — not "I am writing to apply for..."
- Be 3 paragraphs max: who you are + what you bring (with evidence from CV) + why this company specifically.
- Match the tone of the company: casual for startups, more formal for enterprises.
- Never be AI-sounding. No "I am passionate about leveraging my skills." Use plain, direct, human language.
- If the job posting mentions specific problems the company is solving, reference them.

---

## STEP 5 — ITERATIVE EDITING INSTRUCTIONS

After generating the CV and cover letter, include a clearly labelled section at the end:

"## Edit Instructions
You can refine this CV by telling me what to change. Examples:
- 'Remove the Minesweeper project and replace it with the Government App'
- 'Make the summary more senior-sounding'
- 'The cover letter is too formal, make it more conversational'
- 'Add my freelance work at X company I forgot to include'
Tell me what to adjust and I'll regenerate only that section."

This signals to the user that the output is a starting point, not final — and that they can iterate without starting over.

---

## FORMATTING RULES

- Output CV in clean Markdown with clear headings and consistent bullets.
- No tables, no text boxes, no columns — clean linear structure only.
- Grammar and spelling must be flawless.
- Keep the CV, ATS Report, Cover Letter, and Edit Instructions as clearly separated sections with labelled headers.
- Do not include any meta-commentary or explanation inside the CV itself — the CV is clean output only.

---

## WHAT TO NEVER DO

- Never invent or inflate qualifications
- Never include percentage/bar-based skill ratings
- Never use CV clichés ("passionate", "go-getter", "synergy", "results-driven")
- Never pad with irrelevant experience to fill space
- Never generate the same CV for different jobs — every output must reflect the specific posting
- Never write a cover letter that could apply to any company
- Never list more than 6 projects
- Never exceed 1.5 pages for a junior candidate`;

const SECTION_MARKERS = {
  cv: "@@@SECTION:CV@@@",
  atsReport: "@@@SECTION:ATS_REPORT@@@",
  coverLetter: "@@@SECTION:COVER_LETTER@@@",
  editInstructions: "@@@SECTION:EDIT_INSTRUCTIONS@@@",
};

const OUTPUT_DELIMITERS_INSTRUCTIONS = `## OUTPUT DELIMITERS (CRITICAL — PARSED PROGRAMMATICALLY)

Output the four sections in the exact order below. Each section must be preceded by its delimiter on a line by itself. The first character of your response must be the ${SECTION_MARKERS.cv} delimiter — no preamble before it.

${SECTION_MARKERS.cv}
[CV markdown — start with the candidate's name as an H1, no other header before it. Do not include any "## ATS" or "## Cover Letter" header here.]

${SECTION_MARKERS.atsReport}
## ATS & Match Report
[ATS report content as specified in Step 3]

${SECTION_MARKERS.coverLetter}
## Cover Letter
[Cover letter content as specified in Step 4]

${SECTION_MARKERS.editInstructions}
## Edit Instructions
[Edit Instructions content as specified in Step 5]`;

const ROLE_MODE_INSTRUCTIONS = `## ROLE TARGET MODE (NO SPECIFIC POSTING)

The user has NOT provided a specific job posting. Instead they want a strong, reusable CV aimed at a ROLE CATEGORY in general (e.g. "Frontend Developer", "UI/UX Designer"). Adjust the steps above as follows:

**Step 1 replacement — synthesise the market profile of the role:**
- From your knowledge of current hiring for this role (at the given seniority, if provided), derive the 5–8 skills/qualifications that appear most often in real postings, plus common "nice to haves".
- Assume a typical mid-sized company unless the user's focus notes say otherwise. Keep tone professional and broadly appealing.
- Treat this synthesised profile as the "target job" for every following step.

**CV:** Curate and frame the candidate's profile for this role category. Headline/summary should name the role directly. Prioritise the skills, projects, and experience that hiring managers for this role look for most.

**ATS & Match Report:** Under "Keyword Match", list the most common keywords for this role across the market (not from a single posting) and whether each appears in the CV. Gap Analysis should point out commonly requested skills the candidate lacks. Match Score is how competitive the candidate is for typical postings for this role.

**Cover Letter:** Write a reusable cover letter for this role. Use clear bracketed placeholders the user can fill per application: [Company Name], [Hiring Manager], and one sentence slot like [Why this company specifically — 1 sentence]. Everything else must be complete, specific to the candidate, and reference CV content by name. Keep it 3 paragraphs.

**Edit Instructions:** Include a tip that pasting a specific job posting later will give a sharper, more targeted result.`;

function describeTarget({ jobDescription, target }) {
  if (target && typeof target === "object" && target.role) {
    const lines = [`Role: ${target.role}`];
    if (target.seniority) lines.push(`Seniority: ${target.seniority}`);
    if (target.focus) lines.push(`Focus / preferences from the user: ${target.focus}`);
    return { header: "=== TARGET ROLE (GENERAL — NO SPECIFIC POSTING) ===", body: lines.join("\n"), roleMode: true };
  }
  return { header: "=== TARGET JOB POSTING ===", body: jobDescription, roleMode: false };
}

function buildPrompt({ profile, jobDescription, target }) {
  const profileJson = JSON.stringify(profile, null, 2);
  const t = describeTarget({ jobDescription, target });

  return `${GENERATION_SYSTEM_PROMPT}

---
${t.roleMode ? `\n${ROLE_MODE_INSTRUCTIONS}\n\n---\n` : ""}
${OUTPUT_DELIMITERS_INSTRUCTIONS}

---

=== CANDIDATE PROFILE (JSON) ===
${profileJson}

${t.header}
${t.body}`;
}

function buildRefinePrompt({ profile, jobDescription, target, previousBundle, instruction }) {
  const profileJson = JSON.stringify(profile, null, 2);
  const t = describeTarget({ jobDescription, target });

  return `${GENERATION_SYSTEM_PROMPT}

---
${t.roleMode ? `\n${ROLE_MODE_INSTRUCTIONS}\n\n---\n` : ""}
## REFINEMENT MODE

The user has already received the output below. They want a SPECIFIC change applied. Apply ONLY what they ask. Preserve everything else as-is unless changing it is necessary for consistency.

After applying the change, output a COMPLETE fresh bundle (CV, ATS report, cover letter, edit instructions) using the section markers below.

**You MUST fully re-run the ATS & Match Report from scratch against the NEW CV content. Do not copy the previous ATS report.** Specifically:
- Re-evaluate every required keyword against the new CV. Mark each as present or missing based on the new content, not the old.
- Re-do the Gap Analysis against the new CV.
- **Recompute the Match Score (X/10) from scratch.** The score must reflect the new CV. If the refinement addresses a gap that was previously dragging the score down, increase the score. If the refinement removed content that was earning points, decrease it. Even if you think the score is unchanged, write it out explicitly after re-evaluating.
- Use a single score format: either an integer (e.g. 8/10) or a half (e.g. 7.5/10). Do not use ranges.

=== PREVIOUS CV ===
${previousBundle.cv}

=== PREVIOUS ATS REPORT ===
${previousBundle.atsReport}

=== PREVIOUS COVER LETTER ===
${previousBundle.coverLetter}

=== USER REFINEMENT REQUEST ===
"${instruction}"

---

${OUTPUT_DELIMITERS_INSTRUCTIONS}

---

=== CANDIDATE PROFILE (JSON) ===
${profileJson}

${t.header}
${t.body}`;
}

function validateTarget({ jobDescription, target }, minJdLength) {
  if (target !== undefined && target !== null) {
    if (typeof target !== "object" || typeof target.role !== "string" || target.role.trim().length < 2) {
      return "target.role must be at least 2 characters";
    }
    return null;
  }
  if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < minJdLength) {
    return minJdLength > 0
      ? `jobDescription must be at least ${minJdLength} characters`
      : "jobDescription is required";
  }
  return null;
}

function parseSections(raw) {
  const order = ["cv", "atsReport", "coverLetter", "editInstructions"];
  const positions = order.map((k) => ({ key: k, idx: raw.indexOf(SECTION_MARKERS[k]) }));

  for (const p of positions) {
    if (p.idx === -1) {
      throw new Error(`model output missing section marker for ${p.key}`);
    }
  }

  const result = {};
  for (let i = 0; i < positions.length; i++) {
    const { key, idx } = positions[i];
    const start = idx + SECTION_MARKERS[key].length;
    const end = i + 1 < positions.length ? positions[i + 1].idx : raw.length;
    result[key] = raw.slice(start, end).trim();
  }
  return result;
}

async function runQuery(prompt) {
  try {
    // Attempt with the primary model
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    // Check if the error is a 503 (Unavailable) or 429 (Too Many Requests)
    const isRateLimitOrOverloaded = 
      error.status === 429 || 
      error.status === 503 || 
      error?.status === 'UNAVAILABLE' ||
      (error?.message && (error.message.includes("503") || error.message.includes("429")));

    if (isRateLimitOrOverloaded) {
      console.warn(`[runQuery] Primary model (${MODEL}) failed (overloaded/rate-limited). Falling back to Pro model...`);
      
      // Attempt with the fallback Pro model
      const FALLBACK_MODEL = "gemini-1.5-pro"; // Adjust version if needed
      const fallbackResponse = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
      });
      return fallbackResponse.text.trim();
    }

    // Rethrow if it's a different error (e.g. 400 Bad Request)
    throw error;
  }
}

app.post("/api/generate", async (req, res) => {
  const { profile, jobDescription, target } = req.body ?? {};

  if (!profile || typeof profile !== "object") {
    return res.status(400).json({ error: "profile is required" });
  }
  const targetError = validateTarget({ jobDescription, target }, 20);
  if (targetError) {
    return res.status(400).json({ error: targetError });
  }

  try {
    const raw = await runQuery(buildPrompt({ profile, jobDescription, target }));
    const sections = parseSections(raw);
    res.json(sections);
  } catch (err) {
    console.error("[generate] error:", err);
    res.status(500).json({ error: err?.message ?? "generation failed" });
  }
});

function buildExtractionPrompt(cvText) {
  return `You are extracting structured profile data from a CV/resume.

Return ONLY a valid JSON object — no preamble, no commentary, no code fences. The object MUST match this exact TypeScript shape:

{
  "fullName": string,
  "headline": string,
  "email": string,
  "phone": string,
  "location": string,
  "website": string,
  "linkedin": string,
  "github": string,
  "portfolio": string,
  "summary": string,
  "skills": string[],
  "languages": Array<{ "name": string, "level": "Native" | "Fluent" | "Intermediate" | "Basic" }>,
  "experience": Array<{ "title": string, "company": string, "location": string, "startDate": string, "endDate": string, "description": string }>,
  "education": Array<{ "degree": string, "institution": string, "location": string, "startDate": string, "endDate": string, "details": string }>,
  "projects": Array<{ "name": string, "link": string, "description": string }>,
  "certifications": Array<{ "name": string, "issuer": string, "date": string }>
}

Rules:
- Every key is required. Use "" for missing scalar fields and [] for missing list fields.
- "headline" is a short professional tagline (e.g. "Senior Backend Engineer", "UX Designer", "Marketing Manager"). Infer it from job titles if not stated.
- "portfolio" is a non-GitHub portfolio URL (Behance, Dribbble, Notion, Medium, personal site etc.) that showcases work. Use "" if not present. Distinct from "website" (general personal site) and "github" (code repo profile).
- "summary" is the candidate's profile/summary paragraph. Leave "" if absent.
- For language level, infer the best guess from context. If unclear, use "Fluent".
- For experience endDate, use "Present" if the role is current.
- Preserve dates as written ("Jan 2022", "2020", etc.) — do not reformat.
- For description fields, preserve the actual bullet points or paragraphs from the CV (newlines OK).
- Do not invent data. If something is not in the CV, use the empty value.

=== CV TEXT ===
${cvText}`;
}

function extractJsonObject(raw) {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("model did not return a JSON object");
  }
  return JSON.parse(s.slice(first, last + 1));
}

app.post("/api/import-cv", async (req, res) => {
  const { text } = req.body ?? {};

  if (!text || typeof text !== "string" || text.trim().length < 50) {
    return res.status(400).json({ error: "text must be at least 50 characters of CV content" });
  }

  try {
    const raw = await runQuery(buildExtractionPrompt(text));
    const profile = extractJsonObject(raw);
    res.json({ profile });
  } catch (err) {
    console.error("[import-cv] error:", err);
    res.status(500).json({ error: err?.message ?? "extraction failed" });
  }
});

app.post("/api/refine", async (req, res) => {
  const { profile, jobDescription, target, previousBundle, instruction } = req.body ?? {};

  if (!profile || typeof profile !== "object") {
    return res.status(400).json({ error: "profile is required" });
  }
  const targetError = validateTarget({ jobDescription, target }, 0);
  if (targetError) {
    return res.status(400).json({ error: targetError });
  }
  if (!previousBundle || typeof previousBundle !== "object" || !previousBundle.cv) {
    return res.status(400).json({ error: "previousBundle is required" });
  }
  if (!instruction || typeof instruction !== "string" || instruction.trim().length < 3) {
    return res.status(400).json({ error: "instruction must be at least 3 characters" });
  }

  try {
    const raw = await runQuery(buildRefinePrompt({ profile, jobDescription, target, previousBundle, instruction }));
    const sections = parseSections(raw);
    res.json(sections);
  } catch (err) {
    console.error("[refine] error:", err);
    res.status(500).json({ error: err?.message ?? "refinement failed" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT ?? 8787;
  app.listen(PORT, () => {
    console.log(`jobify backend listening on http://localhost:${PORT}`);
  });
}

export default app;
