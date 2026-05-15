import "./AddTaskButton.css";

type AddTaskButtonProps = {
  onClick: () => void;
  title?: string;
};

export function AddTaskButton({ onClick, title = "Add task" }: AddTaskButtonProps) {
  return (
    <button
      type="button"
      className="add-task-btn"
      onClick={onClick}
      aria-label={title}
      title={title}
    >
      +
    </button>
  );
}
