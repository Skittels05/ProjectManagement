import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useI18n } from "../../shared/i18n";
import "./HomePage.css";

const FEATURE_KEYS = ["projects", "sprints", "kanban", "analytics"] as const;

export function HomePage() {
  const { t } = useI18n();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="home-page">
      <section className="home-hero hero-card">
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1 className="home-title">{t("home.title")}</h1>
        <p className="home-lead muted">{t("home.lead")}</p>
        <div className="home-cta">
          {isAuthenticated ? (
            <Link to="/projects" className="primary-button">
              {t("home.goToProjects")}
            </Link>
          ) : (
            <>
              <Link to="/login" className="primary-button">
                {t("home.signIn")}
              </Link>
              <Link to="/register" className="secondary-button">
                {t("home.createAccount")}
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="home-features" aria-labelledby="home-features-heading">
        <h2 id="home-features-heading">{t("home.featuresTitle")}</h2>
        <ul className="home-features-grid">
          {FEATURE_KEYS.map((key) => (
            <li key={key} className="home-feature-card">
              <h3>{t(`home.feature.${key}.title`)}</h3>
              <p className="muted">{t(`home.feature.${key}.desc`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-about hero-card">
        <h2>{t("home.aboutTitle")}</h2>
        <p className="muted">{t("home.aboutDesc")}</p>
      </section>
    </div>
  );
}
