"use client";

import { useEffect, useState, useCallback } from "react";
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    DragStartEvent, DragEndEvent, closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Database, CheckCircle2, GripVertical, CalendarDays, User2 } from "lucide-react";
import { getTasks, updateTaskStatus, seedLegacyTasks, createTask } from "@/lib/api";
import type { NormalizedTask, TaskStatus } from "@/types";

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const COLUMN_LABELS: Record<TaskStatus, string> = {
    TODO: "Backlog", IN_PROGRESS: "In Progress", REVIEW: "Review", DONE: "Done",
};
const COLUMN_ACCENT: Record<TaskStatus, string> = {
    TODO: "hsl(0 0% 35%)",
    IN_PROGRESS: "hsl(213 94% 60%)",
    REVIEW: "hsl(38 92% 55%)",
    DONE: "hsl(142 71% 45%)",
};

const PriorityDot = ({ priority }: { priority: NormalizedTask["priority"] }) => {
    const colors: Record<string, string> = {
        LOW: "hsl(0 0% 35%)", MEDIUM: "hsl(213 94% 60%)", HIGH: "hsl(38 92% 55%)", CRITICAL: "hsl(0 84% 60%)",
    };
    return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: colors[priority] || colors.LOW, flexShrink: 0 }} />;
};

const TaskCard = ({ task, isDragging = false }: { task: NormalizedTask; isDragging?: boolean }) => (
    <div
        className="task-card"
        style={{ opacity: isDragging ? 0.5 : 1, transform: isDragging ? "rotate(1.5deg)" : undefined }}
    >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "hsl(0 0% 85%)", lineHeight: 1.4 }}>{task.title}</p>
            <GripVertical size={12} style={{ color: "hsl(0 0% 28%)", flexShrink: 0, marginTop: 2 }} />
        </div>
        {task.description && (
            <p style={{ fontSize: 11, color: "hsl(0 0% 38%)", marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {task.description}
            </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ display: "flex", items: "center", gap: 6 }}>
                <PriorityDot priority={task.priority} />
                <span style={{ fontSize: 10, color: "hsl(0 0% 35%)", textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: 4 }}>{task.priority}</span>
            </div>
            {task.assignee && (
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <User2 size={10} style={{ color: "hsl(0 0% 30%)" }} />
                    <span style={{ fontSize: 10, color: "hsl(0 0% 35%)" }}>{task.assignee.split(" ")[0]}</span>
                </div>
            )}
        </div>
        {task.dueDate && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                <CalendarDays size={9} style={{ color: "hsl(0 0% 30%)" }} />
                <span style={{ fontSize: 10, color: "hsl(0 0% 30%)" }}>{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
        )}
    </div>
);

const SortableTaskCard = ({ task }: { task: NormalizedTask }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
            <TaskCard task={task} isDragging={isDragging} />
        </div>
    );
};

const Column = ({ status, tasks }: { status: TaskStatus; tasks: NormalizedTask[] }) => (
    <div className="kanban-column">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid hsl(0 0% 14%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLUMN_ACCENT[status], display: "inline-block" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(0 0% 65%)" }}>{COLUMN_LABELS[status]}</span>
            </div>
            <span style={{ fontSize: 11, color: "hsl(0 0% 30%)", background: "hsl(0 0% 13%)", borderRadius: 4, padding: "1px 6px" }}>{tasks.length}</span>
        </div>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                {tasks.map(t => <SortableTaskCard key={t.id} task={t} />)}
            </div>
        </SortableContext>
        {tasks.length === 0 && (
            <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80,
                border: "1px dashed hsl(0 0% 18%)", borderRadius: 6, color: "hsl(0 0% 25%)", fontSize: 11
            }}>
                Empty
            </div>
        )}
    </div>
);

export default function KanbanPage() {
    const [tasks, setTasks] = useState<NormalizedTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [seedMsg, setSeedMsg] = useState("");
    const [activeTask, setActiveTask] = useState<NormalizedTask | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newCol, setNewCol] = useState<TaskStatus>("TODO");
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const fetchTasks = useCallback(async () => {
        try { const r = await getTasks(); if (r.success) setTasks(r.data); } catch { }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const tasksByCol = (s: TaskStatus) => tasks.filter(t => t.status === s);

    const handleDragEnd = async ({ active, over }: DragEndEvent) => {
        setActiveTask(null);
        if (!over || active.id === over.id) return;
        const target: TaskStatus | null = COLUMNS.includes(over.id as TaskStatus)
            ? (over.id as TaskStatus) : (tasks.find(t => t.id === over.id)?.status ?? null);
        if (!target) return;
        const dragged = tasks.find(t => t.id === active.id);
        if (!dragged || dragged.status === target) return;
        setTasks(p => p.map(t => t.id === active.id ? { ...t, status: target } : t));
        try { await updateTaskStatus(String(active.id), target); } catch { fetchTasks(); }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try { await seedLegacyTasks(); setSeedMsg("Seeded!"); await fetchTasks(); setTimeout(() => setSeedMsg(""), 2500); }
        catch { } finally { setSeeding(false); }
    };

    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        await createTask({ title: newTitle, status: newCol });
        setNewTitle(""); setAddModal(false); fetchTasks();
    };

    if (loading) return (
        <div style={{ display: "flex", gap: 12 }}>
            {COLUMNS.map(c => <div key={c} className="skeleton" style={{ minWidth: 288, height: 480, borderRadius: 8 }} />)}
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em" }}>Projects</h1>
                    <p style={{ fontSize: 13, color: "hsl(0 0% 38%)", marginTop: 4 }}>{tasks.length} tasks across {COLUMNS.length} stages</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {seedMsg && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "hsl(142 71% 50%)", background: "hsl(142 71% 45% / 0.1)", border: "1px solid hsl(142 71% 45% / 0.2)", padding: "4px 10px", borderRadius: 6 }}>
                            <CheckCircle2 size={12} /> {seedMsg}
                        </div>
                    )}
                    <button className="btn-ghost" onClick={handleSeed} disabled={seeding}>
                        <Database size={13} /> {seeding ? "Seeding…" : "Seed Data"}
                    </button>
                    <button className="btn-primary" onClick={() => setAddModal(true)}>
                        <Plus size={13} /> New Task
                    </button>
                </div>
            </div>

            <div className="kanban-scroll">
                <DndContext sensors={sensors} collisionDetection={closestCorners}
                    onDragStart={({ active }: DragStartEvent) => setActiveTask(tasks.find(t => t.id === active.id) ?? null)}
                    onDragEnd={handleDragEnd}>
                    <div style={{ display: "flex", gap: 12, minWidth: "max-content", paddingBottom: 4 }}>
                        {COLUMNS.map(s => <Column key={s} status={s} tasks={tasksByCol(s)} />)}
                    </div>
                    <DragOverlay>{activeTask && <TaskCard task={activeTask} />}</DragOverlay>
                </DndContext>
            </div>

            {addModal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", padding: 16
                }}>
                    <div className="surface animate-fade-in" style={{ width: "100%", maxWidth: 360, padding: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: "hsl(0 0% 88%)", marginBottom: 14 }}>New Task</h3>
                        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title" className="input"
                            style={{ marginBottom: 10 }} onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus />
                        <select value={newCol} onChange={e => setNewCol(e.target.value as TaskStatus)} className="input" style={{ marginBottom: 14 }}>
                            {COLUMNS.map(c => <option key={c} value={c}>{COLUMN_LABELS[c]}</option>)}
                        </select>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAddModal(false)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleAdd}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
