import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { chat, type ChatMessage } from "../lib/api";
import type { Profile } from "../types";

const CHAT_STORE_KEY = "jobify.chat.v1";

const SUGGESTIONS = [
  "Tell me about yourself — draft my 60-second answer",
  "Give me 3 STAR stories from my experience",
  "Write a LinkedIn About section in my voice",
  "What roles am I strongest for right now?",
  "What gaps would an interviewer poke at?",
  "Summarise my journey from high school to now",
];

type ChatStore = Record<string, ChatMessage[]>;

function loadChats(): ChatStore {
  try {
    const raw = localStorage.getItem(CHAT_STORE_KEY);
    return raw ? (JSON.parse(raw) as ChatStore) : {};
  } catch {
    return {};
  }
}

function saveChat(profileId: string, messages: ChatMessage[]) {
  try {
    const all = loadChats();
    if (messages.length) all[profileId] = messages;
    else delete all[profileId];
    localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(all));
  } catch {
    /* storage full / unavailable — chat still works in-memory */
  }
}

export function ChatView({ profile }: { profile: Profile }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChats()[profile.id] ?? []);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Parent remounts this component with key={profile.id}, so history is per-profile.
  useEffect(() => {
    saveChat(profile.id, messages);
  }, [profile.id, messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const dossierCount = (profile.background?.length ?? 0) + (profile.aboutMe?.trim() ? 1 : 0);
  const contextStats = [
    `${profile.experience.length} ROLES`,
    `${profile.projects.length} PROJECTS`,
    `${profile.education.length} EDU`,
    `${dossierCount} DOSSIER`,
  ];

  async function send(text: string, base: ChatMessage[] = messages) {
    const value = text.trim();
    if (!value || sending) return;
    const next: ChatMessage[] = [...base, { role: "user", text: value }];
    setMessages(next);
    setDraft("");
    setSending(true);
    setError(null);
    try {
      const reply = await chat(profile, next);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CHAT_LINK_FAILURE");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function retry() {
    // Last message is the unanswered user turn — resend it.
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") return;
    void send(last.text, messages.slice(0, -1));
  }

  function clear() {
    if (messages.length && !confirm("PURGE CHAT HISTORY FOR THIS PROFILE?")) return;
    setMessages([]);
    setError(null);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 border-4 border-black bg-[#eab308] p-5 brutal-shadow flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black uppercase leading-none">CAREER_TERMINAL</h2>
          <p className="text-xs font-mono font-bold uppercase mt-2">
            AI LINKED TO FULL PROFILE + PERSONAL DOSSIER
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {contextStats.map((s) => (
            <span key={s} className="text-xs font-mono font-bold bg-black text-white px-2 py-1 border-2 border-black">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="border-4 border-black bg-white brutal-shadow flex flex-col h-[68vh] min-h-[420px]">
        <div className="flex items-center justify-between border-b-4 border-black bg-black text-white px-4 py-2">
          <span className="font-mono text-xs font-bold uppercase">
            SESSION :: {(profile.fullName || "ANON").toUpperCase().replace(/\s+/g, "_")}
          </span>
          <button
            id="chat-clear"
            onClick={clear}
            disabled={!messages.length || sending}
            className="font-mono text-xs font-bold border-2 border-white px-2 py-0.5 hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-black disabled:hover:text-white"
          >
            [ PURGE_LOG ]
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-[repeating-linear-gradient(0deg,#fff,#fff_23px,#f4f4f5_24px)]">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6">
              <p className="font-mono font-bold uppercase text-sm bg-white border-2 border-black px-3 py-2 brutal-shadow-sm">
                &gt; ASK ANYTHING ABOUT YOUR CAREER_
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    id={`chat-suggestion-${i}`}
                    onClick={() => void send(s)}
                    className="text-left text-xs font-mono font-bold uppercase border-2 border-black bg-white px-3 py-2 brutal-shadow-sm hover:bg-[#eab308] transition-colors"
                  >
                    ▸ {s}
                  </button>
                ))}
              </div>
              {dossierCount === 0 && (
                <p className="text-xs font-mono font-bold uppercase border-l-4 border-[#eab308] pl-3 max-w-md text-left">
                  TIP: FILL IN PERSONAL_DOSSIER ON THE PROFILE TAB TO GIVE THE CHAT YOUR HIGH SCHOOL, HOBBIES AND BACKSTORY.
                </p>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {sending && (
            <div className="flex">
              <div className="border-2 border-black bg-white px-4 py-3 brutal-shadow-sm font-mono text-sm font-bold flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-black animate-ping" />
                COMPUTING_RESPONSE...
              </div>
            </div>
          )}

          {error && !sending && (
            <div className="border-4 border-black bg-red-600 text-white px-4 py-3 font-mono font-bold uppercase text-sm flex items-center justify-between gap-4">
              <span>[!] {error}</span>
              <button onClick={retry} className="border-2 border-white px-2 py-0.5 hover:bg-white hover:text-black shrink-0">
                RETRY
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="border-t-4 border-black p-3 flex gap-3 items-end bg-white"
        >
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={2}
            className="brutal-input resize-none flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            placeholder="[ ENTER QUERY — SHIFT+ENTER FOR NEW LINE ]"
          />
          <button
            id="chat-send"
            type="submit"
            disabled={!draft.trim() || sending}
            className="brutal-btn-primary px-6 !py-3"
          >
            SEND ▶
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] border-2 border-black bg-black text-white px-4 py-3 font-mono text-sm whitespace-pre-wrap brutal-shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <div className="group relative max-w-[90%] border-2 border-black bg-white px-5 py-4 brutal-shadow-sm">
        <span className="absolute -top-3 left-3 bg-[#eab308] border-2 border-black px-1.5 text-[10px] font-mono font-bold">
          AI
        </span>
        <button
          onClick={copy}
          className="absolute -top-3 right-3 bg-white border-2 border-black px-1.5 text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 hover:bg-black hover:text-white transition-opacity"
        >
          {copied ? "COPIED" : "COPY"}
        </button>
        <div className="chat-doc">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
