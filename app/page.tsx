"use client";

import {
  AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, CheckCircle2,
  Circle, ClipboardCheck, ClipboardList, Code2, Copy, FileText, FolderKanban, LayoutDashboard,
  Lightbulb, LoaderCircle, Plus, Rocket, Sparkles, Trash2, WandSparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  launchChecklistLabels, phases, projectTypes,
  type GeneratedPlan, type PhaseName, type Project, type ProjectType,
} from "@/lib/plan-schema";
import { calculateProgress, createProject, parseProjects, PROJECTS_STORAGE_KEY } from "@/lib/projects";

const examples = [
  "A neighborhood marketplace for borrowing tools and household gear",
  "A lightweight habit tracker for teams working across time zones",
  "A developer dashboard that turns API logs into useful insights",
];

type View = "home" | "project";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("home");
  const [idea, setIdea] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("Web app");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<"ai" | "demo" | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Browser storage is only available after the server-rendered first pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjects(parseProjects(window.localStorage.getItem(PROJECTS_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects, hydrated]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const submitIdea = useCallback(async (submittedIdea = idea) => {
    const cleanedIdea = submittedIdea.trim();
    if (cleanedIdea.length < 10) {
      setError("Add a little more detail to your idea (at least 10 characters).");
      return;
    }
    setError(null);
    setIsGenerating(true);
    setGenerationMode(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: cleanedIdea, projectType }),
      });
      const result = await response.json() as { plan?: GeneratedPlan; mode?: "ai" | "demo"; error?: string };
      if (!response.ok || !result.plan) throw new Error(result.error || "We couldn't generate your plan. Please retry.");
      const project = createProject(result.plan);
      setProjects((current) => [project, ...current]);
      setActiveProjectId(project.id);
      setGenerationMode(result.mode ?? "ai");
      setView("project");
      setIdea("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't generate your plan. Please retry.");
    } finally {
      setIsGenerating(false);
    }
  }, [idea, projectType]);

  function toggleTask(phase: PhaseName, taskId: string) {
    if (!activeProject) return;
    setProjects((current) => current.map((project) => project.id !== activeProject.id ? project : ({
      ...project,
      updatedAt: new Date().toISOString(),
      tasks: {
        ...project.tasks,
        [phase]: project.tasks[phase].map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task),
      },
    })));
  }

  function toggleChecklist(index: number) {
    if (!activeProject) return;
    setProjects((current) => current.map((project) => project.id !== activeProject.id ? project : ({
      ...project,
      updatedAt: new Date().toISOString(),
      launchChecklist: project.launchChecklist.map((checked, itemIndex) => itemIndex === index ? !checked : checked),
    })));
  }

  function deleteProject(projectId: string) {
    setProjects((current) => current.filter((project) => project.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setView("home");
      setGenerationMode(null);
    }
  }

  async function copyPrompt(prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access isn't available here. Select and copy the prompt text instead.");
    }
  }

  function openProject(project: Project) {
    setActiveProjectId(project.id);
    setGenerationMode(null);
    setView("project");
    setError(null);
  }

  const progress = activeProject ? calculateProgress(activeProject) : null;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <button className="brand" onClick={() => { setView("home"); setActiveProjectId(null); }} aria-label="PromptPilot home">
          <span className="brand-mark"><WandSparkles size={16} /></span>PromptPilot
        </button>
        <div className="sidebar-section">
          <div className="section-label">Workspace</div>
          <div className="project-list">
            <button className={`nav-button ${view === "home" ? "active" : ""}`} onClick={() => { setView("home"); setActiveProjectId(null); }}>
              <LayoutDashboard size={15} /> Dashboard
            </button>
            <button className="nav-button" onClick={() => { setView("home"); setActiveProjectId(null); setError(null); }}>
              <Plus size={15} /> New project
            </button>
          </div>
        </div>
        <div className="sidebar-section">
          <div className="section-label">Your projects</div>
          <div className="project-list">
            {projects.length ? projects.map((project) => (
              <div key={project.id} style={{ display: "flex", alignItems: "center" }}>
                <button className={`project-nav ${project.id === activeProjectId && view === "project" ? "selected" : ""}`} onClick={() => openProject(project)} title={project.plan.title}>
                  <span className="project-dot" />{project.plan.title}
                </button>
                <button className="icon-button delete-button" aria-label={`Delete ${project.plan.title}`} title="Delete project" onClick={() => deleteProject(project.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            )) : <div className="empty-state" style={{ marginTop: 12, padding: 12 }}>Your project plans will appear here.</div>}
          </div>
        </div>
        <div className="sidebar-bottom">Your projects stay in this browser. They don&apos;t sync across devices.</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="brand mobile-brand" onClick={() => { setView("home"); setActiveProjectId(null); }}>
            <span className="brand-mark"><WandSparkles size={15} /></span>PromptPilot
          </button>
          <div className="breadcrumb">{view === "project" && activeProject ? `Projects / ${activeProject.plan.title}` : "Your project workspace"}</div>
          <div className="topbar-right">
            <span className="demo-pill"><Circle size={6} fill="currentColor" /> Private workspace</span>
          </div>
        </header>

        <div className="content">
          {view === "project" && activeProject ? (
            <ProjectWorkspace
              project={activeProject}
              progress={progress!}
              mode={generationMode}
              copied={copied}
              onToggleTask={toggleTask}
              onToggleChecklist={toggleChecklist}
              onCopyPrompt={copyPrompt}
              onBack={() => { setView("home"); setActiveProjectId(null); }}
            />
          ) : (
            <HomeView
              idea={idea}
              projectType={projectType}
              isGenerating={isGenerating}
              error={error}
              onIdeaChange={setIdea}
              onProjectTypeChange={setProjectType}
              onSubmit={() => submitIdea()}
              onExample={(value) => { setIdea(value); setError(null); }}
              onRetry={() => submitIdea()}
              projects={projects}
              onOpenProject={openProject}
              onDeleteProject={deleteProject}
            />
          )}
        </div>
      </main>
    </div>
  );
}

interface HomeViewProps {
  idea: string;
  projectType: ProjectType;
  isGenerating: boolean;
  error: string | null;
  onIdeaChange: (value: string) => void;
  onProjectTypeChange: (value: ProjectType) => void;
  onSubmit: () => void;
  onExample: (value: string) => void;
  onRetry: () => void;
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

function HomeView(props: HomeViewProps) {
  return (
    <>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={13} /> From idea to first commit</div>
        <h1>Turn your idea into<br />a <span>build plan.</span></h1>
        <p className="hero-copy">Go from a rough thought to a clear product blueprint, a realistic roadmap, and a prompt your AI coding tool can actually use.</p>
        <div className="idea-card">
          <div className="idea-label"><Lightbulb size={14} /> What are you thinking of building?</div>
          <textarea
            className="idea-input"
            aria-label="Describe your software idea"
            placeholder="Describe your idea, who it helps, and the problem it solves..."
            value={props.idea}
            maxLength={2000}
            onChange={(event) => props.onIdeaChange(event.target.value)}
          />
          <div className="idea-controls">
            <select className="type-select" aria-label="Project type" value={props.projectType} onChange={(event) => props.onProjectTypeChange(event.target.value as ProjectType)}>
              {projectTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
            <button className="primary-button" onClick={props.onSubmit} disabled={props.isGenerating}>
              {props.isGenerating ? <><LoaderCircle size={14} className="animate-spin" /> Building your plan...</> : <>Generate plan <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
        {props.error && <div className="error-banner" role="alert"><AlertCircle size={15} />{props.error}{!props.isGenerating && props.idea.trim().length >= 10 && <button onClick={props.onRetry}>Try again</button>}</div>}
        {props.isGenerating ? <LoadingState /> : (
          <div className="examples">
            <div className="examples-title">NEED A STARTING POINT? TRY ONE OF THESE</div>
            <div className="example-list">
              {examples.map((example) => <button className="example-chip" key={example} onClick={() => props.onExample(example)}>{example}</button>)}
            </div>
          </div>
        )}
      </section>
      <section className="feature-grid" aria-label="What PromptPilot creates">
        <Feature icon={<BookOpen size={15} />} title="A thoughtful blueprint" description="Clarify the problem, audience, and smallest useful version of your product." />
        <Feature icon={<ClipboardList size={15} />} title="A roadmap that ships" description="Turn a big idea into prioritized tasks across setup, build, polish, and launch." />
        <Feature icon={<Code2 size={15} />} title="Prompts that build" description="Hand your coding assistant a project-specific prompt with clear implementation steps." />
      </section>
      {props.projects.length > 0 && (
        <section style={{ marginTop: 58 }}>
          <div className="page-heading">
            <div><h1>Recent projects</h1><p>Pick up where you left off.</p></div>
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            {props.projects.slice(0, 5).map((project) => {
              const progress = calculateProgress(project);
              return <div key={project.id} className="panel" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                <span className="brand-mark"><FolderKanban size={15} /></span>
                <button onClick={() => props.onOpenProject(project)} style={{ flex: 1, border: 0, background: "transparent", color: "#dedde5", textAlign: "left" }}>
                  <strong style={{ display: "block", fontSize: 12, fontWeight: 600 }}>{project.plan.title}</strong>
                  <span style={{ display: "block", marginTop: 4, color: "#858997", fontSize: 10 }}>{progress.completed}/{progress.total} tasks complete · {project.plan.projectType}</span>
                </button>
                <button className="icon-button delete-button" aria-label={`Delete ${project.plan.title}`} onClick={() => props.onDeleteProject(project.id)}><Trash2 size={14} /></button>
                <ArrowUpRight size={14} color="#777b88" />
              </div>;
            })}
          </div>
        </section>
      )}
    </>
  );
}

function LoadingState() {
  return <div className="panel loading-card" role="status" aria-label="Generating project plan">
    <div className="skeleton" style={{ width: "35%", height: 14 }} />
    <div className="skeleton" style={{ width: "88%", height: 10 }} />
    <div className="skeleton" style={{ width: "72%", height: 10 }} />
    <div className="skeleton" style={{ width: "94%", height: 45, marginTop: 6 }} />
  </div>;
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <article className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </article>;
}

interface WorkspaceProps {
  project: Project;
  progress: { completed: number; total: number; percentage: number };
  mode: "ai" | "demo" | null;
  copied: boolean;
  onToggleTask: (phase: PhaseName, taskId: string) => void;
  onToggleChecklist: (index: number) => void;
  onCopyPrompt: (prompt: string) => void;
  onBack: () => void;
}

function ProjectWorkspace({ project, progress, mode, copied, onToggleTask, onToggleChecklist, onCopyPrompt, onBack }: WorkspaceProps) {
  return (
    <>
      <button className="secondary-button" style={{ marginBottom: 22 }} onClick={onBack}><ArrowLeft size={13} /> All projects</button>
      <div className="page-heading" style={{ marginBottom: 0 }}>
        <div>
          <div className="workspace-title"><h1>{project.plan.title}</h1><span className="type-tag">{project.plan.projectType}</span></div>
          <p className="workspace-summary">{project.plan.summary}</p>
        </div>
      </div>
      <div className="progress-card">
        <div className="progress-meta"><span className="progress-number">{progress.percentage}% complete</span><span className="progress-caption">{progress.completed} of {progress.total} roadmap tasks</span></div>
        <div className="progress-track" role="progressbar" aria-label="Roadmap progress" aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
        </div>
        {mode === "demo" && <span className="demo-pill">Demo plan</span>}
      </div>

      <div className="workspace-grid">
        <div className="main-column">
          <section className="panel">
            <div className="panel-heading"><h2 className="panel-title"><BookOpen size={15} /> Project blueprint</h2><span className="panel-kicker">THE WHY &amp; WHAT</span></div>
            <div className="blueprint-grid">
              <BlueprintItem title="The problem" text={project.plan.problem} />
              <BlueprintItem title="Who it&apos;s for" text={project.plan.targetAudience} />
              <BlueprintItem title="What makes it different" text={project.plan.uniqueSellingPoint} />
              <div className="blueprint-item">
                <h3>Suggested MVP scope</h3>
                <ul className="scope-list">{project.plan.mvpScope.map((scope) => <li key={scope}><Check size={12} />{scope}</li>)}</ul>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading"><h2 className="panel-title"><ClipboardList size={15} /> Task roadmap</h2><span className="panel-kicker">{progress.completed}/{progress.total} DONE</span></div>
            {phases.map((phase) => <PhaseTasks key={phase} phase={phase} tasks={project.tasks[phase]} onToggle={onToggleTask} />)}
          </section>
        </div>
        <div className="side-column">
          <section className="panel">
            <div className="panel-heading"><h2 className="panel-title"><ClipboardCheck size={15} /> Launch checklist</h2></div>
            <div className="checklist">{launchChecklistLabels.map((label, index) => (
              <button key={label} className={`checklist-item ${project.launchChecklist[index] ? "checked" : ""}`} onClick={() => onToggleChecklist(index)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left" }}>
                {project.launchChecklist[index] ? <CheckCircle2 size={15} /> : <Circle size={15} />}{label}
              </button>
            ))}</div>
          </section>
          <section className="panel">
            <div className="panel-heading"><h2 className="panel-title"><Code2 size={15} /> AI coding prompt</h2></div>
            <p className="panel-kicker" style={{ margin: "-8px 0 12px", lineHeight: 1.55 }}>Ready to paste into your favorite AI coding assistant.</p>
            <pre className="prompt-copy">{project.plan.codingPrompt}</pre>
            <button className="primary-button copy-button" onClick={() => onCopyPrompt(project.plan.codingPrompt)}>
              {copied ? <><CheckCheck size={14} /> Copied to clipboard</> : <><Copy size={14} /> Copy prompt</>}
            </button>
          </section>
          <section style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px", color: "#777b88", fontSize: 10, lineHeight: 1.5 }}>
            <FileText size={13} /> Saved in this browser only
          </section>
        </div>
      </div>
    </>
  );
}

function BlueprintItem({ title, text }: { title: string; text: string }) {
  return <div className="blueprint-item"><h3>{title}</h3><p>{text}</p></div>;
}

function PhaseTasks({ phase, tasks, onToggle }: { phase: PhaseName; tasks: Project["tasks"][PhaseName]; onToggle: (phase: PhaseName, taskId: string) => void }) {
  const done = tasks.filter((task) => task.completed).length;
  const phaseIcons: Record<PhaseName, React.ReactNode> = {
    Setup: <FolderKanban size={13} color="#9a8af5" />,
    "Core Features": <Code2 size={13} color="#7fa6ed" />,
    Polish: <Sparkles size={13} color="#d1a4ea" />,
    Launch: <Rocket size={13} color="#e5ad75" />,
  };
  return <div className="phase">
    <div className="phase-header"><div className="phase-name">{phaseIcons[phase]}{phase}</div><span className="phase-count">{done}/{tasks.length}</span></div>
    {tasks.map((task) => <div className="task-row" key={task.id}>
      <button className={`task-check ${task.completed ? "completed" : ""}`} aria-label={`${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`} onClick={() => onToggle(phase, task.id)}>{task.completed && <Check size={11} />}</button>
      <div className="task-content"><div className={`task-title ${task.completed ? "completed" : ""}`}>{task.title}</div><p className="task-description">{task.description}</p></div>
      <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
    </div>)}
  </div>;
}
