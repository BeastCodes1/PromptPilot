import { phases, type GeneratedPlan, type PhaseName, type Project, type ProjectTask } from "./plan-schema";
import { generatedPlanSchema, taskSchema } from "./plan-schema";
import { z } from "zod";

export const PROJECTS_STORAGE_KEY = "promptpilot.projects.v1";
const persistedProjectSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  plan: generatedPlanSchema,
  tasks: z.object({
    Setup: z.array(taskSchema.extend({ id: z.string(), completed: z.boolean() })),
    "Core Features": z.array(taskSchema.extend({ id: z.string(), completed: z.boolean() })),
    Polish: z.array(taskSchema.extend({ id: z.string(), completed: z.boolean() })),
    Launch: z.array(taskSchema.extend({ id: z.string(), completed: z.boolean() })),
  }),
  launchChecklist: z.array(z.boolean()).length(6),
});

export function createProject(plan: GeneratedPlan, now = new Date()): Project {
  const id = globalThis.crypto?.randomUUID?.() ?? `${now.getTime()}-${Math.random().toString(36).slice(2)}`;
  const tasks = Object.fromEntries(
    phases.map((phase) => [
      phase,
      plan.tasks[phase].map((task, index): ProjectTask => ({
        ...task,
        id: `${phase.toLowerCase().replaceAll(" ", "-")}-${index}`,
        completed: false,
      })),
    ]),
  ) as Record<PhaseName, ProjectTask[]>;

  return {
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    plan,
    tasks,
    launchChecklist: Array(6).fill(false) as boolean[],
  };
}

export function mergeRefinedPlan(project: Project, plan: GeneratedPlan, now = new Date()): Project {
  const previousTasks = project.tasks;
  const nextTasks = Object.fromEntries(
    phases.map((phase) => [
      phase,
      plan.tasks[phase].map((task, index): ProjectTask => {
        const previous = previousTasks[phase].find(
          (candidate) => candidate.title.trim().toLowerCase() === task.title.trim().toLowerCase(),
        );
        return {
          ...task,
          id: previous?.id ?? `${phase.toLowerCase().replaceAll(" ", "-")}-${now.getTime()}-${index}`,
          completed: previous?.completed ?? false,
        };
      }),
    ]),
  ) as Record<PhaseName, ProjectTask[]>;

  return {
    ...project,
    updatedAt: now.toISOString(),
    plan,
    tasks: nextTasks,
  };
}

export function calculateProgress(project: Pick<Project, "tasks">): { completed: number; total: number; percentage: number } {
  const allTasks = phases.flatMap((phase) => project.tasks[phase]);
  const completed = allTasks.filter((task) => task.completed).length;
  const total = allTasks.length;

  return { completed, total, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

export function parseProjects(value: string | null): Project[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is Project => persistedProjectSchema.safeParse(value).success);
  } catch {
    return [];
  }
}
