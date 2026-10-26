import { describe, expect, it } from "vitest";
import { createDemoPlan } from "../lib/demo-plan";
import { calculateProgress, createProject, parseProjects } from "../lib/projects";

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
});
