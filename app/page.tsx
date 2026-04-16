import Link from "next/link";

export default function Home() {
  return (
    <main className="app-container">
      <div className="content-wrapper">
        <h1 className="main-heading">Welcome</h1>

        <div className="button-container">
          <Link href="/login" className="social-button linkedin-button">
            Login
          </Link>

          <Link href="/register" className="social-button instagram-button">
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
