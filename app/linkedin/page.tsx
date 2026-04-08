import Link from "next/link";

export default function LinkedInPage() {
  return (
    <main className="app-container">
      <div className="content-wrapper">
        <h1 className="main-heading">LinkedIn Templates</h1>
        <p className="description">
          Wählen Sie ein Template für Ihren LinkedIn-Post.
        </p>

        <div className="template-grid">
          {/* TEMPLATE A */}
          <Link href="/linkedin/template-a" className="template-card">
            <div>
              <div className="template-title">
                Template A – Clean Product Highlight
              </div>
              <div className="template-desc">
                Minimal, weiß, modern. Perfekt für Produktvorstellung.
              </div>
            </div>
          </Link>

          {/* TEMPLATE B */}
          <Link href="/linkedin/template-b" className="template-card">
            <div>
              <div className="template-title">
                Template B – Dark Bold Layout
              </div>
              <div className="template-desc">
                Dunkler Hintergrund, starke Headline für Statements.
              </div>
            </div>
          </Link>

          {/* Produktvorstellung (قدیمی) */}
          <Link href="/linkedin/product-intro" className="template-card">
            <div>
              <div className="template-tag">Awareness</div>
              <div className="template-title">Produktvorstellung</div>
              <div className="template-desc">
                Kurz und klar ein neues Produkt oder Feature highlighten.
              </div>
              <div className="template-meta">Format: Bild + kurzer Text</div>
            </div>
          </Link>

          {/* Kunden-Feedback */}
          <div className="template-card">
            <div className="template-tag">Social Proof</div>
            <div className="template-title">Kunden-Feedback</div>
            <div className="template-desc">
              Zitat oder Review von Kund:innen mit Branding des Unternehmens.
            </div>
            <div className="template-meta">Format: Zitat + Logo</div>
          </div>

          {/* Event */}
          <div className="template-card">
            <div className="template-tag">Event</div>
            <div className="template-title">Event-Ankündigung</div>
            <div className="template-desc">
              Datum, Ort und Key-Facts zu einem Event übersichtlich darstellen.
            </div>
            <div className="template-meta">Format: Header + Details</div>
          </div>
        </div>
      </div>
    </main>
  );
}
