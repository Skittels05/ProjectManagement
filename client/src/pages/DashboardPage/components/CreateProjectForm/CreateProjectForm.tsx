import { type FormEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../../store";
import { createProject } from "../../../../store/thunks/projectsThunks";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";

export function CreateProjectForm() {
  const dispatch = useDispatch<AppDispatch>();
  const { createLoading, createError } = useSelector((state: RootState) => state.projects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await dispatch(createProject({ name, description: description || undefined }));

    if (createProject.fulfilled.match(result)) {
      setName("");
      setDescription("");
    }
  }

  return (
    <ProjectPanel title="New project">
      <form className="project-form auth-form" onSubmit={(e) => void handleCreate(e)}>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product workspace"
            maxLength={255}
            required
          />
        </label>
        <label>
          Description <span className="muted">(optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short summary for the team"
            rows={3}
          />
        </label>
        {createError ? <p className="form-error">{createError}</p> : null}
        <button type="submit" disabled={createLoading}>
          {createLoading ? "Creating…" : "Create project"}
        </button>
      </form>
    </ProjectPanel>
  );
}
