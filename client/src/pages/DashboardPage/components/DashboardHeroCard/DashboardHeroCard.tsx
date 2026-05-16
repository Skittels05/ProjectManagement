import { useI18n } from "../../../../shared/i18n";
import "./DashboardHeroCard.css";

type DashboardHeroCardProps = {
  displayName: string;
};

export function DashboardHeroCard({ displayName }: DashboardHeroCardProps) {
  const { t } = useI18n();

  return (
    <div className="hero-card">
      <p className="eyebrow">{t("dashboard.eyebrow")}</p>
      <h2>{t("dashboard.welcome", { name: displayName })}</h2>
      <p className="muted">{t("dashboard.heroDesc")}</p>
    </div>
  );
}
