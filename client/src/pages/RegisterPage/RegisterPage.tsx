import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterMutation } from "../../store/api/authApi";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { AuthCardLayout } from "../../components/AuthCardLayout/AuthCardLayout";
import { useI18n } from "../../shared/i18n";

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [register, { isLoading }] = useRegisterMutation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await register({ fullName, email, password }).unwrap();
      navigate("/");
    } catch (e) {
      setError(getRtkQueryErrorMessage(e));
    }
  }

  return (
    <AuthCardLayout
      eyebrow={t("auth.getStarted")}
      title={t("auth.createAccountTitle")}
      description={t("auth.createAccountDesc")}
      footer={
        <p className="muted">
          {t("auth.alreadyRegistered")} <Link to="/login">{t("auth.signIn")}</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
        <label>
          {t("auth.fullName")}
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={t("auth.fullNamePlaceholder")}
            minLength={2}
            required
          />
        </label>
        <label>
          {t("auth.email")}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("auth.registerEmailPlaceholder")}
            required
          />
        </label>
        <label>
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("auth.passwordMinPlaceholder")}
            minLength={6}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={isLoading}>
          {isLoading ? t("auth.creatingAccount") : t("auth.register")}
        </button>
      </form>
    </AuthCardLayout>
  );
}
