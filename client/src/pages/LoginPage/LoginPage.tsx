import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLoginMutation } from "../../store/api/authApi";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { AuthCardLayout } from "../../components/AuthCardLayout/AuthCardLayout";
import { useI18n } from "../../shared/i18n";

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await login({ email, password }).unwrap();
      navigate("/");
    } catch (e) {
      setError(getRtkQueryErrorMessage(e));
    }
  }

  return (
    <AuthCardLayout
      eyebrow={t("auth.welcomeBack")}
      title={t("auth.signInTitle")}
      description={t("auth.signInDesc")}
      footer={
        <p className="muted">
          {t("auth.noAccount")} <Link to="/register">{t("auth.createOne")}</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
        <label>
          {t("auth.email")}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            required
          />
        </label>
        <label>
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("auth.passwordPlaceholder")}
            minLength={6}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={isLoading}>
          {isLoading ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>
    </AuthCardLayout>
  );
}
