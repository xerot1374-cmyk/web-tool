import Link from "next/link";

export default function AccountPage() {
  return (
    <main className="app-container">
      <div className="content-wrapper">

        <h1 className="main-heading">Social Media Content Tool</h1>
        <p className="description">
          Create engaging content for your social media platforms with ease. Choose your platform to get started.
        </p>

        <div className="button-container">
          <Link href="/account/linkedin" className="social-button linkedin-button">
            LinkedIn
          </Link>
          <Link href="/account/instagram" className="social-button instagram-button">
            Instagram
          </Link>
        </div>
      </div>
    </main>
  );
}
