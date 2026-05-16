import { useI18n } from "../../../../shared/i18n";
import "./AddTaskButton.css";

type AddTaskButtonProps = {
  onClick: () => void;
  title?: string;
};

export function AddTaskButton({ onClick, title }: AddTaskButtonProps) {
  const { t } = useI18n();
  const label = title ?? t("project.addTask");

  return (
    <button
      type="button"
      className="add-task-btn"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      +
    </button>
  );
}
