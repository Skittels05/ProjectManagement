import { type FormEvent, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../store";
import {
  useCreateTaskCommentMutation,
  useDeleteTaskCommentMutation,
  useGetTaskCommentsQuery,
  useUpdateTaskCommentMutation,
} from "../../../../store/api/taskEngagementApi";
import type { TaskCommentDto } from "../../../../store/types/taskEngagement.types";
import { sameUserId } from "../../../../shared/lib/uuid";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";

type TaskCommentsPanelProps = { projectId: string; taskId: string };

export function TaskCommentsPanel({ projectId, taskId }: TaskCommentsPanelProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: comments = [], isLoading, error } = useGetTaskCommentsQuery({ projectId, taskId });
  const [createComment, { isLoading: creating }] = useCreateTaskCommentMutation();
  const [updateComment, { isLoading: updating }] = useUpdateTaskCommentMutation();
  const [deleteComment] = useDeleteTaskCommentMutation();
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setFormError(null);
    try {
      await createComment({ projectId, taskId, body: text }).unwrap();
      setDraft("");
    } catch (err) {
      setFormError(getRtkQueryErrorMessage(err));
    }
  }

  async function saveEdit(commentId: string) {
    const text = editDraft.trim();
    if (!text) return;
    try {
      await updateComment({ projectId, taskId, commentId, body: text }).unwrap();
      setEditingId(null);
      setEditDraft("");
    } catch (err) {
      setFormError(getRtkQueryErrorMessage(err));
    }
  }

  return (
    <section className="task-engagement-panel">
      <h3>Comments</h3>
      {isLoading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="form-error">{getRtkQueryErrorMessage(error)}</p> : null}
      <ul className="task-comment-list">
        {comments.map((c) => (
          <CommentRow
            key={c.id}
            comment={c}
            isOwn={sameUserId(c.userId, user?.id)}
            isEditing={editingId === c.id}
            editDraft={editDraft}
            updating={updating}
            onEdit={() => {
              setEditingId(c.id);
              setEditDraft(c.body);
            }}
            onEditDraftChange={setEditDraft}
            onSave={() => void saveEdit(c.id)}
            onCancel={() => {
              setEditingId(null);
              setEditDraft("");
            }}
            onDelete={async () => {
              if (!window.confirm("Delete comment?")) return;
              try {
                await deleteComment({ projectId, taskId, commentId: c.id }).unwrap();
              } catch (err) {
                window.alert(getRtkQueryErrorMessage(err));
              }
            }}
          />
        ))}
      </ul>
      {!isLoading && comments.length === 0 ? <p className="muted">No comments yet.</p> : null}
      <form className="task-comment-form" onSubmit={(e) => void handleAdd(e)}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment…"
          rows={2}
          disabled={creating}
        />
        {formError ? <p className="form-error">{formError}</p> : null}
        <button type="submit" disabled={creating || !draft.trim()}>
          {creating ? "Posting…" : "Add comment"}
        </button>
      </form>
    </section>
  );
}

function CommentRow(props: {
  comment: TaskCommentDto;
  isOwn: boolean;
  isEditing: boolean;
  editDraft: string;
  updating: boolean;
  onEdit: () => void;
  onEditDraftChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { comment, isOwn, isEditing, editDraft, updating } = props;
  const who = comment.user?.fullName ?? comment.user?.email ?? "User";
  const when = new Date(comment.createdAt).toLocaleString();

  return (
    <li className="task-comment-item">
      <div className="task-comment-meta">
        <strong>{who}</strong>
        <span className="muted small-meta">{when}</span>
      </div>
      {isEditing ? (
        <>
          <textarea value={editDraft} onChange={(e) => props.onEditDraftChange(e.target.value)} rows={3} />
          <CommentActions saving={updating} onSave={props.onSave} onCancel={props.onCancel} />
        </>
      ) : (
        <>
          <p className="task-comment-body">{comment.body}</p>
          {isOwn ? (
            <CommentActions saving={false} onSave={props.onEdit} onCancel={props.onDelete} editMode />
          ) : null}
        </>
      )}
    </li>
  );
}

function CommentActions(props: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  editMode?: boolean;
}) {
  if (props.editMode) {
    return (
      <div className="task-comment-actions">
        <button type="button" onClick={props.onSave}>
          Edit
        </button>
        <button type="button" className="danger" onClick={props.onCancel}>
          Delete
        </button>
      </div>
    );
  }
  return (
    <div className="task-comment-actions">
      <button type="button" disabled={props.saving} onClick={props.onSave}>
        Save
      </button>
      <button type="button" className="secondary-button" disabled={props.saving} onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  );
}
