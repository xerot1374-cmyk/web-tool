import Image from "next/image";

type TemplateBaseProps = {
  headline: string;
  subline: string;
  body: string;
  cta: string;
  variant?: string;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  eyeCatcher?: string;
};

export default function TemplateBase({
  headline,
  subline,
  body,
  cta,
  variant = "template-style-1",
  userName,
  userRole,
  userAvatar,
  eyeCatcher,
}: TemplateBaseProps) {
  return (
    <div className={`template-card ${variant}`}>
      {/* Top: logo + eye catcher + user */}
      <div className="template-top-row">
        {/* Left: logo + eye catcher */}
        <div className="template-top-left">
          <div className="logo-row">
            <Image
              src="/protos-logo.png"   // public/protos-logo.png
              alt="Protos 3D"
              width={120}
              height={26}
            />
          </div>
          <div className="eye-catcher-pill">
            {eyeCatcher || "Neues Highlight"}
          </div>
        </div>

        {/* Right: name + role + avatar */}
        {userName && (
          <div className="template-top-right">
            <div className="user-meta">
              <div className="user-name">{userName}</div>
              <div className="user-role">{userRole}</div>
            </div>

            <div className="user-avatar">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  fill
                  sizes="64px"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <span className="avatar-fallback">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main card content */}
      <div className="template-content">
        <h2 className="template-title-main">{headline}</h2>
        <p className="template-subline">{subline}</p>
        <p className="template-body">{body}</p>

        <div className="template-footer-note">
          <span>ðŸ”— Weitere Infos bei Protos 3D</span>
        </div>
      </div>
    </div>
  );
}
