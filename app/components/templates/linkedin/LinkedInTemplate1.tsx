"use client";

import Image from "next/image";
import { useRef } from "react";

type LinkedInTemplate1Props = {
  profileImage: string;
  name: string;
  role: string;
  title: string;
  body: string;
  link?: string;
  companyLogo: string;
};

export default function LinkedInTemplate1({
  profileImage,
  name,
  role,
  title,
  body,
  link,
  companyLogo,
}: LinkedInTemplate1Props) {
  const templateRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={templateRef} style={{ padding: 16 }}>
      <div
        style={{
          width: 1200,
          height: 628,
          padding: 40,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          borderRadius: 16,
          border: "1px solid #ddd",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Image
              src={profileImage}
              alt={name}
              width={64}
              height={64}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />

            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>{name}</div>
              <div style={{ fontSize: 14, color: "#666" }}>{role}</div>
            </div>
          </div>

          <Image
            src={companyLogo}
            alt="Company Logo"
            width={160}
            height={48}
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Content */}
        <div style={{ marginTop: 8 }}>
          <h1 style={{ fontSize: 28, margin: 0, marginBottom: 14 }}>{title}</h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {body}
          </p>

          {link ? (
            <div style={{ marginTop: 16 }}>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#0A66C2",
                  fontSize: 16,
                  textDecoration: "underline",
                  wordBreak: "break-all",
                }}
              >
                {link}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
