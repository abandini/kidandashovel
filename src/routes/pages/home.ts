import type { Env } from '../../types';

/**
 * Landing page HTML
 * Senior-friendly design with large fonts, high contrast, clear CTAs
 */
export function landingPage(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Kid and a Shovel - Snow Removal by Local Teens</title>
  <meta name="description" content="Connect with verified local teens for reliable snow removal in Northeast Ohio. Support young entrepreneurs in your neighborhood.">
  <link rel="icon" type="image/png" href="/icons/favicon.png">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 18px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #f8fafc;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Header */
    header {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #2563eb;
      text-decoration: none;
    }

    .nav-links {
      display: flex;
      gap: 24px;
      align-items: center;
    }

    .nav-links a {
      color: #475569;
      text-decoration: none;
      font-weight: 500;
    }

    .nav-links a:hover {
      color: #2563eb;
    }

    .btn {
      display: inline-block;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      min-height: 52px;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: white;
      color: #2563eb;
      border: 2px solid #2563eb;
    }

    .btn-secondary:hover {
      background: #eff6ff;
    }

    .btn-large {
      padding: 18px 36px;
      font-size: 20px;
      min-height: 60px;
    }

    /* Hero */
    .hero {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 80px 0;
      text-align: center;
    }

    .hero h1 {
      font-size: clamp(32px, 5vw, 48px);
      font-weight: 700;
      margin-bottom: 24px;
      line-height: 1.2;
    }

    .hero p {
      font-size: clamp(18px, 3vw, 22px);
      max-width: 700px;
      margin: 0 auto 40px;
      opacity: 0.95;
    }

    .hero-buttons {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .hero .btn-primary {
      background: white;
      color: #2563eb;
    }

    .hero .btn-primary:hover {
      background: #f1f5f9;
    }

    .hero .btn-secondary {
      background: transparent;
      color: white;
      border-color: white;
    }

    .hero .btn-secondary:hover {
      background: rgba(255,255,255,0.1);
    }

    /* How it works */
    .section {
      padding: 80px 0;
    }

    .section-title {
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 48px;
      color: #1e293b;
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 40px;
    }

    .step {
      text-align: center;
      padding: 32px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }

    .step-number {
      width: 60px;
      height: 60px;
      background: #2563eb;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      margin: 0 auto 20px;
    }

    .step h3 {
      font-size: 22px;
      margin-bottom: 12px;
      color: #1e293b;
    }

    .step p {
      color: #64748b;
    }

    /* Benefits */
    .benefits {
      background: white;
    }

    .benefits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
    }

    .benefit {
      padding: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    .benefit h3 {
      font-size: 20px;
      margin-bottom: 12px;
      color: #1e293b;
    }

    .benefit p {
      color: #64748b;
    }

    /* CTA */
    .cta {
      background: #1e293b;
      color: white;
      text-align: center;
    }

    .cta h2 {
      font-size: 32px;
      margin-bottom: 24px;
    }

    .cta p {
      font-size: 20px;
      margin-bottom: 32px;
      opacity: 0.9;
    }

    /* Footer */
    footer {
      background: #0f172a;
      color: #94a3b8;
      padding: 40px 0;
      text-align: center;
    }

    footer a {
      color: #94a3b8;
    }

    footer a:hover {
      color: white;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        text-align: center;
      }

      .hero {
        padding: 60px 0;
      }

      .section {
        padding: 60px 0;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="header-content">
        <a href="/" class="logo">A Kid and a Shovel</a>
        <nav class="nav-links">
          <a href="/about">About</a>
          <a href="/faq">FAQ</a>
          <a href="/login" class="btn btn-primary">Sign In</a>
        </nav>
      </div>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <h1>Snow Removal by Local Teens You Can Trust</h1>
        <p>Connect with verified young workers in your Northeast Ohio neighborhood. Get your driveway cleared while supporting the next generation of entrepreneurs.</p>
        <div class="hero-buttons">
          <a href="/signup/homeowner" class="btn btn-primary btn-large">I Need Snow Removal</a>
          <a href="/signup/teen" class="btn btn-secondary btn-large">I Want to Work</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 class="section-title">How It Works</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Post a Job</h3>
            <p>Tell us about your driveway and when you need it cleared. Set your price or accept offers from workers.</p>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>Get Matched</h3>
            <p>Browse verified teen workers in your area or let them come to you. Check ratings and reviews.</p>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <h3>Relax</h3>
            <p>Your worker takes before/after photos. Pay in cash or card. Leave a review to help others.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section benefits">
      <div class="container">
        <h2 class="section-title">Why Choose Us</h2>
        <div class="benefits-grid">
          <div class="benefit">
            <h3>Verified Workers</h3>
            <p>Every teen worker has parental consent and is verified. See their ratings and reviews before hiring.</p>
          </div>
          <div class="benefit">
            <h3>Photo Proof</h3>
            <p>Before and after photos are required for every job. See exactly what was done.</p>
          </div>
          <div class="benefit">
            <h3>Fair Pricing</h3>
            <p>Set your own price or let workers make offers. No hidden fees for cash payments.</p>
          </div>
          <div class="benefit">
            <h3>Support Local Youth</h3>
            <p>Help teens in your community learn responsibility, earn money, and build work experience.</p>
          </div>
          <div class="benefit">
            <h3>Senior Friendly</h3>
            <p>Easy to use website designed for everyone. Large text, simple navigation, phone support.</p>
          </div>
          <div class="benefit">
            <h3>Weather Alerts</h3>
            <p>Get notified when snow is coming. Book a worker before they fill up.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section cta">
      <div class="container">
        <h2>Ready to Get Started?</h2>
        <p>Join hundreds of Northeast Ohio neighbors connecting through snow removal.</p>
        <div class="hero-buttons">
          <a href="/signup/homeowner" class="btn btn-primary btn-large">Find a Worker</a>
          <a href="/signup/teen" class="btn btn-secondary btn-large">Start Earning</a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="container">
      <div class="footer-links">
        <a href="/about">About Us</a>
        <a href="/faq">FAQ</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="mailto:contact@akidandashovel.com">Contact</a>
      </div>
      <p>&copy; ${new Date().getFullYear()} A Kid and a Shovel. Serving Northeast Ohio.</p>
    </div>
  </footer>
</body>
</html>`;
}
