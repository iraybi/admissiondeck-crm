"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  changeStudentStatusAction,
  addNoteAction,
  assignCounsellorAction,
  createTaskAction,
} from "@/lib/actions/workflow";

export function StudentActions({
  studentId,
  currentStatus,
  counsellors,
  currentCounsellorId,
}: {
  studentId: string;
  currentStatus: string;
  counsellors: { id: string; name: string }[];
  currentCounsellorId: string | null;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"status" | "note" | "task" | "assign" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleChangeStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await changeStudentStatusAction(studentId, data.get("status") as string);
    setModal(null);
    setBusy(false);
    router.refresh();
  }

  async function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("studentId", studentId);
    const result = await addNoteAction(null, data);
    setModal(null);
    setBusy(false);
    if (!result.ok) setMessage({ ok: false, text: result.error });
    router.refresh();
  }

  async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("studentId", studentId);
    await createTaskAction(null, data);
    setModal(null);
    setBusy(false);
    router.refresh();
  }

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await assignCounsellorAction(studentId, data.get("counsellorId") as string);
    setModal(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => setModal("status")}>
          Change status
        </Button>
        <Button variant="secondary" onClick={() => setModal("note")}>
          Add note
        </Button>
        <Button variant="secondary" onClick={() => setModal("task")}>
          Create task
        </Button>
        <Button variant="secondary" onClick={() => setModal("assign")}>
          Assign counsellor
        </Button>
      </div>

      {/* Status modal */}
      <Modal
        open={modal === "status"}
        title="Change student status"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="status-form" disabled={busy}>
              {busy ? "Saving..." : "Update status"}
            </Button>
          </>
        }
      >
        <form id="status-form" onSubmit={handleChangeStatus}>
          <Field label="New status">
            <Select name="status" defaultValue={currentStatus}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="OFFER">Offer</option>
              <option value="VISA">Visa granted</option>
              <option value="COMPLETED">Completed</option>
              <option value="REFUSED">Visa refused</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="DROPOUT">Dropped out</option>
            </Select>
          </Field>
        </form>
      </Modal>

      {/* Note modal */}
      <Modal
        open={modal === "note"}
        title="Add note"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="note-form" disabled={busy}>
              {busy ? "Adding..." : "Add note"}
            </Button>
          </>
        }
      >
        <form id="note-form" onSubmit={handleAddNote}>
          <Field label="Note">
            <Textarea name="body" rows={4} required placeholder="Add a note about this student..." />
          </Field>
        </form>
      </Modal>

      {/* Task modal */}
      <Modal
        open={modal === "task"}
        title="Create task"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="task-form" disabled={busy}>
              {busy ? "Creating..." : "Create task"}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={handleCreateTask}>
          <Field label="Title">
            <Input name="title" required placeholder="e.g. Chase IELTS result" />
          </Field>
          <Field label="Description">
            <Textarea name="description" rows={2} placeholder="Optional details" />
          </Field>
          <Field label="Due date">
            <Input type="date" name="dueAt" />
          </Field>
          <Field label="Priority">
            <Select name="priority" defaultValue="MEDIUM">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </Field>
        </form>
      </Modal>

      {/* Assign counsellor modal */}
      <Modal
        open={modal === "assign"}
        title="Assign counsellor"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" form="assign-form" disabled={busy}>
              {busy ? "Assigning..." : "Assign"}
            </Button>
          </>
        }
      >
        <form id="assign-form" onSubmit={handleAssign}>
          <Field label="Counsellor">
            <Select name="counsellorId" defaultValue={currentCounsellorId ?? ""}>
              <option value="">Unassigned</option>
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>
    </>
  );
}
