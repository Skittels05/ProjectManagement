import "./DashboardHeroCard.css";

type DashboardHeroCardProps = {
  displayName: string;
};

export function DashboardHeroCard({ displayName }: DashboardHeroCardProps) {
  return (
    <div className="hero-card">
      <p className="eyebrow">Dashboard</p>
      <h2>Welcome, {displayName}</h2>
      <p className="muted">Create a project to start planning sprints and backlog.</p>
    </div>
  );
}
