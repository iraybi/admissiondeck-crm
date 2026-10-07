import Link from "next/link";
import { Button } from "@/components/ui/Button";
import styles from "./landing.module.css";

export default function LandingPage() {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.mark}>AD</span>
          <span className={styles.name}>AdmissionDeck</span>
        </div>
        <nav className={styles.nav}>
          <Link href="#features">Features</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="#contact">Contact</Link>
          <Link href="/login" className={styles.loginBtn}>
            <Button variant="secondary" size="sm">Sign in</Button>
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <h1>
            Every student journey,
            <br />
            under one roof.
          </h1>
          <p>
            AdmissionDeck CRM connects firms, agencies, counsellors, agents,
            and students in one secure platform. Manage leads, applications,
            documents, and payments with full visibility at every level.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register">
              <Button>Start free trial</Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary">Contact us</Button>
            </Link>
          </div>
        </section>

        <section id="features" className={styles.features}>
          <h2>Built for international education consulting</h2>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <h3>Multi-tenant hierarchy</h3>
              <p>
                Firms manage agencies, agencies manage staff, everyone sees
                exactly what they need. Row-level security enforced at the
                database.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>Lead to student pipeline</h3>
              <p>
                Capture leads, invite them to join, convert to students with
                one click. Full audit trail from first contact to enrollment.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>Document management</h3>
              <p>
                Configurable requirements per country and university. Built-in
                malware scanning. Quarantine workflow for safety.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>Payment verification</h3>
              <p>
                Manual payment tracking with state machine. Cheque, SWIFT,
                bank transfer. Full audit compliance.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>Performance analytics</h3>
              <p>
                Agency comparison, counsellor leaderboards, visa rates,
                commission tracking. Know what&apos;s working.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>White-label domains</h3>
              <p>
                Use your own domain for every portal. Students see your brand,
                not ours.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className={styles.pricing}>
          <h2>Simple pricing</h2>
          <p>Every plan starts with a conversation. We&apos;ll find the right fit.</p>
          <div className={styles.pricingGrid}>
            <div className={styles.plan}>
              <h3>Agency</h3>
              <p>For standalone agencies</p>
              <ul>
                <li>Up to 10 seats</li>
                <li>Student management</li>
                <li>Document pipeline</li>
                <li>Payment tracking</li>
                <li>Custom domain</li>
              </ul>
              <Link href="/contact">
                <Button variant="secondary" block>Contact us</Button>
              </Link>
            </div>
            <div className={styles.planFeatured}>
              <h3>Enterprise Firm</h3>
              <p>For multi-agency firms</p>
              <ul>
                <li>Unlimited agencies</li>
                <li>Everything in Agency</li>
                <li>Cross-agency analytics</li>
                <li>Commission management</li>
                <li>Priority support</li>
              </ul>
              <Link href="/contact">
                <Button block>Contact us</Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="contact" className={styles.contact}>
          <h2>Get in touch</h2>
          <p>Tell us about your agency and we&apos;ll set up a demo.</p>
          <Link href="/contact">
            <Button>Contact us</Button>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.brand}>
          <span className={styles.mark}>AD</span>
          <span className={styles.name}>AdmissionDeck</span>
        </div>
        <p className={styles.copyright}>
          &copy; {new Date().getFullYear()} AdmissionDeck. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
