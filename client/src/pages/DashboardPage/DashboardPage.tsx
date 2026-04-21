import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchProjects } from "../../store/thunks/projectsThunks";
import { CreateProjectForm } from "./components/CreateProjectForm/CreateProjectForm";
import { DashboardHeroCard } from "./components/DashboardHeroCard/DashboardHeroCard";
import { ProjectListPanel } from "./components/ProjectListPanel/ProjectListPanel";
import "./DashboardPage.css";

export function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    void dispatch(fetchProjects());
  }, [dispatch]);

  return (
    <section className="page dashboard-page">
      <DashboardHeroCard displayName={user?.fullName ?? user?.email ?? ""} />
      <CreateProjectForm />
      <ProjectListPanel />
    </section>
  );
}
