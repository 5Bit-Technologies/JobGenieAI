import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowLeft, FileText, Briefcase, MessageSquareHeart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AGE_RANGES,
  EXPERIENCES,
  INDUSTRIES,
  PROVINCES,
  QUALIFICATIONS,
  useProfile,
  type Industry,
} from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboard")({
  head: () => ({
    meta: [
      { title: "Get Started — JobGenie" },
      { name: "description", content: "Tell JobGenie about you so we can personalise your career help." },
      { property: "og:title", content: "Get Started — JobGenie" },
      { property: "og:description", content: "A quick 4-step setup to personalise your AI career assistant." },
    ],
  }),
  component: Onboard,
});

const INDUSTRY_EMOJI: Record<Industry, string> = {
  Retail: "🛍️",
  IT: "💻",
  Healthcare: "🩺",
  Construction: "🏗️",
  Finance: "💰",
  Hospitality: "🍽️",
  Government: "🏛️",
  Other: "✨",
};

function Onboard() {
  const navigate = useNavigate();
  const { profile, setProfile } = useProfile();
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = (goalRoute: string) => {
    setProfile((p) => ({ ...p, completedOnboarding: true }));
    navigate({ to: goalRoute });
  };

  const canNext =
    (step === 0 && profile.name && profile.province && profile.qualification && profile.ageRange) ||
    (step === 1 && profile.industry) ||
    (step === 2 && profile.experience);

  return (
    <div className="bg-gradient-warm">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full transition-all",
                i <= step ? "bg-primary" : "bg-primary/15",
              )}
            />
          ))}
        </div>
        <p className="text-center text-sm font-medium text-muted-foreground">Step {step + 1} of 4</p>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-10">
          {step === 0 && (
            <div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Sawubona 👋 Let's start with you.</h1>
              <p className="mt-2 text-muted-foreground">
                Just the basics. We'll keep everything on your device.
              </p>

              <div className="mt-8 grid gap-6">
                <Field label="What should we call you?">
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="e.g. Thandi"
                    className="h-12 rounded-2xl"
                  />
                </Field>

                <Field label="Which province?">
                  <select
                    value={profile.province}
                    onChange={(e) => setProfile({ ...profile, province: e.target.value as typeof profile.province })}
                    className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm"
                  >
                    <option value="">Choose a province</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Highest qualification">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {QUALIFICATIONS.map((q) => (
                      <ChoiceChip
                        key={q}
                        active={profile.qualification === q}
                        onClick={() => setProfile({ ...profile, qualification: q })}
                      >
                        {q}
                      </ChoiceChip>
                    ))}
                  </div>
                </Field>

                <Field label="Your age range">
                  <div className="grid grid-cols-3 gap-2">
                    {AGE_RANGES.map((a) => (
                      <ChoiceChip
                        key={a}
                        active={profile.ageRange === a}
                        onClick={() => setProfile({ ...profile, ageRange: a })}
                      >
                        {a}
                      </ChoiceChip>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">What field interests you?</h1>
              <p className="mt-2 text-muted-foreground">Pick what excites you. You can change this later.</p>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setProfile({ ...profile, industry: ind })}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-all",
                      profile.industry === ind
                        ? "border-primary bg-primary-soft shadow-warm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/40",
                    )}
                  >
                    <span className="text-3xl">{INDUSTRY_EMOJI[ind]}</span>
                    <span className="font-display text-sm font-bold">{ind}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Any work experience?</h1>
              <p className="mt-2 text-muted-foreground">
                It's totally fine if you have none. Most users start here.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {EXPERIENCES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setProfile({ ...profile, experience: e })}
                    className={cn(
                      "rounded-2xl border-2 p-5 text-left transition-all",
                      profile.experience === e
                        ? "border-primary bg-primary-soft shadow-warm"
                        : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    <p className="font-display text-lg font-bold">{e}</p>
                  </button>
                ))}
              </div>

              {profile.experience && profile.experience !== "None" && (
                <div className="mt-6">
                  <Field label="Briefly tell us what you've done">
                    <Textarea
                      value={profile.experienceDetail}
                      onChange={(e) => setProfile({ ...profile, experienceDetail: e.target.value })}
                      placeholder="e.g. Worked at Pick n Pay as a cashier for 6 months in 2023"
                      className="min-h-24 rounded-2xl"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">
                What do you need most today, {profile.name || "friend"}?
              </h1>
              <p className="mt-2 text-muted-foreground">Pick one to start. You'll have access to everything.</p>

              <div className="mt-8 grid gap-4">
                <BigGoal
                  icon={FileText}
                  title="Build my CV"
                  desc="From zero to a downloadable CV in 10 minutes."
                  onClick={() => {
                    setProfile({ ...profile, primaryGoal: "Build my CV" });
                    finish("/cv-builder");
                  }}
                />
                <BigGoal
                  icon={Briefcase}
                  title="Find learnerships"
                  desc="Real opportunities matched to your province and qualification."
                  onClick={() => {
                    setProfile({ ...profile, primaryGoal: "Find learnerships" });
                    finish("/find-jobs");
                  }}
                />
                <BigGoal
                  icon={MessageSquareHeart}
                  title="Practise interviews"
                  desc="Industry questions + instant, kind feedback."
                  onClick={() => {
                    setProfile({ ...profile, primaryGoal: "Practice interviews" });
                    finish("/interview-coach");
                  }}
                />
              </div>

              <button
                onClick={() => finish("/dashboard")}
                className="mt-6 w-full rounded-xl py-3 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Just take me to the dashboard →
              </button>
            </div>
          )}

          {step < 3 && (
            <div className="mt-10 flex items-center justify-between">
              <Button variant="ghost" onClick={back} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button variant="default" size="lg" disabled={!canNext} onClick={next}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-display text-sm font-bold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border-2 px-3 py-3 text-sm font-semibold transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-warm"
          : "border-border bg-background hover:border-primary/40",
      )}
    >
      {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function BigGoal({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border-2 border-border bg-background p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft hover:shadow-warm"
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-sun text-primary shadow-glow">
        <Icon className="h-7 w-7" />
      </div>
      <div className="flex-1">
        <p className="font-display text-lg font-bold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </button>
  );
}
