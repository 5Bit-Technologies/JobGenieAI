// Onboarding profile + completion tracking — stored in localStorage.
import { createContext, useCallback, useContext, useMemo } from "react";
import { useLocalStorage } from "./storage";

export type Province =
  | "Gauteng"
  | "Western Cape"
  | "KwaZulu-Natal"
  | "Eastern Cape"
  | "Limpopo"
  | "Mpumalanga"
  | "North West"
  | "Free State"
  | "Northern Cape";

export const PROVINCES: Province[] = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "Northern Cape",
];

export type Qualification = "Matric" | "N3" | "Diploma" | "Degree" | "No Matric";
export const QUALIFICATIONS: Qualification[] = ["No Matric", "Matric", "N3", "Diploma", "Degree"];

export type Industry =
  | "Retail"
  | "IT"
  | "Healthcare"
  | "Construction"
  | "Finance"
  | "Hospitality"
  | "Government"
  | "Other";

export const INDUSTRIES: Industry[] = [
  "Retail",
  "IT",
  "Healthcare",
  "Construction",
  "Finance",
  "Hospitality",
  "Government",
  "Other",
];

export type Experience = "None" | "Less than 1 year" | "1–3 years";
export const EXPERIENCES: Experience[] = ["None", "Less than 1 year", "1–3 years"];

export type AgeRange = "18–21" | "22–25" | "26–30";
export const AGE_RANGES: AgeRange[] = ["18–21", "22–25", "26–30"];

export type PrimaryGoal = "Build my CV" | "Find learnerships" | "Practice interviews";

export interface Profile {
  name: string;
  province: Province | "";
  qualification: Qualification | "";
  ageRange: AgeRange | "";
  industry: Industry | "";
  experience: Experience | "";
  experienceDetail: string;
  primaryGoal: PrimaryGoal | "";
  completedOnboarding: boolean;
}

export const EMPTY_PROFILE: Profile = {
  name: "",
  province: "",
  qualification: "",
  ageRange: "",
  industry: "",
  experience: "",
  experienceDetail: "",
  primaryGoal: "",
  completedOnboarding: false,
};

const KEY = "jobgenie:profile";

interface Ctx {
  profile: Profile;
  setProfile: (p: Profile | ((prev: Profile) => Profile)) => void;
  reset: () => void;
}

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileRaw] = useLocalStorage<Profile>(KEY, EMPTY_PROFILE);

  const setProfile = useCallback(
    (p: Profile | ((prev: Profile) => Profile)) => {
      setProfileRaw((prev) => (typeof p === "function" ? (p as (prev: Profile) => Profile)(prev) : p));
    },
    [setProfileRaw],
  );

  const reset = useCallback(() => setProfileRaw(EMPTY_PROFILE), [setProfileRaw]);

  const value = useMemo(() => ({ profile, setProfile, reset }), [profile, setProfile, reset]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

// Build a short profile summary that gets sent to the AI on every call.
export function profileSystemExtra(profile: Profile): string {
  if (!profile.name && !profile.province) return "";
  return `User context: Name "${profile.name || "friend"}", Province ${profile.province || "?"}, Qualification ${profile.qualification || "?"}, Age ${profile.ageRange || "?"}, Industry interest ${profile.industry || "?"}, Experience ${profile.experience || "?"}${profile.experienceDetail ? ` (${profile.experienceDetail})` : ""}.`;
}
