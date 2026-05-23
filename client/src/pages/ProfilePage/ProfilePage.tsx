import { type FormEvent, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useChangePasswordMutation, useUpdateProfileMutation } from "../../store/api/authApi";
import { useAppDispatch } from "../../store/hooks";
import { resetToDefaults } from "../../store/slices/settingsSlice";
import { useConfirm } from "../../components/ConfirmDialog/confirmContext";
import { useToast } from "../../components/Toast/toastContext";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { clearUiPreferencesStorage } from "../../shared/lib/uiPreferencesStorage";
import { useI18n } from "../../shared/i18n";
import "./ProfilePage.css";

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useI18n();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [updateProfile, { isLoading: profileSaving }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: passwordSaving }] = useChangePasswordMutation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setEmail(user.email);
  }, [user]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    try {
      await updateProfile({ fullName: fullName.trim(), email: email.trim() }).unwrap();
      toast.success(t("toast.profileSaved"));
    } catch (err) {
      setProfileError(getRtkQueryErrorMessage(err));
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.passwordMismatch"));
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("toast.passwordChanged"));
    } catch (err) {
      setPasswordError(getRtkQueryErrorMessage(err));
    }
  }

  async function handleResetUi() {
    const confirmed = await confirm({ message: t("profile.resetUiConfirm") });
    if (!confirmed) return;
    clearUiPreferencesStorage();
    dispatch(resetToDefaults());
    toast.success(t("toast.uiReset"));
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <header className="profile-page-header hero-card">
        <p className="eyebrow">{t("profile.eyebrow")}</p>
        <h1>{t("profile.title")}</h1>
        <p className="muted">{t("profile.description")}</p>
      </header>

      <section className="profile-card hero-card">
        <h2>{t("profile.accountTitle")}</h2>
        <p className="muted profile-card-desc">{t("profile.accountDesc")}</p>
        <form className="auth-form profile-form" onSubmit={(e) => void handleProfileSubmit(e)}>
          <label>
            {t("profile.fullName")}
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label>
            {t("profile.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {profileError ? <p className="form-error">{profileError}</p> : null}
          <button type="submit" disabled={profileSaving}>
            {profileSaving ? t("profile.savingAccount") : t("profile.saveAccount")}
          </button>
        </form>
      </section>

      <section className="profile-card hero-card">
        <h2>{t("profile.passwordTitle")}</h2>
        <p className="muted profile-card-desc">{t("profile.passwordDesc")}</p>
        <form className="auth-form profile-form" onSubmit={(e) => void handlePasswordSubmit(e)}>
          <label>
            {t("profile.currentPassword")}
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              minLength={6}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            {t("profile.newPassword")}
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            {t("profile.confirmPassword")}
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
            />
          </label>
          {passwordError ? <p className="form-error">{passwordError}</p> : null}
          <button type="submit" disabled={passwordSaving}>
            {passwordSaving ? t("profile.changingPassword") : t("profile.changePassword")}
          </button>
        </form>
      </section>

      <section className="profile-card hero-card">
        <h2>{t("profile.uiTitle")}</h2>
        <p className="muted profile-card-desc">{t("profile.uiDesc")}</p>
        <button type="button" className="secondary-button" onClick={() => void handleResetUi()}>
          {t("profile.resetUi")}
        </button>
      </section>
    </div>
  );
}
