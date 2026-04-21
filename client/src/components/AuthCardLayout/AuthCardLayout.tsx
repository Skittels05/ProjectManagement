import type { ReactNode } from "react";
import "./AuthCardLayout.css";

type AuthCardLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCardLayout({ eyebrow, title, description, children, footer }: AuthCardLayoutProps) {
  return (
    <section className="page auth-page">
      <div className="auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        {children}
        <div className="auth-card-footer">{footer}</div>
      </div>
    </section>
  );
}
