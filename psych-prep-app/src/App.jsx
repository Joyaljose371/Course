import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen, Brain, Users, FlaskConical, ClipboardList, Layers,
  Bookmark, BookmarkCheck, Check, X, ChevronRight, ChevronLeft, ChevronDown,
  Search, RotateCcw, Award, BarChart2, GraduationCap, Home,
  CheckCircle2, XCircle, Sparkles, Shield, Plus, Trash2, Pencil, Lock,
  LogOut, Save, User, Mail, UploadCloud, Download, Upload,
} from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useProfile, useIsAdmin } from "./hooks/useProfile";
import { useContentDB } from "./hooks/useContentDB";

/* ============================== THEME ============================== */
const T = {
  bgDeep: "#1B2A41", bgPanel: "#223353", bgPanelLight: "#2C4468",
  paper: "#F1E9D8", paperDark: "#E4D9BE", ink: "#1B2A41", inkSoft: "#3C4E6B",
  brass: "#C9A227", brassLight: "#E3C25E", sage: "#7FA598", rust: "#B5533C",
  textLight: "#EDE7D6", textMuted: "#93A6BE",
};
const FONT_DISPLAY = "'Lora', serif";
const FONT_BODY = "'Inter', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const ICONS = { Brain, Users, Sparkles, ClipboardList, BarChart2, Layers, FlaskConical, BookOpen };
const ICON_KEYS = Object.keys(ICONS);
const genId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; }
    .psy-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .psy-scroll::-webkit-scrollbar-thumb { background: ${T.brass}55; border-radius: 4px; }
    .psy-scroll::-webkit-scrollbar-track { background: transparent; }
    .card-flip-inner { transition: transform 0.5s; transform-style: preserve-3d; }
    .card-flip.flipped .card-flip-inner { transform: rotateY(180deg); }
    .card-face { backface-visibility: hidden; }
    .card-back { transform: rotateY(180deg); }
    .psy-focus:focus-visible { outline: 2px solid ${T.brass}; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .card-flip-inner { transition: none !important; } }
  `}</style>
);

/* ============================== SHARED UI BITS ============================== */
const CatalogStamp = ({ children, tint }) => (
  <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: tint || T.brass, border: `1px solid ${tint || T.brass}66`, borderRadius: 3, padding: "2px 6px", whiteSpace: "nowrap" }}>{children}</span>
);
const PunchHole = () => (
  <div style={{ position: "absolute", top: 10, left: 10, width: 10, height: 10, borderRadius: "50%", background: T.bgDeep, boxShadow: `inset 0 0 0 1px ${T.ink}22` }} />
);
const IndexCard = ({ children, style, onClick, tint }) => (
  <div onClick={onClick} className="psy-focus" tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    style={{ position: "relative", background: T.paper, color: T.ink, borderRadius: 6, padding: "18px 16px 16px 28px", boxShadow: "0 3px 0 rgba(0,0,0,0.15), 0 6px 14px rgba(0,0,0,0.25)", border: `1px solid ${T.paperDark}`, cursor: onClick ? "pointer" : "default", transition: "transform 0.15s ease, box-shadow 0.15s ease", ...style }}
    onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 5px 0 rgba(0,0,0,0.15), 0 10px 18px rgba(0,0,0,0.3)"; } }}
    onMouseLeave={(e) => { if (onClick) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 3px 0 rgba(0,0,0,0.15), 0 6px 14px rgba(0,0,0,0.25)"; } }}>
    <PunchHole />
    <div style={{ position: "absolute", top: 10, right: 10, width: 3, height: "calc(100% - 20px)", background: `${tint || T.brass}33` }} />
    {children}
  </div>
);
const SectionHeading = ({ eyebrow, title, right }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
    <div>
      {eyebrow && <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: T.brass, marginBottom: 4 }}>{eyebrow}</div>}
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 26, color: T.textLight, margin: 0 }}>{title}</h2>
    </div>
    {right}
  </div>
);
const EmptyState = ({ text }) => (
  <div style={{ fontFamily: FONT_BODY, color: T.textMuted, textAlign: "center", padding: "40px 20px", border: `1px dashed ${T.textMuted}44`, borderRadius: 8 }}>{text}</div>
);
const FilterChip = ({ label, active, onClick, tint }) => (
  <button onClick={onClick} className="psy-focus" style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 16, cursor: "pointer", border: `1px solid ${active ? (tint || T.brass) : T.bgPanelLight}`, background: active ? `${tint || T.brass}22` : "transparent", color: active ? (tint || T.brassLight) : T.textMuted }}>{label}</button>
);
const PrimaryButton = ({ children, onClick, type = "button", style, disabled }) => (
  <button type={type} onClick={onClick} disabled={disabled} className="psy-focus" style={{ display: "flex", alignItems: "center", gap: 6, background: disabled ? `${T.ink}88` : T.ink, color: T.textLight, border: "none", borderRadius: 20, padding: "9px 16px", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13.5, cursor: disabled ? "not-allowed" : "pointer", ...style }}>{children}</button>
);
const GhostButton = ({ children, onClick, danger, style, type = "button" }) => (
  <button type={type} onClick={onClick} className="psy-focus" style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${danger ? T.rust : T.bgPanelLight}`, color: danger ? T.rust : T.textLight, borderRadius: 16, padding: "6px 11px", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 12, cursor: "pointer", ...style }}>{children}</button>
);
const Field = ({ label, children }) => (
  <label style={{ display: "block", marginBottom: 12 }}>
    <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: T.textLight, marginBottom: 5 }}>{label}</div>
    {children}
  </label>
);
const inputStyle = { width: "100%", background: T.bgDeep, border: `1px solid ${T.bgPanelLight}`, borderRadius: 6, padding: "8px 10px", color: T.textLight, fontFamily: FONT_BODY, fontSize: 13.5 };
const TextInput = (props) => <input className="psy-focus" {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
const TextArea = (props) => <textarea className="psy-focus" {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 70, ...(props.style || {}) }} />;
const Select = (props) => <select className="psy-focus" {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;

/* ============================== AUTH SCREEN ============================== */
function AuthScreen({ signUp, logIn }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) { setError("Enter both an email and password."); return; }
    setBusy(true);
    try {
      if (mode === "signup") await signUp(email.trim(), password);
      else await logIn(email.trim(), password);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: FONT_BODY }}>
      <FontLoader />
      <div style={{ background: T.paper, borderRadius: 12, padding: 30, maxWidth: 380, width: "100%", color: T.ink, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <GraduationCap size={20} color={T.brass} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.brass }}>Psych Catalog</span>
        </div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, margin: "6px 0 20px" }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <Field label="Email">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ background: "#fff", color: T.ink, border: `1px solid ${T.ink}33` }} onKeyDown={(e) => e.key === "Enter" && submit()} />
        </Field>
        <Field label="Password">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ background: "#fff", color: T.ink, border: `1px solid ${T.ink}33` }} onKeyDown={(e) => e.key === "Enter" && submit()} />
        </Field>
        {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.rust, marginBottom: 12 }}>{error}</div>}
        <PrimaryButton onClick={submit} disabled={busy} style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}>
          {busy ? "Please wait…" : mode === "signup" ? "Sign up" : "Log in"} <ChevronRight size={15} />
        </PrimaryButton>
        <div style={{ textAlign: "center", fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft }}>
          {mode === "signup" ? "Already have an account? " : "New here? "}
          <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }} className="psy-focus" style={{ background: "none", border: "none", color: T.brass, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: FONT_BODY, fontSize: 12.5 }}>
            {mode === "signup" ? "Log in" : "Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

function friendlyAuthError(e) {
  const code = e?.code || "";
  if (code.includes("email-already-in-use")) return "That email is already registered — try logging in instead.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Incorrect email or password.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "That doesn't look like a valid email address.";
  return "Something went wrong. Please try again.";
}

/* ============================== NAV ============================== */
function Nav({ active, setActive, isAdmin }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "browse", label: "Browse", icon: Layers },
    { id: "theories", label: "Theories & Persons", icon: GraduationCap },
    { id: "research", label: "Research Methodology", icon: FlaskConical },
    { id: "quiz", label: "Quiz", icon: ClipboardList },
    { id: "flashcards", label: "Flashcards", icon: BookOpen },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Shield }] : []),
  ];
  return (
    <nav style={{ display: "flex", gap: 4, overflowX: "auto", padding: "10px 20px", background: T.bgPanel, borderBottom: `1px solid ${T.bgPanelLight}` }} className="psy-scroll">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => setActive(item.id)} className="psy-focus" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", color: isActive ? T.bgDeep : (item.id === "admin" ? T.brassLight : T.textLight), background: isActive ? T.brass : "transparent" }}>
            <Icon size={15} />{item.label}
          </button>
        );
      })}
    </nav>
  );
}

/* ============================== ONBOARDING ============================== */
function Onboarding({ categories, initialName, onComplete }) {
  const [name, setName] = useState(initialName || "");
  const [focus, setFocus] = useState([]);
  const toggleFocus = (id) => setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  return (
    <div style={{ position: "fixed", inset: 0, background: `${T.bgDeep}EE`, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.paper, borderRadius: 12, padding: 30, maxWidth: 460, width: "100%", color: T.ink, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.brass }}>Welcome</div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, margin: "6px 0 18px" }}>Set up your catalog card</h2>
        <Field label="What should we call you?">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ background: "#fff", color: T.ink, border: `1px solid ${T.ink}33` }} />
        </Field>
        <Field label="Pick your focus areas (you can change these anytime)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => (
              <button key={c.id} onClick={() => toggleFocus(c.id)} className="psy-focus" style={{ padding: "6px 12px", borderRadius: 16, border: `1px solid ${focus.includes(c.id) ? c.tint : `${T.ink}33`}`, background: focus.includes(c.id) ? `${c.tint}22` : "transparent", color: T.ink, fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{c.name}</button>
            ))}
            {categories.length === 0 && <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft }}>No categories yet — an admin needs to add some (or import starter content).</span>}
          </div>
        </Field>
        <PrimaryButton onClick={() => onComplete(name.trim() || "Scholar", focus)} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>Enter the catalog <ChevronRight size={15} /></PrimaryButton>
      </div>
    </div>
  );
}

/* ============================== DASHBOARD ============================== */
function Dashboard({ profile, dbData, setActive, setBrowseFilter }) {
  const totalTopics = dbData.topics.length;
  const readCount = profile.readTopics.length;
  const pct = totalTopics ? Math.round((readCount / totalTopics) * 100) : 0;
  const quizzesTaken = profile.quizHistory.length;
  const avgScore = quizzesTaken ? Math.round((profile.quizHistory.reduce((s, q) => s + q.score / q.total, 0) / quizzesTaken) * 100) : null;
  const knownCards = Object.values(profile.flashcardStatus).filter((s) => s === "known").length;
  const focusSet = new Set(profile.focusCategories);
  const orderedCats = [...dbData.categories].sort((a, b) => (focusSet.has(b.id) ? 1 : 0) - (focusSet.has(a.id) ? 1 : 0));
  const recommended = dbData.topics.filter((t) => focusSet.has(t.categoryId) && !profile.readTopics.includes(t.id)).slice(0, 4);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: T.brass, marginBottom: 6 }}>UGC NET · SET · JRF — Psychology</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 34, color: T.textLight, margin: 0, lineHeight: 1.15 }}>Welcome back, {profile.name}</h1>
        <p style={{ fontFamily: FONT_BODY, color: T.textMuted, marginTop: 8, maxWidth: 560, lineHeight: 1.6 }}>A working catalog of theories, topics, and methods — organised the way an examiner thinks, not the way a textbook is bound.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        {[
          { label: "Topics reviewed", value: `${readCount} / ${totalTopics}`, sub: `${pct}% of syllabus`, icon: Layers },
          { label: "Quizzes taken", value: quizzesTaken, sub: avgScore !== null ? `avg ${avgScore}% score` : "no attempts yet", icon: ClipboardList },
          { label: "Cards mastered", value: `${knownCards} / ${dbData.flashcards.length}`, sub: "flashcard deck", icon: BookOpen },
          { label: "Bookmarked", value: profile.bookmarks.length, sub: "for revision", icon: Bookmark },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, padding: 16 }}>
              <Icon size={17} color={T.brass} />
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: T.textLight, marginTop: 10 }}>{stat.value}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.textMuted, marginTop: 2 }}>{stat.label} · {stat.sub}</div>
            </div>
          );
        })}
      </div>
      {recommended.length > 0 && (
        <>
          <SectionHeading eyebrow="Picked For You" title="Recommended next" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 32 }}>
            {recommended.map((topic) => {
              const cat = dbData.categories.find((c) => c.id === topic.categoryId);
              return (
                <IndexCard key={topic.id} tint={cat?.tint} onClick={() => { setBrowseFilter(topic.categoryId); setActive("browse"); }}>
                  <CatalogStamp tint={cat?.tint}>{cat?.name}</CatalogStamp>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginTop: 10 }}>{topic.name}</div>
                </IndexCard>
              );
            })}
          </div>
        </>
      )}
      <SectionHeading eyebrow="Card Catalog" title="Browse by category" />
      {dbData.categories.length === 0 ? <EmptyState text="No categories yet. An admin can add some, or import starter content from the Admin tab." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {orderedCats.map((cat) => {
            const Icon = ICONS[cat.icon] || Layers;
            const count = dbData.topics.filter((t) => t.categoryId === cat.id).length;
            const readInCat = dbData.topics.filter((t) => t.categoryId === cat.id && profile.readTopics.includes(t.id)).length;
            const isFocus = focusSet.has(cat.id);
            return (
              <IndexCard key={cat.id} tint={cat.tint} onClick={() => { setBrowseFilter(cat.id); setActive("browse"); }} style={isFocus ? { boxShadow: `0 0 0 2px ${cat.tint}, 0 6px 14px rgba(0,0,0,0.25)` } : undefined}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Icon size={18} color={cat.tint} />
                  <CatalogStamp tint={cat.tint}>{readInCat}/{count} read</CatalogStamp>
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 17, marginTop: 10 }}>{cat.name}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>{count} topics catalogued{isFocus ? " · your focus" : ""}</div>
              </IndexCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================== BROWSE ============================== */
function Browse({ dbData, profile, toggleBookmark, markRead, filterCat, setFilterCat }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = useMemo(() => dbData.topics.filter((t) => {
    const matchesCat = filterCat === "all" || t.categoryId === filterCat;
    const matchesQuery = query.trim() === "" || t.name.toLowerCase().includes(query.toLowerCase());
    return matchesCat && matchesQuery;
  }).sort((a, b) => a.year.localeCompare(b.year)), [dbData.topics, filterCat, query]);
  const catOf = (id) => dbData.categories.find((c) => c.id === id) || { name: id, tint: T.brass };

  return (
    <div>
      <SectionHeading eyebrow="Drawer Index" title="Browse topics" right={
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, padding: "7px 10px" }}>
          <Search size={14} color={T.textMuted} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topics..." className="psy-focus" style={{ background: "transparent", border: "none", outline: "none", color: T.textLight, fontFamily: FONT_BODY, fontSize: 13, width: 160 }} />
        </div>} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        <FilterChip label="All" active={filterCat === "all"} onClick={() => setFilterCat("all")} />
        {dbData.categories.map((c) => <FilterChip key={c.id} label={c.name} tint={c.tint} active={filterCat === c.id} onClick={() => setFilterCat(c.id)} />)}
      </div>
      {selected ? (
        <TopicDetail topic={selected} cat={catOf(selected.categoryId)} onBack={() => setSelected(null)} profile={profile} toggleBookmark={toggleBookmark} />
      ) : filtered.length === 0 ? <EmptyState text="No topics match this search. Try a different keyword or category." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {filtered.map((topic) => {
            const cat = catOf(topic.categoryId);
            const isRead = profile.readTopics.includes(topic.id);
            const isBookmarked = profile.bookmarks.includes(topic.id);
            return (
              <IndexCard key={topic.id} tint={cat.tint} onClick={() => { setSelected(topic); markRead(topic.id); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <CatalogStamp tint={cat.tint}>{cat.name}</CatalogStamp>
                  <button onClick={(e) => { e.stopPropagation(); toggleBookmark(topic.id); }} className="psy-focus" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: isBookmarked ? T.brass : T.inkSoft }} aria-label="bookmark">
                    {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  </button>
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16.5, marginTop: 10, lineHeight: 1.3 }}>{topic.name}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.inkSoft, marginTop: 6 }}>landmark year — {topic.year}</div>
                {isRead && <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, fontFamily: FONT_BODY, fontSize: 11.5, color: T.sage }}><CheckCircle2 size={13} /> reviewed</div>}
              </IndexCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopicDetail({ topic, cat, onBack, profile, toggleBookmark }) {
  const isBookmarked = profile.bookmarks.includes(topic.id);
  return (
    <div>
      <button onClick={onBack} className="psy-focus" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.brassLight, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}><ChevronLeft size={15} /> Back to drawer</button>
      <div style={{ background: T.paper, borderRadius: 10, padding: "26px 26px 24px", color: T.ink, boxShadow: "0 8px 24px rgba(0,0,0,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <CatalogStamp tint={cat.tint}>{cat.name}</CatalogStamp>
          <button onClick={() => toggleBookmark(topic.id)} className="psy-focus" style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${T.ink}33`, borderRadius: 16, padding: "5px 11px", cursor: "pointer", color: isBookmarked ? T.rust : T.ink, fontFamily: FONT_BODY, fontSize: 12 }}>
            {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {isBookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 26, margin: "14px 0 4px" }}>{topic.name}</h2>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkSoft, marginBottom: 16 }}>landmark year — {topic.year}</div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14.5, lineHeight: 1.7, margin: "0 0 18px" }}>{topic.summary}</p>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: cat.tint, marginBottom: 8 }}>Key points</div>
        <ul style={{ margin: 0, paddingLeft: 20, fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.9 }}>{topic.keyPoints.map((kp, i) => <li key={i}>{kp}</li>)}</ul>
      </div>
    </div>
  );
}

/* ============================== THEORIES & PERSONS ============================== */
function Theories({ dbData }) {
  const [filterCat, setFilterCat] = useState("all");
  const [flipped, setFlipped] = useState({});
  const catOf = (id) => dbData.categories.find((c) => c.id === id) || { name: id, tint: T.brass };
  const list = useMemo(() => dbData.persons.filter((p) => filterCat === "all" || p.categoryId === filterCat), [dbData.persons, filterCat]);
  const toggleFlip = (id) => setFlipped((f) => ({ ...f, [id]: !f[id] }));
  return (
    <div>
      <SectionHeading eyebrow="Biographical Index" title="Theories & Persons" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        <FilterChip label="All" active={filterCat === "all"} onClick={() => setFilterCat("all")} />
        {dbData.categories.map((c) => <FilterChip key={c.id} label={c.name} tint={c.tint} active={filterCat === c.id} onClick={() => setFilterCat(c.id)} />)}
      </div>
      <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.textMuted, marginBottom: 18 }}>Tap a card to flip it and reveal the key idea.</p>
      {list.length === 0 ? <EmptyState text="No entries in this category yet." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
          {list.map((p) => {
            const cat = catOf(p.categoryId);
            const isFlipped = !!flipped[p.id];
            return (
              <div key={p.id} className={`card-flip ${isFlipped ? "flipped" : ""}`} style={{ perspective: 1000, height: 168, cursor: "pointer" }} onClick={() => toggleFlip(p.id)}>
                <div className="card-flip-inner" style={{ position: "relative", width: "100%", height: "100%" }}>
                  <div className="card-face" style={{ position: "absolute", inset: 0 }}>
                    <IndexCard tint={cat.tint} style={{ height: "100%" }}>
                      <CatalogStamp tint={cat.tint}>{p.field}</CatalogStamp>
                      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, marginTop: 12 }}>{p.name}</div>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>{p.years}</div>
                      <div style={{ position: "absolute", bottom: 12, right: 16, fontFamily: FONT_BODY, fontSize: 10.5, color: T.inkSoft }}>flip →</div>
                    </IndexCard>
                  </div>
                  <div className="card-face card-back" style={{ position: "absolute", inset: 0 }}>
                    <IndexCard tint={cat.tint} style={{ height: "100%" }}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: cat.tint, marginBottom: 8 }}>Key idea</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.6 }}>{p.keyIdea}</div>
                    </IndexCard>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================== RESEARCH METHODOLOGY ============================== */
function ResearchMethodology({ dbData }) {
  const [openId, setOpenId] = useState(dbData.research[0]?.id);
  return (
    <div>
      <SectionHeading eyebrow="Methods Ledger" title="Research Methodology" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {dbData.research.map((sec, i) => {
          const open = openId === sec.id;
          return (
            <div key={sec.id} style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, overflow: "hidden" }}>
              <button onClick={() => setOpenId(open ? null : sec.id)} className="psy-focus" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.brass }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16.5, color: T.textLight }}>{sec.title}</span>
                </div>
                <ChevronDown size={17} color={T.textMuted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {open && (
                <div style={{ padding: "0 16px 18px 46px" }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.7, color: T.textLight, margin: "0 0 12px" }}>{sec.body}</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT_BODY, fontSize: 13.5, lineHeight: 1.85, color: T.textMuted }}>{sec.points.map((pt, j) => <li key={j}>{pt}</li>)}</ul>
                </div>
              )}
            </div>
          );
        })}
        {dbData.research.length === 0 && <EmptyState text="No research methodology sections yet." />}
      </div>
    </div>
  );
}

/* ============================== QUIZ ============================== */
function Quiz({ dbData, addQuizResult }) {
  const [phase, setPhase] = useState("setup");
  const [category, setCategory] = useState("all");
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const catOf = (id) => dbData.categories.find((c) => c.id === id) || { name: id, tint: T.brass };

  const startQuiz = () => {
    const pool = dbData.quiz.filter((q) => category === "all" || q.categoryId === category);
    setQuestions([...pool].sort(() => Math.random() - 0.5)); setIndex(0); setAnswers([]); setSelectedOpt(null); setPhase("active");
  };
  const selectOption = (i) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(i);
    setAnswers((a) => [...a, { qid: questions[index].id, correct: i === questions[index].correct }]);
  };
  const next = () => {
    if (index + 1 < questions.length) { setIndex(index + 1); setSelectedOpt(null); }
    else {
      const score = answers.filter((a) => a.correct).length;
      addQuizResult({ date: new Date().toISOString(), categoryId: category, score, total: questions.length });
      setPhase("result");
    }
  };
  const score = answers.filter((a) => a.correct).length;

  if (phase === "setup") return (
    <div>
      <SectionHeading eyebrow="Practice Drawer" title="Quiz mode" />
      <div style={{ background: T.paper, borderRadius: 10, padding: 24, maxWidth: 460 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.ink, marginBottom: 10, fontWeight: 600 }}>Choose a category</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          <FilterChip label="All categories" active={category === "all"} onClick={() => setCategory("all")} />
          {dbData.categories.map((c) => <FilterChip key={c.id} label={c.name} tint={c.tint} active={category === c.id} onClick={() => setCategory(c.id)} />)}
        </div>
        {dbData.quiz.filter((q) => category === "all" || q.categoryId === category).length === 0 ? <EmptyState text="No quiz questions in this category yet." /> : <PrimaryButton onClick={startQuiz}>Start quiz <ChevronRight size={15} /></PrimaryButton>}
      </div>
    </div>
  );

  if (phase === "result") {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div>
        <SectionHeading eyebrow="Practice Drawer" title="Results" />
        <div style={{ background: T.paper, borderRadius: 10, padding: 30, maxWidth: 460, textAlign: "center", color: T.ink }}>
          <Award size={30} color={T.brass} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 32 }}>{score} / {questions.length}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.inkSoft, marginTop: 4 }}>{pct}% correct</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22 }}><PrimaryButton onClick={() => setPhase("setup")}><RotateCcw size={14} /> New quiz</PrimaryButton></div>
        </div>
      </div>
    );
  }

  const q = questions[index];
  return (
    <div>
      <SectionHeading eyebrow="Practice Drawer" title="Quiz mode" right={<span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.textMuted }}>Question {index + 1} / {questions.length} · Score {score}</span>} />
      <div style={{ background: T.paper, borderRadius: 10, padding: 24, maxWidth: 560, color: T.ink }}>
        <CatalogStamp tint={catOf(q.categoryId).tint}>{catOf(q.categoryId).name}</CatalogStamp>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, margin: "14px 0 18px", lineHeight: 1.4 }}>{q.question}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {q.options.map((opt, i) => {
            const isSelected = selectedOpt === i, isCorrect = i === q.correct;
            let bg = "transparent", border = `${T.ink}33`, color = T.ink;
            if (selectedOpt !== null) {
              if (isCorrect) { bg = `${T.sage}33`; border = T.sage; }
              else if (isSelected) { bg = `${T.rust}22`; border = T.rust; }
            }
            return (
              <button key={i} onClick={() => selectOption(i)} className="psy-focus" style={{ textAlign: "left", padding: "10px 14px", borderRadius: 8, border: `1px solid ${border}`, background: bg, color, fontFamily: FONT_BODY, fontSize: 14, cursor: selectedOpt === null ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {opt}
                {selectedOpt !== null && isCorrect && <CheckCircle2 size={16} color={T.sage} />}
                {selectedOpt !== null && isSelected && !isCorrect && <XCircle size={16} color={T.rust} />}
              </button>
            );
          })}
        </div>
        {selectedOpt !== null && <div style={{ marginTop: 16, fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.6, color: T.inkSoft, borderTop: `1px solid ${T.ink}22`, paddingTop: 14 }}>{q.explanation}</div>}
        {selectedOpt !== null && <PrimaryButton onClick={next} style={{ marginTop: 18 }}>{index + 1 < questions.length ? "Next question" : "See results"} <ChevronRight size={14} /></PrimaryButton>}
      </div>
    </div>
  );
}

/* ============================== FLASHCARDS ============================== */
function Flashcards({ dbData, profile, setFlashcardStatus }) {
  const [category, setCategory] = useState("all");
  const [deck, setDeck] = useState(dbData.flashcards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const catOf = (id) => dbData.categories.find((c) => c.id === id) || { name: id, tint: T.brass };

  useEffect(() => {
    setDeck(dbData.flashcards.filter((c) => category === "all" || c.categoryId === category));
    setIndex(0); setFlipped(false);
  }, [category, dbData.flashcards]);

  const card = deck[index];
  const advance = (status) => {
    if (card) setFlashcardStatus(card.id, status);
    setFlipped(false);
    setIndex((i) => (i + 1 < deck.length ? i + 1 : 0));
  };
  const knownCount = deck.filter((c) => profile.flashcardStatus[c.id] === "known").length;

  return (
    <div>
      <SectionHeading eyebrow="Revision Drawer" title="Flashcards" right={deck.length > 0 && <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.textMuted }}>{knownCount}/{deck.length} known</span>} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        <FilterChip label="All" active={category === "all"} onClick={() => setCategory("all")} />
        {dbData.categories.map((c) => <FilterChip key={c.id} label={c.name} tint={c.tint} active={category === c.id} onClick={() => setCategory(c.id)} />)}
      </div>
      {!card ? <EmptyState text="No flashcards in this category." /> : (
        <div style={{ maxWidth: 480 }}>
          <div className={`card-flip ${flipped ? "flipped" : ""}`} style={{ perspective: 1200, height: 220, cursor: "pointer" }} onClick={() => setFlipped((f) => !f)}>
            <div className="card-flip-inner" style={{ position: "relative", width: "100%", height: "100%" }}>
              <div className="card-face" style={{ position: "absolute", inset: 0 }}>
                <IndexCard tint={catOf(card.categoryId).tint} style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <CatalogStamp tint={catOf(card.categoryId).tint}>{catOf(card.categoryId).name}</CatalogStamp>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, marginTop: 14, lineHeight: 1.35 }}>{card.front}</div>
                  <div style={{ position: "absolute", bottom: 14, right: 18, fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft }}>tap to reveal</div>
                </IndexCard>
              </div>
              <div className="card-face card-back" style={{ position: "absolute", inset: 0 }}>
                <IndexCard tint={catOf(card.categoryId).tint} style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: catOf(card.categoryId).tint, marginBottom: 8 }}>Answer</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.65 }}>{card.back}</div>
                </IndexCard>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => advance("review")} className="psy-focus" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: `1px solid ${T.rust}`, color: T.rust, borderRadius: 20, padding: "10px 14px", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}><X size={15} /> Still learning</button>
            <button onClick={() => advance("known")} className="psy-focus" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: T.sage, border: "none", color: T.bgDeep, borderRadius: 20, padding: "10px 14px", fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}><Check size={15} /> Know it</button>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: T.textMuted, marginTop: 12, textAlign: "center" }}>card {index + 1} of {deck.length}</div>
        </div>
      )}
    </div>
  );
}

/* ============================== ADMIN ============================== */
const ADMIN_TABS = [
  { id: "categories", label: "Categories" }, { id: "topics", label: "Topics" },
  { id: "persons", label: "Theories & Persons" }, { id: "quiz", label: "Quiz Questions" },
  { id: "flashcards", label: "Flashcards" }, { id: "research", label: "Research Sections" },
  { id: "importExport", label: "Import / Export" },
];

function AdminPanel({ dbData, addItem, updateItem, deleteItem, deleteCategory, seedStarterContent, exportContent, importContent }) {
  const [tab, setTab] = useState("categories");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  const runSeed = async () => {
    setSeeding(true); setSeedMsg("");
    try { await seedStarterContent(); setSeedMsg("Starter content imported."); }
    catch (e) { setSeedMsg(e.message || "Import failed."); }
    finally { setSeeding(false); }
  };

  return (
    <div>
      <SectionHeading eyebrow="Control Room" title="Admin — manage content" right={
        dbData.categories.length === 0 ? (
          <PrimaryButton onClick={runSeed} disabled={seeding}><UploadCloud size={14} /> {seeding ? "Importing…" : "Import starter content"}</PrimaryButton>
        ) : undefined
      } />
      {seedMsg && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.brassLight, marginBottom: 16 }}>{seedMsg}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {ADMIN_TABS.map((t) => <FilterChip key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
      </div>
      {tab === "categories" && <AdminCategories dbData={dbData} addItem={addItem} deleteCategory={deleteCategory} />}
      {tab === "topics" && <AdminTopics dbData={dbData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />}
      {tab === "persons" && <AdminPersons dbData={dbData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />}
      {tab === "quiz" && <AdminQuiz dbData={dbData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />}
      {tab === "flashcards" && <AdminFlashcards dbData={dbData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />}
      {tab === "research" && <AdminResearch dbData={dbData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />}
      {tab === "importExport" && <AdminImportExport dbData={dbData} exportContent={exportContent} importContent={importContent} />}
    </div>
  );
}

function AdminImportExport({ dbData, exportContent, importContent }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { tone: "ok" | "error", text }
  const fileInputRef = React.useRef(null);

  const totalItems = dbData.categories.length + dbData.topics.length + dbData.persons.length + dbData.quiz.length + dbData.flashcards.length + dbData.research.length;

  const handleDownload = () => {
    const data = exportContent();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `psych-catalog-content-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setBusy(true); setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const summary = await importContent(parsed);
      const parts = Object.entries(summary).map(([k, v]) => `${v} ${k}`).join(", ");
      setMessage({ tone: "ok", text: `Import complete — processed ${parts}.` });
    } catch (err) {
      setMessage({ tone: "error", text: err.message || "That file couldn't be imported. Make sure it's valid JSON in the expected format." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      <div style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 10, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Download size={17} color={T.brass} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, color: T.textLight }}>Download full content</div>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
          Exports every category, topic, theory/person, quiz question, flashcard, and research section — {totalItems} items total — as one JSON file. Useful as a backup, or to bulk-edit content in a text editor before re-importing.
        </p>
        <PrimaryButton onClick={handleDownload}><Download size={14} /> Download JSON</PrimaryButton>
      </div>

      <div style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 10, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Upload size={17} color={T.brass} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, color: T.textLight }}>Upload content file</div>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
          Upload a JSON file in the same format as the download above. Items with an existing ID are updated in place; items without one are added as new. <strong>Import never deletes anything</strong> — remove unwanted items manually in the relevant tab.
        </p>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChosen} style={{ display: "none" }} />
        <PrimaryButton onClick={() => fileInputRef.current?.click()} disabled={busy}><Upload size={14} /> {busy ? "Importing…" : "Choose file to upload"}</PrimaryButton>
        {message && (
          <div style={{ marginTop: 12, fontFamily: FONT_BODY, fontSize: 12.5, color: message.tone === "ok" ? T.sage : T.rust }}>{message.text}</div>
        )}
      </div>
    </div>
  );
}

function AdminShell({ formTitle, form, list }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, color: T.textLight, marginBottom: 14 }}>{formTitle}</div>
        {form}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{list}</div>
    </div>
  );
}

function useEditableForm(initial) {
  const [form, setForm] = useState(initial);
  const [editingId, setEditingId] = useState(null);
  const reset = () => { setForm(initial); setEditingId(null); };
  return { form, setForm, editingId, setEditingId, reset };
}

function AdminCategories({ dbData, addItem, deleteCategory }) {
  const [name, setName] = useState("");
  const [tint, setTint] = useState("#6C8CBF");
  const [icon, setIcon] = useState("Layers");
  const submit = (e) => { e.preventDefault(); if (!name.trim()) return; addItem("categories", { name: name.trim(), tint, icon }); setName(""); };
  return (
    <AdminShell formTitle="Add a category" form={
      <form onSubmit={submit}>
        <Field label="Category name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Neuropsychology" /></Field>
        <Field label="Accent color"><input type="color" value={tint} onChange={(e) => setTint(e.target.value)} style={{ width: "100%", height: 36, border: "none", background: "transparent", cursor: "pointer" }} /></Field>
        <Field label="Icon"><Select value={icon} onChange={(e) => setIcon(e.target.value)}>{ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
        <PrimaryButton type="submit" style={{ width: "100%", justifyContent: "center" }}><Plus size={14} /> Add category</PrimaryButton>
      </form>
    } list={dbData.categories.map((c) => {
      const Icon = ICONS[c.icon] || Layers;
      return (
        <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={16} color={c.tint} /><span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.textLight, fontWeight: 600 }}>{c.name}</span></div>
          <GhostButton danger onClick={() => { if (confirm(`Delete "${c.name}" and all its topics, theories, quiz questions, and flashcards?`)) deleteCategory(c.id); }}><Trash2 size={13} /> Delete</GhostButton>
        </div>
      );
    })} />
  );
}

function AdminTopics({ dbData, addItem, updateItem, deleteItem }) {
  const blank = { categoryId: dbData.categories[0]?.id || "", name: "", year: "", summary: "", keyPoints: "" };
  const { form, setForm, editingId, setEditingId, reset } = useEditableForm(blank);
  const startEdit = (t) => { setForm({ categoryId: t.categoryId, name: t.name, year: t.year, summary: t.summary, keyPoints: t.keyPoints.join("\n") }); setEditingId(t.id); };
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.categoryId) return;
    const payload = { categoryId: form.categoryId, name: form.name.trim(), year: form.year.trim(), summary: form.summary.trim(), keyPoints: form.keyPoints.split("\n").map((s) => s.trim()).filter(Boolean) };
    if (editingId) updateItem("topics", editingId, payload); else addItem("topics", payload);
    reset();
  };
  return (
    <AdminShell formTitle={editingId ? "Edit topic" : "Add a topic / sub-category"} form={
      <form onSubmit={submit}>
        <Field label="Category"><Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{dbData.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Topic name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Emotion Regulation" /></Field>
        <Field label="Landmark year"><TextInput value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 1998" /></Field>
        <Field label="Summary"><TextArea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="2-3 sentence overview" /></Field>
        <Field label="Key points (one per line)"><TextArea value={form.keyPoints} onChange={(e) => setForm({ ...form, keyPoints: e.target.value })} placeholder={"Point one\nPoint two"} /></Field>
        <div style={{ display: "flex", gap: 8 }}><PrimaryButton type="submit">{editingId ? <><Save size={14} /> Save</> : <><Plus size={14} /> Add topic</>}</PrimaryButton>{editingId && <GhostButton onClick={reset}>Cancel</GhostButton>}</div>
      </form>
    } list={dbData.topics.map((t) => {
      const cat = dbData.categories.find((c) => c.id === t.categoryId);
      return (
        <div key={t.id} style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div><CatalogStamp tint={cat?.tint}>{cat?.name || "—"}</CatalogStamp><div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: T.textLight, marginTop: 6 }}>{t.name}</div><div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.textMuted, marginTop: 2 }}>{t.year}</div></div>
            <div style={{ display: "flex", gap: 6 }}><GhostButton onClick={() => startEdit(t)}><Pencil size={13} /> Edit</GhostButton><GhostButton danger onClick={() => { if (confirm(`Delete topic "${t.name}"?`)) deleteItem("topics", t.id); }}><Trash2 size={13} /></GhostButton></div>
          </div>
        </div>
      );
    })} />
  );
}

function AdminPersons({ dbData, addItem, updateItem, deleteItem }) {
  const blank = { categoryId: dbData.categories[0]?.id || "", name: "", years: "", field: "", keyIdea: "" };
  const { form, setForm, editingId, setEditingId, reset } = useEditableForm(blank);
  const startEdit = (p) => { setForm({ categoryId: p.categoryId, name: p.name, years: p.years, field: p.field, keyIdea: p.keyIdea }); setEditingId(p.id); };
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = { ...form, name: form.name.trim() };
    if (editingId) updateItem("persons", editingId, payload); else addItem("persons", payload);
    reset();
  };
  return (
    <AdminShell formTitle={editingId ? "Edit entry" : "Add a theory / person"} form={
      <form onSubmit={submit}>
        <Field label="Category"><Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{dbData.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Elizabeth Loftus" /></Field>
        <Field label="Years active / lived"><TextInput value={form.years} onChange={(e) => setForm({ ...form, years: e.target.value })} placeholder="e.g. 1944–present" /></Field>
        <Field label="Field / school of thought"><TextInput value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="e.g. Eyewitness Memory Research" /></Field>
        <Field label="Key idea"><TextArea value={form.keyIdea} onChange={(e) => setForm({ ...form, keyIdea: e.target.value })} placeholder="What are they known for?" /></Field>
        <div style={{ display: "flex", gap: 8 }}><PrimaryButton type="submit">{editingId ? <><Save size={14} /> Save</> : <><Plus size={14} /> Add entry</>}</PrimaryButton>{editingId && <GhostButton onClick={reset}>Cancel</GhostButton>}</div>
      </form>
    } list={dbData.persons.map((p) => {
      const cat = dbData.categories.find((c) => c.id === p.categoryId);
      return (
        <div key={p.id} style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div><CatalogStamp tint={cat?.tint}>{p.field}</CatalogStamp><div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: T.textLight, marginTop: 6 }}>{p.name}</div><div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.textMuted, marginTop: 2 }}>{p.years}</div></div>
            <div style={{ display: "flex", gap: 6 }}><GhostButton onClick={() => startEdit(p)}><Pencil size={13} /> Edit</GhostButton><GhostButton danger onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteItem("persons", p.id); }}><Trash2 size={13} /></GhostButton></div>
          </div>
        </div>
      );
    })} />
  );
}

function AdminQuiz({ dbData, addItem, updateItem, deleteItem }) {
  const blank = { categoryId: dbData.categories[0]?.id || "", question: "", opt0: "", opt1: "", opt2: "", opt3: "", correct: "0", explanation: "" };
  const { form, setForm, editingId, setEditingId, reset } = useEditableForm(blank);
  const startEdit = (q) => { setForm({ categoryId: q.categoryId, question: q.question, opt0: q.options[0], opt1: q.options[1], opt2: q.options[2], opt3: q.options[3], correct: String(q.correct), explanation: q.explanation }); setEditingId(q.id); };
  const submit = (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.opt0.trim() || !form.opt1.trim()) return;
    const payload = { categoryId: form.categoryId, question: form.question.trim(), options: [form.opt0, form.opt1, form.opt2, form.opt3].map((s) => s.trim()), correct: parseInt(form.correct, 10), explanation: form.explanation.trim() };
    if (editingId) updateItem("quiz", editingId, payload); else addItem("quiz", payload);
    reset();
  };
  return (
    <AdminShell formTitle={editingId ? "Edit question" : "Add a quiz question"} form={
      <form onSubmit={submit}>
        <Field label="Category"><Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{dbData.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Question"><TextArea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Type the question" /></Field>
        <Field label="Option A"><TextInput value={form.opt0} onChange={(e) => setForm({ ...form, opt0: e.target.value })} /></Field>
        <Field label="Option B"><TextInput value={form.opt1} onChange={(e) => setForm({ ...form, opt1: e.target.value })} /></Field>
        <Field label="Option C"><TextInput value={form.opt2} onChange={(e) => setForm({ ...form, opt2: e.target.value })} /></Field>
        <Field label="Option D"><TextInput value={form.opt3} onChange={(e) => setForm({ ...form, opt3: e.target.value })} /></Field>
        <Field label="Correct answer"><Select value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })}><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></Select></Field>
        <Field label="Explanation"><TextArea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Why is this the right answer?" /></Field>
        <div style={{ display: "flex", gap: 8 }}><PrimaryButton type="submit">{editingId ? <><Save size={14} /> Save</> : <><Plus size={14} /> Add question</>}</PrimaryButton>{editingId && <GhostButton onClick={reset}>Cancel</GhostButton>}</div>
      </form>
    } list={dbData.quiz.map((q) => {
      const cat = dbData.categories.find((c) => c.id === q.categoryId);
      return (
        <div key={q.id} style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div><CatalogStamp tint={cat?.tint}>{cat?.name || "—"}</CatalogStamp><div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.textLight, marginTop: 6, lineHeight: 1.4 }}>{q.question}</div></div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}><GhostButton onClick={() => startEdit(q)}><Pencil size={13} /> Edit</GhostButton><GhostButton danger onClick={() => { if (confirm("Delete this question?")) deleteItem("quiz", q.id); }}><Trash2 size={13} /></GhostButton></div>
          </div>
        </div>
      );
    })} />
  );
}

function AdminFlashcards({ dbData, addItem, updateItem, deleteItem }) {
  const blank = { categoryId: dbData.categories[0]?.id || "", front: "", back: "" };
  const { form, setForm, editingId, setEditingId, reset } = useEditableForm(blank);
  const startEdit = (c) => { setForm({ categoryId: c.categoryId, front: c.front, back: c.back }); setEditingId(c.id); };
  const submit = (e) => {
    e.preventDefault();
    if (!form.front.trim() || !form.back.trim()) return;
    const payload = { categoryId: form.categoryId, front: form.front.trim(), back: form.back.trim() };
    if (editingId) updateItem("flashcards", editingId, payload); else addItem("flashcards", payload);
    reset();
  };
  return (
    <AdminShell formTitle={editingId ? "Edit flashcard" : "Add a flashcard"} form={
      <form onSubmit={submit}>
        <Field label="Category"><Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{dbData.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Front (term / prompt)"><TextInput value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })} placeholder="e.g. Zone of Proximal Development" /></Field>
        <Field label="Back (definition)"><TextArea value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })} placeholder="Definition or explanation" /></Field>
        <div style={{ display: "flex", gap: 8 }}><PrimaryButton type="submit">{editingId ? <><Save size={14} /> Save</> : <><Plus size={14} /> Add flashcard</>}</PrimaryButton>{editingId && <GhostButton onClick={reset}>Cancel</GhostButton>}</div>
      </form>
    } list={dbData.flashcards.map((c) => {
      const cat = dbData.categories.find((cc) => cc.id === c.categoryId);
      return (
        <div key={c.id} style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div><CatalogStamp tint={cat?.tint}>{cat?.name || "—"}</CatalogStamp><div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: T.textLight, marginTop: 6 }}>{c.front}</div></div>
            <div style={{ display: "flex", gap: 6 }}><GhostButton onClick={() => startEdit(c)}><Pencil size={13} /> Edit</GhostButton><GhostButton danger onClick={() => { if (confirm("Delete this flashcard?")) deleteItem("flashcards", c.id); }}><Trash2 size={13} /></GhostButton></div>
          </div>
        </div>
      );
    })} />
  );
}

function AdminResearch({ dbData, addItem, updateItem, deleteItem }) {
  const blank = { title: "", body: "", points: "", order: "" };
  const { form, setForm, editingId, setEditingId, reset } = useEditableForm(blank);
  const startEdit = (r) => { setForm({ title: r.title, body: r.body, points: r.points.join("\n"), order: typeof r.order === "number" ? String(r.order) : "" }); setEditingId(r.id); };
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = { title: form.title.trim(), body: form.body.trim(), points: form.points.split("\n").map((s) => s.trim()).filter(Boolean), order: form.order.trim() === "" ? null : parseInt(form.order, 10) };
    if (editingId) updateItem("research", editingId, payload); else addItem("research", payload);
    reset();
  };
  return (
    <AdminShell formTitle={editingId ? "Edit section" : "Add a research methodology section"} form={
      <form onSubmit={submit}>
        <Field label="Section title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Meta-Analysis" /></Field>
        <Field label="Order (controls position in the ledger — lower shows first)"><TextInput type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} placeholder="e.g. 7" /></Field>
        <Field label="Body text"><TextArea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Explain the concept" /></Field>
        <Field label="Bullet points (one per line)"><TextArea value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} placeholder={"Point one\nPoint two"} /></Field>
        <div style={{ display: "flex", gap: 8 }}><PrimaryButton type="submit">{editingId ? <><Save size={14} /> Save</> : <><Plus size={14} /> Add section</>}</PrimaryButton>{editingId && <GhostButton onClick={reset}>Cancel</GhostButton>}</div>
      </form>
    } list={dbData.research.map((r) => (
      <div key={r.id} style={{ background: T.bgPanel, border: `1px solid ${T.bgPanelLight}`, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.brass, minWidth: 18 }}>{typeof r.order === "number" ? r.order : "—"}</span>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: T.textLight }}>{r.title}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}><GhostButton onClick={() => startEdit(r)}><Pencil size={13} /> Edit</GhostButton><GhostButton danger onClick={() => { if (confirm(`Delete "${r.title}"?`)) deleteItem("research", r.id); }}><Trash2 size={13} /></GhostButton></div>
        </div>
      </div>
    ))} />
  );
}

/* ============================== APP ============================== */
export default function App() {
  const { user, authLoaded, signUp, logIn, logOut } = useAuth();
  const { profile, loaded: profileLoaded, profileError, update, toggleBookmark, markRead, addQuizResult, setFlashcardStatus } = useProfile(user?.uid);
  const { isAdmin, loaded: adminLoaded } = useIsAdmin(user?.uid);
  const { db: dbData, loaded: contentLoaded, addItem, updateItem, deleteItem, deleteCategory, seedStarterContent, exportContent, importContent } = useContentDB();

  const [active, setActive] = useState("dashboard");
  const [browseFilter, setBrowseFilter] = useState("all");
  const [showFocusEdit, setShowFocusEdit] = useState(false);

  if (!authLoaded) {
    return <div style={{ minHeight: "100vh", background: T.bgDeep, color: T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY }}>Loading…</div>;
  }

  if (!user) return <AuthScreen signUp={signUp} logIn={logIn} />;

  const loaded = profileLoaded && adminLoaded && contentLoaded;
  const needsOnboarding = loaded && !profile.name;

  const completeOnboarding = (name, focus) => update({ name, focusCategories: focus });

  return (
    <div style={{ minHeight: "100vh", background: T.bgDeep, fontFamily: FONT_BODY }}>
      <FontLoader />
      {loaded && needsOnboarding && <Onboarding categories={dbData.categories} onComplete={completeOnboarding} />}
      {loaded && showFocusEdit && !needsOnboarding && (
        <Onboarding categories={dbData.categories} initialName={profile.name} onComplete={(name, focus) => { completeOnboarding(name, focus); setShowFocusEdit(false); }} />
      )}

      <header style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: T.brass, display: "flex", alignItems: "center", justifyContent: "center" }}><GraduationCap size={18} color={T.bgDeep} /></div>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: T.textLight, lineHeight: 1 }}>Psych Catalog</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: T.textMuted, letterSpacing: "0.06em" }}>PG · NET · SET · JRF prep</div>
            </div>
          </div>
          {loaded && !needsOnboarding && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 13, color: T.textLight }}>
                <User size={14} color={T.textMuted} />
                {isAdmin ? <span>{profile.name} <span style={{ color: T.brassLight, fontFamily: FONT_MONO, fontSize: 10.5, marginLeft: 4 }}>· ADMIN</span></span> : <span>Scholar</span>}
              </div>
              <GhostButton onClick={() => setShowFocusEdit(true)}>Edit focus</GhostButton>
              <GhostButton onClick={logOut}><LogOut size={13} /> Log out</GhostButton>
            </div>
          )}
        </div>
      </header>

      <div style={{ marginTop: 16, position: "sticky", top: 0, zIndex: 10 }}><Nav active={active} setActive={setActive} isAdmin={isAdmin} /></div>

      {profileError && (
        <div style={{ maxWidth: 1080, margin: "16px auto 0", padding: "12px 16px", borderRadius: 8, background: `${T.rust}18`, border: `1px solid ${T.rust}44`, color: T.textLight, fontFamily: FONT_BODY, fontSize: 13.5 }}>
          {profileError}
        </div>
      )}

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 60px" }}>
        {!loaded ? (
          <div style={{ color: T.textMuted, fontFamily: FONT_BODY, textAlign: "center", padding: 60 }}>Loading your catalog…</div>
        ) : (
          <>
            {active === "dashboard" && <Dashboard profile={profile} dbData={dbData} setActive={setActive} setBrowseFilter={setBrowseFilter} />}
            {active === "browse" && <Browse dbData={dbData} profile={profile} toggleBookmark={toggleBookmark} markRead={markRead} filterCat={browseFilter} setFilterCat={setBrowseFilter} />}
            {active === "theories" && <Theories dbData={dbData} />}
            {active === "research" && <ResearchMethodology dbData={dbData} />}
            {active === "quiz" && <Quiz dbData={dbData} addQuizResult={addQuizResult} />}
            {active === "flashcards" && <Flashcards dbData={dbData} profile={profile} setFlashcardStatus={setFlashcardStatus} />}
            {active === "admin" && isAdmin && <AdminPanel dbData={dbData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} deleteCategory={deleteCategory} seedStarterContent={seedStarterContent} exportContent={exportContent} importContent={importContent} />}
          </>
        )}
      </main>
    </div>
  );
}
