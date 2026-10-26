import { describe, expect, it } from "vitest";
import { createDemoPlan } from "../lib/demo-plan";
import { planRefinementRequestSchema } from "../lib/plan-schema";
import { calculateProgress, createProject, mergeRefinedPlan, parseProjects } from "../lib/projects";

describe("project transformations", () => {
  it("starts with no completed tasks and calculates roadmap progress", () => {
    const project = createProject(createDemoPlan("A tool to organize community events", "Web app"), new Date("2026-01-01T00:00:00.000Z"));
    expect(calculateProgress(project)).toEqual({ completed: 0, total: 13, percentage: 0 });

    project.tasks.Setup[0].completed = true;
    expect(calculateProgress(project)).toEqual({ completed: 1, total: 13, percentage: 8 });
  });

  it("gracefully ignores malformed or non-project local storage values", () => {
    expect(parseProjects(null)).toEqual([]);
    expect(parseProjects("{broken")).toEqual([]);
    expect(parseProjects(JSON.stringify([{ id: "partial" }]))).toEqual([]);
  });

  it("restores a serialized project", () => {
    const project = createProject(createDemoPlan("A tool to organize community events", "Web app"));
    expect(parseProjects(JSON.stringify([project]))).toEqual([project]);
  });

  it("preserves matching task completion and checklist state when a plan is refined", () => {
    const project = createProject(createDemoPlan("A tool to organize community events", "Web app"));
    project.tasks.Setup[0].completed = true;
    project.launchChecklist[0] = true;
    const refinedPlan = createDemoPlan("A mobile-first tool to organize community events", "Mobile app");
    refinedPlan.tasks.Setup[0].description = "Use the same foundation, adapted to the refined product direction.";

    const refined = mergeRefinedPlan(project, refinedPlan, new Date("2026-02-01T00:00:00.000Z"));

    expect(refined.plan).toEqual(refinedPlan);
    expect(refined.tasks.Setup[0]).toMatchObject({
      id: project.tasks.Setup[0].id,
      completed: true,
      description: refinedPlan.tasks.Setup[0].description,
    });
    expect(refined.launchChecklist).toEqual(project.launchChecklist);
    expect(refined.updatedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("leaves newly introduced tasks incomplete", () => {
    const project = createProject(createDemoPlan("A tool to organize community events", "Web app"));
    const refinedPlan = createDemoPlan("A tool to organize community events", "Web app");
    refinedPlan.tasks.Setup[0].title = "Create a mobile-first app foundation";

    const refined = mergeRefinedPlan(project, refinedPlan);

    expect(refined.tasks.Setup[0].completed).toBe(false);
    expect(refined.tasks.Setup[0].id).not.toBe(project.tasks.Setup[0].id);
  });

  it("validates refinement instructions and the current plan before requesting changes", () => {
    const plan = createDemoPlan("A tool to organize community events", "Web app");

    expect(planRefinementRequestSchema.safeParse({ mode: "refine", plan, instruction: "Make the MVP simpler" }).success).toBe(true);
    expect(planRefinementRequestSchema.safeParse({ mode: "refine", plan, instruction: "short" }).success).toBe(false);
    expect(planRefinementRequestSchema.safeParse({ mode: "refine", plan: {}, instruction: "Make the MVP simpler" }).success).toBe(false);
  });
});
