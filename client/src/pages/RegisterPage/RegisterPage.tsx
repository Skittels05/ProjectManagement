import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterMutation } from "../../store/api/authApi";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { AuthCardLayout } from "../../components/AuthCardLayout/AuthCardLayout";

export function RegisterPage() {
  const navigate = useNavigate();
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
      eyebrow="Get started"
      title="Create your account"
      description="Register to manage Scrum projects, sprints and team activity in one place."
      footer={
        <p className="muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
        <label>
          Full name
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Alex Scrum Master"
            minLength={2}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="alex@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Register"}
        </button>
      </form>
    </AuthCardLayout>
  );
}
