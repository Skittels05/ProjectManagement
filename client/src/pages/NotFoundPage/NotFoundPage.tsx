import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useI18n } from "../../shared/i18n";
import "./NotFoundPage.css";

export function NotFoundPage() {
  const { t } = useI18n();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <section className="page not-found-page">
      <div className="not-found-card hero-card">
        <p className="not-found-code" aria-hidden="true">
          404
        </p>
        <p className="eyebrow">{t("notFound.eyebrow")}</p>
        <h1>{t("notFound.title")}</h1>
        <p className="muted not-found-desc">{t("notFound.description")}</p>
        <div className="not-found-actions">
          <Link to="/" className="primary-button">
            {t("notFound.home")}
          </Link>
          {isAuthenticated ? (
            <Link to="/projects" className="secondary-button">
              {t("notFound.projects")}
            </Link>
          ) : (
            <Link to="/login" className="secondary-button">
              {t("notFound.signIn")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
