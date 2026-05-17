import "./Preloader.css";

export type PreloaderProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Preloader({ label, size = "md", className }: PreloaderProps) {
  const rootClass = ["preloader", `preloader--${size}`, className].filter(Boolean).join(" ");

  return (
    <div className={rootClass} role="status" aria-live="polite" aria-busy="true">
      <span className="preloader-spinner" aria-hidden="true" />
      {label ? <span className="preloader-label">{label}</span> : null}
    </div>
  );
}

export type PageLoaderProps = {
  label?: string;
  className?: string;
};

export function PageLoader({ label, className }: PageLoaderProps) {
  return (
    <div className={["page-loader", className].filter(Boolean).join(" ")}>
      <Preloader label={label} size="lg" />
    </div>
  );
}
