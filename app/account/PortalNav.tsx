"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type PortalNavProps = {
  isAuthenticated: boolean;
};

const navItems = [
  { href: "/account", label: "Portal" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/analytics", label: "Data Analysis" },
  { href: "/account/linkedin/template-a", label: "Template Editor" },
];

export default function PortalNav({ isAuthenticated }: PortalNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAuthAction() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Sign out failed");
      }

      router.replace("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <nav className="portal-nav" aria-label="Portal navigation">
      <div className="portal-nav__brand">
        <span className="portal-nav__eyebrow">Workspace</span>
        <span className="portal-nav__title">User Portal</span>
      </div>

      <div className="portal-nav__links">
        {navItems.map((item) => {
          const isActive =
            item.href === "/account"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`portal-nav__link${isActive ? " portal-nav__link--active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        className="portal-nav__auth"
        onClick={handleAuthAction}
        disabled={isSubmitting}
      >
        {isAuthenticated ? (isSubmitting ? "Signing out..." : "Sign out") : "Sign in"}
      </button>
    </nav>
  );
}
