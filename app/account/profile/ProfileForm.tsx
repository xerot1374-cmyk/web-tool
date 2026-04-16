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
    <div style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Edit profile</h1>

      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <Image
          src={previewUrl}
          alt="Profile"
          width={88}
          height={88}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{name || "Your name"}</div>
          <div style={{ color: "#666" }}>{role || "Your role"}</div>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 10, border: "1px solid #f99", marginBottom: 12 }}>{error}</div>
      ) : null}

      {success ? (
        <div style={{ padding: 10, border: "1px solid #9f9", marginBottom: 12 }}>{success}</div>
      ) : null}

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Name and family"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="New password (optional)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setProfileImage(file);
              if (file) {
                setPreviewUrl(URL.createObjectURL(file));
              }
            }}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
