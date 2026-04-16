"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProfileFormProps = {
  initialUser: {
    email: string;
    name: string;
    role: string;
    profileImage: string;
  };
};

export default function ProfileForm({ initialUser }: ProfileFormProps) {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState(initialUser.email);
  const [name, setName] = useState(initialUser.name);
  const [role, setRole] = useState(initialUser.role);
  const [email, setEmail] = useState(initialUser.email);
  const [password, setPassword] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUser.profileImage);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("currentEmail", currentEmail);
    formData.append("name", name);
    formData.append("role", role);
    formData.append("email", email);

    if (password) {
      formData.append("password", password);
    }

    if (profileImage) {
      formData.append("profileImage", profileImage);
    }

    const res = await fetch("/api/account/profile", {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Profile update failed");
      return;
    }

    const body = (await res.json()) as {
      user: { email: string; name: string; role: string; profileImage: string };
    };

    setPassword("");
    setSuccess("Profile saved");
    setCurrentEmail(body.user.email);
    setEmail(body.user.email);
    setName(body.user.name);
    setRole(body.user.role);
    setPreviewUrl(body.user.profileImage);
    router.refresh();
  }

  return (
    <section className="portal-profile">
      <div className="portal-profile__header">
        <div>
          <p className="portal-eyebrow">Profile</p>
          <h1 className="portal-profile__title">Edit your account details</h1>
          <p className="portal-profile__text">
            Keep your public role, contact details, and profile image up to date across the
            workspace.
          </p>
        </div>
      </div>

      <div className="portal-profile__card">
        <div className="portal-profile__identity">
        <Image
          src={previewUrl}
          alt="Profile"
          width={88}
          height={88}
          className="portal-profile__avatar"
        />
          <div>
            <div className="portal-profile__name">{name || "Your name"}</div>
            <div className="portal-profile__role">{role || "Your role"}</div>
          </div>
        </div>

        {error ? <div className="portal-alert portal-alert--error">{error}</div> : null}

        {success ? <div className="portal-alert portal-alert--success">{success}</div> : null}

        <form onSubmit={onSubmit} className="portal-form">
          <div className="portal-form__grid">
            <label className="portal-form__field">
              <span className="portal-form__label">Name and family</span>
              <input
                className="portal-form__input"
                placeholder="Name and family"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="portal-form__field">
              <span className="portal-form__label">Role</span>
              <input
                className="portal-form__input"
                placeholder="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </label>

            <label className="portal-form__field">
              <span className="portal-form__label">Email</span>
              <input
                className="portal-form__input"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="portal-form__field">
              <span className="portal-form__label">New password</span>
              <input
                className="portal-form__input"
                placeholder="New password (optional)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="portal-form__field portal-form__field--full">
              <span className="portal-form__label">Profile image</span>
              <input
                className="portal-form__input portal-form__input--file"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setProfileImage(file);
                  if (file) {
                    setPreviewUrl(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          </div>

          <button type="submit" disabled={loading} className="portal-form__submit">
            {loading ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>
    </section>
  );
}
