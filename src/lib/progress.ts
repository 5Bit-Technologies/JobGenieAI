// Tracks which tools the user has used (for the dashboard progress meter).
import { readLS, writeLS } from "./storage";

export type ToolKey = "cv-builder" | "find-jobs" | "interview-coach" | "cv-check" | "career-quiz" | "chat";
export const ALL_TOOLS: ToolKey[] = ["cv-builder", "find-jobs", "interview-coach", "cv-check", "career-quiz", "chat"];

const KEY = "jobgenie:progress";

export function markToolUsed(tool: ToolKey) {
  const list = readLS<ToolKey[]>(KEY, []);
  if (!list.includes(tool)) writeLS(KEY, [...list, tool]);
}

export function getProgress(): ToolKey[] {
  return readLS<ToolKey[]>(KEY, []);
}
