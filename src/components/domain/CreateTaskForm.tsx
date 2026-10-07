"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { createTaskAction, type ActionResult } from "@/lib/actions/workflow";

export function CreateTaskForm({ orgPath }: { orgPath: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await createTaskAction(prev, formData);
      if (result.ok) {
        (document.getElementById("create-task-form") as HTMLFormElement | null)?.reset();
        router.refresh();
      }
      return result;
    },
    null,
  );

  return (
    <form
      id="create-task-form"
      action={formAction}
      className="card"
      style={{ display: "grid", gap: "var(--space-4)" }}
    >
      <div className="card-head" style={{ marginBottom: 0 }}>
        <h2>New task</h2>
      </div>

      {state && !state.ok ? (
        <div className="status-row is-bad" role="alert">
          <div className="text-sm">{state.error}</div>
        </div>
      ) : null}
      {state && state.ok && state.message ? (
        <div className="status-row is-ok" role="status">
          <div className="text-sm">{state.message}</div>
        </div>
      ) : null}

      <input type="hidden" name="orgPath" value={orgPath} />

      <Field label="Title">
        <Input name="title" required placeholder="e.g. Chase IELTS result for Ayesha" />
      </Field>
      <Field label="Description">
        <Textarea
          name="description"
          rows={2}
          placeholder="Optional context for the assignee"
        />
      </Field>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "var(--space-3)",
        }}
      >
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
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <Button type="submit" block disabled={pending}>
            {pending ? "Creating..." : "Create task"}
          </Button>
        </div>
      </div>
    </form>
  );
}
