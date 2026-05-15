import type { ReactNode } from "react";
import "./ProjectPanel.css";

type ProjectPanelProps = {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
};

export function ProjectPanel({ title, children, headerAction }: ProjectPanelProps) {
  return (
    <div className="project-panel">
      <div className="panel-header">
        <h3 className="panel-title">{title}</h3>
        {headerAction ?? null}
      </div>
      {children}
    </div>
  );
}
