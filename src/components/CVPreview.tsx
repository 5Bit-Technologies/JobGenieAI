// Live-rendered CV preview component used in CV Builder.
// Pure presentation — receives a structured CV object.

export interface CVData {
  personal: {
    name?: string;
    title?: string; // objective tagline
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  objective?: string;
  education?: { school: string; qualification: string; year: string; details?: string }[];
  experience?: { role: string; company: string; period: string; details?: string }[];
  skills?: string[];
  hobbies?: string[];
  references?: { name: string; relation: string; contact: string }[];
}

export const EMPTY_CV: CVData = {
  personal: {},
  objective: "",
  education: [],
  experience: [],
  skills: [],
  hobbies: [],
  references: [],
};

export function CVPreview({ cv, id }: { cv: CVData; id?: string }) {
  const p = cv.personal ?? {};
  return (
    <div
      id={id}
      className="cv-print mx-auto max-w-[820px] bg-white p-8 font-sans text-[13.5px] leading-relaxed text-neutral-800 shadow-card sm:p-12"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="border-b-4 border-[#1B4332] pb-5">
        <h1 className="font-display text-4xl font-bold tracking-tight text-[#1B4332]" style={{ fontFamily: "'Syne', sans-serif" }}>
          {p.name || "Your Name"}
        </h1>
        {p.title && <p className="mt-1 text-base text-[#D4A017]">{p.title}</p>}
        <p className="mt-3 text-xs text-neutral-600">
          {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join("  ·  ")}
        </p>
      </header>

      {cv.objective && (
        <Section title="Objective">
          <p>{cv.objective}</p>
        </Section>
      )}

      {cv.experience && cv.experience.length > 0 && (
        <Section title="Experience">
          {cv.experience.map((e, i) => (
            <div key={i} className="mt-3 first:mt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-neutral-900">{e.role}</p>
                <p className="text-xs text-neutral-500">{e.period}</p>
              </div>
              <p className="text-[12.5px] italic text-neutral-600">{e.company}</p>
              {e.details && <p className="mt-1 text-[13px] text-neutral-700">{e.details}</p>}
            </div>
          ))}
        </Section>
      )}

      {cv.education && cv.education.length > 0 && (
        <Section title="Education">
          {cv.education.map((e, i) => (
            <div key={i} className="mt-3 first:mt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-neutral-900">{e.qualification}</p>
                <p className="text-xs text-neutral-500">{e.year}</p>
              </div>
              <p className="text-[12.5px] italic text-neutral-600">{e.school}</p>
              {e.details && <p className="mt-1 text-[13px] text-neutral-700">{e.details}</p>}
            </div>
          ))}
        </Section>
      )}

      {cv.skills && cv.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {cv.skills.map((s, i) => (
              <span
                key={i}
                className="rounded-md bg-[#1B4332]/8 px-2 py-0.5 text-[12px] text-[#1B4332]"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {cv.hobbies && cv.hobbies.length > 0 && (
        <Section title="Interests">
          <p>{cv.hobbies.join(" · ")}</p>
        </Section>
      )}

      {cv.references && cv.references.length > 0 && (
        <Section title="References">
          {cv.references.map((r, i) => (
            <p key={i} className="mt-1">
              <span className="font-semibold">{r.name}</span> — {r.relation} · {r.contact}
            </p>
          ))}
        </Section>
      )}

      {!cv.objective &&
        (!cv.experience || cv.experience.length === 0) &&
        (!cv.education || cv.education.length === 0) &&
        (!cv.skills || cv.skills.length === 0) && (
          <p className="mt-10 text-center text-sm italic text-neutral-400">
            Your CV will appear here as you chat with JobGenie.
          </p>
        )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2
        className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A017]"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
