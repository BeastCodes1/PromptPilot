import { z } from "zod";

export const projectTypes = [
  "Web app",
  "Mobile app",
  "Developer tool",
  "Marketplace",
  "SaaS platform",
  "Other",
] as const;

export const phases = ["Setup", "Core Features", "Polish", "Launch"] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(280),
  priority: z.enum(["High", "Medium", "Low"]),
});

export const generatedPlanSchema = z.object({
  title: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(10).max(500),
  projectType: z.string().trim().min(2).max(40),
  targetAudience: z.string().trim().min(5).max(300),
  problem: z.string().trim().min(10).max(500),
  uniqueSellingPoint: z.string().trim().min(10).max(400),
  mvpScope: z.array(z.string().trim().min(3).max(180)).min(3).max(7),
  tasks: z.object({
    Setup: z.array(taskSchema).min(2).max(5),
    "Core Features": z.array(taskSchema).min(3).max(7),
    Polish: z.array(taskSchema).min(2).max(5),
    Launch: z.array(taskSchema).min(2).max(5),
  }),
  codingPrompt: z.string().trim().min(100).max(6000),
});

export const generationRequestSchema = z.object({
  idea: z.string().trim().min(10, "Add a little more detail to your idea.").max(2000),
  projectType: z.enum(projectTypes).default("Web app"),
});

export type ProjectType = (typeof projectTypes)[number];
export type TaskPriority = z.infer<typeof taskSchema>["priority"];
export type PhaseName = (typeof phases)[number];
export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  completed: boolean;
}

export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  plan: GeneratedPlan;
  tasks: Record<PhaseName, ProjectTask[]>;
  launchChecklist: boolean[];
}

export const launchChecklistLabels = [
  "Environment setup",
  "Core flow tested",
  "Responsive layout checked",
  "Error handling implemented",
  "README written",
  "Deployment completed",
] as const;
