import { phases, type GeneratedPlan, type ProjectType } from "./plan-schema";

export function createDemoPlan(idea: string, projectType: ProjectType): GeneratedPlan {
  const cleanIdea = idea.trim().replace(/[.!?]+$/, "");
  const title = cleanIdea.split(/\s+/).slice(0, 6).join(" ");

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    summary: `${cleanIdea}. A focused ${projectType.toLowerCase()} that turns this idea into a clear, dependable experience users can understand and act on.`,
    projectType,
    targetAudience: "Early adopters and small teams looking for a straightforward way to solve this problem without a complex setup.",
    problem: "People currently rely on fragmented, manual workflows to get this job done. That makes the experience slower, harder to repeat, and easy to lose track of.",
    uniqueSellingPoint: "A focused, low-friction workflow that gets users to the useful outcome quickly, without adding unnecessary complexity.",
    mvpScope: [
      "A clear onboarding flow that explains the core value and gets users started.",
      "A central workspace for the primary user workflow and its current status.",
      "Useful empty, loading, success, and error states throughout the experience.",
      "Responsive layouts with accessible keyboard interactions.",
      "A small set of sample data so first-time users can see how it works.",
    ],
    tasks: {
      Setup: [
        { title: "Set up the app foundation", description: "Create the application shell, routing, styling tokens, and core development scripts.", priority: "High" },
        { title: "Define the core data model", description: "Model the primary user, workspace, and records needed for the first release.", priority: "High" },
        { title: "Create the design system primitives", description: "Establish reusable buttons, inputs, cards, spacing, and type styles.", priority: "Medium" },
      ],
      "Core Features": [
        { title: "Build the primary user workflow", description: "Implement the end-to-end flow that delivers the central product value.", priority: "High" },
        { title: "Add workspace overview and navigation", description: "Give users a clear home for their work and an obvious way to move around.", priority: "High" },
        { title: "Persist user changes", description: "Save the important state and restore it reliably when users return.", priority: "High" },
        { title: "Add useful empty and success states", description: "Guide new users and confirm when important actions have succeeded.", priority: "Medium" },
      ],
      Polish: [
        { title: "Make every view responsive", description: "Check the primary experience at mobile, tablet, and desktop widths.", priority: "High" },
        { title: "Add validation and error recovery", description: "Explain invalid input and provide a clear next step for recoverable failures.", priority: "High" },
        { title: "Polish accessibility and interaction states", description: "Verify keyboard navigation, focus visibility, contrast, and hover feedback.", priority: "Medium" },
      ],
      Launch: [
        { title: "Write setup and usage documentation", description: "Document prerequisites, configuration, development, and deployment.", priority: "Medium" },
        { title: "Run the production readiness checklist", description: "Verify the critical user journey and confirm the production build succeeds.", priority: "High" },
        { title: "Deploy the MVP", description: "Configure production environment variables and publish the first release.", priority: "High" },
      ],
    },
    codingPrompt: `You are building ${title}, a ${projectType.toLowerCase()}.\n\nPRODUCT IDEA\n${cleanIdea}\n\nRECOMMENDED STACK\nUse Next.js App Router, TypeScript, Tailwind CSS, and accessible, reusable UI primitives. Keep secrets and privileged integrations on the server. Start with local persistence unless a backend is explicitly required.\n\nKEY REQUIREMENTS\n${phases.flatMap((phase) => phasesToRequirements(phase)).map((item) => `- ${item}`).join("\n")}\n\nUI DIRECTION\nCreate a polished, responsive developer-tool experience with a clear hierarchy, restrained color accents, generous spacing, visible keyboard focus, and useful loading, empty, success, and error states.\n\nIMPLEMENTATION ORDER\n1. Define typed domain models and validate inputs.\n2. Build the main user journey and core workspace.\n3. Add persistence and recoverable error states.\n4. Verify responsive behavior and accessibility.\n5. Add tests for important data transformations and production-critical flows.\n\nKeep the first release focused on the MVP scope. Explain tradeoffs, avoid placeholder functionality, and verify the finished experience with tests.`,
  };
}

function phasesToRequirements(phase: (typeof phases)[number]): string[] {
  const descriptions: Record<(typeof phases)[number], string[]> = {
    Setup: ["Create the app foundation and shared UI primitives.", "Define a maintainable, typed data model."],
    "Core Features": ["Implement the primary user workflow end to end.", "Persist user changes and provide clear workspace navigation."],
    Polish: ["Support small screens and accessible keyboard use.", "Validate input and show helpful error, empty, and success states."],
    Launch: ["Document local setup and production configuration.", "Test the critical path and deploy the working MVP."],
  };
  return descriptions[phase];
}
