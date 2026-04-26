import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLoginMutation } from "../../store/api/authApi";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { AuthCardLayout } from "../../components/AuthCardLayout/AuthCardLayout";

export function LoginPage() {
  const navigate = useNavigate();
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
      eyebrow="Welcome back"
      title="Sign in to continue"
      description="Use your account to access projects, sprint planning and reports."
      footer={
        <p className="muted">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teamlead@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            minLength={6}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthCardLayout>
  );
}
