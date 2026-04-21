import type { ReactNode } from "react";
import "./ProjectPanel.css";

type ProjectPanelProps = {
  title: string;
  children: ReactNode;
};

export function ProjectPanel({ title, children }: ProjectPanelProps) {
  return (
    <div className="project-panel">
      <h3 className="panel-title">{title}</h3>
      {children}
    </div>
  );
}
