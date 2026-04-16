import Link from "next/link";

export default function AccountPage() {
  return (
    <main className="app-container portal-shell">
      <div className="portal-wrapper">
        <div className="portal-hero">
          <div>
            <p className="portal-eyebrow">User Portal</p>
            <h1 className="main-heading portal-heading">Manage your content workspace</h1>
            <p className="description portal-description">
              Open your profile, review activity and insights, or jump straight into the
              template editor from one place.
            </p>
          </div>

          <div className="portal-hero-panel">
            <div className="portal-hero-label">Quick Access</div>
            <div className="portal-hero-value">3 core areas</div>
            <div className="portal-hero-meta">Profile, analytics, and content creation</div>
          </div>
        </div>

        <section className="portal-grid">
          <Link href="/account/profile" className="portal-card">
            <div className="portal-card-tag">Profile</div>
            <h2 className="portal-card-title">Edit your account</h2>
            <p className="portal-card-text">
              Update your name, role, email, password, and profile image.
            </p>
            <div className="portal-card-link">Open profile</div>
          </Link>

          <Link href="/account/analytics" className="portal-card">
            <div className="portal-card-tag">Data Analysis</div>
            <h2 className="portal-card-title">Activities and insights</h2>
            <p className="portal-card-text">
              Review all activities for LinkedIn posts and Instagram posts or stories, then
              open the insight panels.
            </p>
            <div className="portal-card-link">Open analytics</div>
          </Link>

          <Link href="/account/linkedin/template-a" className="portal-card">
            <div className="portal-card-tag">Template Editor</div>
            <h2 className="portal-card-title">Create new content</h2>
            <p className="portal-card-text">
              Launch the main LinkedIn template editor directly and continue working without
              extra route hops.
            </p>
            <div className="portal-card-link">Open editor</div>
          </Link>
        </section>

        <section className="portal-strip">
          <div className="portal-strip-card">
            <div className="portal-strip-label">All activities</div>
            <div className="portal-strip-value">LinkedIn Posts</div>
          </div>
          <div className="portal-strip-card">
            <div className="portal-strip-label">Instagram</div>
            <div className="portal-strip-value">Posts</div>
          </div>
          <div className="portal-strip-card">
            <div className="portal-strip-label">Instagram</div>
            <div className="portal-strip-value">Stories</div>
          </div>
          <div className="portal-strip-card">
            <div className="portal-strip-label">Next step</div>
            <div className="portal-strip-value">See insights</div>
          </div>
        </section>
      </div>
    </main>
  );
}
