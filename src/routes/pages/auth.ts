import type { Env } from '../../types';

/**
 * Shared CSS for auth pages
 */
const authStyles = `
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
    min-height: 100vh;
  }

  .container {
    max-width: 500px;
    margin: 0 auto;
    padding: 24px;
  }

  header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 16px 0;
    margin-bottom: 40px;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 24px;
    font-weight: 700;
    color: #2563eb;
    text-decoration: none;
  }

  .back-link {
    color: #64748b;
    text-decoration: none;
    font-size: 16px;
  }

  .back-link:hover {
    color: #2563eb;
  }

  .form-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    padding: 40px;
    margin-bottom: 24px;
  }

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
    text-align: center;
  }

  .subtitle {
    text-align: center;
    color: #64748b;
    margin-bottom: 32px;
    font-size: 18px;
  }

  .form-group {
    margin-bottom: 24px;
  }

  label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: #334155;
    font-size: 18px;
  }

  input, select {
    width: 100%;
    padding: 16px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 18px;
    transition: border-color 0.2s;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  input.error {
    border-color: #dc2626;
  }

  .error-message {
    color: #dc2626;
    font-size: 16px;
    margin-top: 6px;
  }

  .field-hint {
    color: #64748b;
    font-size: 14px;
    margin-top: 6px;
  }

  .btn {
    display: block;
    width: 100%;
    padding: 18px 28px;
    border-radius: 8px;
    font-size: 20px;
    font-weight: 600;
    text-decoration: none;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    min-height: 60px;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .switch-link {
    text-align: center;
    margin-top: 24px;
    color: #64748b;
  }

  .switch-link a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 600;
  }

  .switch-link a:hover {
    text-decoration: underline;
  }

  .alert {
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 16px;
  }

  .alert-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .alert-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 600px) {
    .row {
      grid-template-columns: 1fr;
    }

    .form-card {
      padding: 24px;
    }
  }
`;

/**
 * Homeowner registration page
 */
export function homeownerSignupPage(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up - Homeowner | A Kid and a Shovel</title>
  <meta name="description" content="Create an account to find teen workers for snow removal in Northeast Ohio">
  <style>${authStyles}</style>
</head>
<body>
  <header>
    <div class="header-content">
      <a href="/" class="logo">A Kid and a Shovel</a>
      <a href="/" class="back-link">&larr; Back to Home</a>
    </div>
  </header>

  <main class="container">
    <div class="form-card">
      <h1>Create Your Account</h1>
      <p class="subtitle">Find reliable teen workers in your neighborhood</p>

      <div id="alert" class="alert alert-error" style="display: none;"></div>

      <form id="signup-form">
        <input type="hidden" name="type" value="homeowner">

        <div class="form-group">
          <label for="name">Full Name *</label>
          <input type="text" id="name" name="name" required autocomplete="name" placeholder="John Smith">
        </div>

        <div class="form-group">
          <label for="email">Email Address *</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="john@example.com">
        </div>

        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone" autocomplete="tel" placeholder="(216) 555-1234">
          <p class="field-hint">Optional - for text notifications about your jobs</p>
        </div>

        <div class="form-group">
          <label for="password">Password *</label>
          <input type="password" id="password" name="password" required autocomplete="new-password" minlength="8">
          <p class="field-hint">At least 8 characters with a letter and number</p>
        </div>

        <div class="form-group">
          <label for="address">Street Address *</label>
          <input type="text" id="address" name="address" required autocomplete="street-address" placeholder="123 Main Street">
        </div>

        <div class="row">
          <div class="form-group">
            <label for="city">City *</label>
            <input type="text" id="city" name="city" required autocomplete="address-level2" placeholder="Cleveland">
          </div>
          <div class="form-group">
            <label for="zip">ZIP Code *</label>
            <input type="text" id="zip" name="zip" required autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5" placeholder="44101">
          </div>
        </div>

        <div class="form-group">
          <label for="property_type">Property Type</label>
          <select id="property_type" name="property_type">
            <option value="house">Single Family Home</option>
            <option value="duplex">Duplex</option>
            <option value="townhouse">Townhouse</option>
            <option value="condo">Condo</option>
            <option value="apartment">Apartment</option>
          </select>
        </div>

        <div class="form-group">
          <label for="driveway_size">Driveway Size</label>
          <select id="driveway_size" name="driveway_size">
            <option value="">Select size...</option>
            <option value="small">Small (1 car)</option>
            <option value="medium">Medium (2 cars)</option>
            <option value="large">Large (3+ cars)</option>
            <option value="extra_large">Extra Large / Long driveway</option>
          </select>
          <p class="field-hint">Helps workers estimate time and pricing</p>
        </div>

        <button type="submit" class="btn btn-primary" id="submit-btn">Create Account</button>
      </form>

      <p class="switch-link">
        Already have an account? <a href="/login">Sign In</a>
      </p>
    </div>
  </main>

  <script>
    const form = document.getElementById('signup-form');
    const alert = document.getElementById('alert');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alert.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = '/dashboard';
        } else {
          alert.textContent = result.error;
          alert.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      } catch (error) {
        alert.textContent = 'Something went wrong. Please try again.';
        alert.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Teen worker registration page
 */
export function teenSignupPage(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up - Teen Worker | A Kid and a Shovel</title>
  <meta name="description" content="Create an account to start earning money removing snow in Northeast Ohio">
  <style>${authStyles}</style>
</head>
<body>
  <header>
    <div class="header-content">
      <a href="/" class="logo">A Kid and a Shovel</a>
      <a href="/" class="back-link">&larr; Back to Home</a>
    </div>
  </header>

  <main class="container">
    <div class="form-card">
      <h1>Start Earning Money</h1>
      <p class="subtitle">Sign up to shovel snow in your neighborhood</p>

      <div id="alert" class="alert alert-error" style="display: none;"></div>

      <form id="signup-form">
        <input type="hidden" name="type" value="teen">

        <div class="form-group">
          <label for="name">Your Full Name *</label>
          <input type="text" id="name" name="name" required autocomplete="name" placeholder="Alex Johnson">
        </div>

        <div class="form-group">
          <label for="age">Your Age *</label>
          <select id="age" name="age" required>
            <option value="">Select your age...</option>
            <option value="13">13</option>
            <option value="14">14</option>
            <option value="15">15</option>
            <option value="16">16</option>
            <option value="17">17</option>
          </select>
          <p class="field-hint">You must be 13-17 years old to sign up</p>
        </div>

        <div class="form-group">
          <label for="email">Your Email Address *</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="alex@example.com">
        </div>

        <div class="form-group">
          <label for="phone">Your Phone Number</label>
          <input type="tel" id="phone" name="phone" autocomplete="tel" placeholder="(216) 555-1234">
          <p class="field-hint">Optional - for job notifications</p>
        </div>

        <div class="form-group">
          <label for="password">Create Password *</label>
          <input type="password" id="password" name="password" required autocomplete="new-password" minlength="8">
          <p class="field-hint">At least 8 characters with a letter and number</p>
        </div>

        <div class="form-group">
          <label for="address">Your Street Address *</label>
          <input type="text" id="address" name="address" required autocomplete="street-address" placeholder="456 Oak Avenue">
        </div>

        <div class="row">
          <div class="form-group">
            <label for="city">City *</label>
            <input type="text" id="city" name="city" required autocomplete="address-level2" placeholder="Parma">
          </div>
          <div class="form-group">
            <label for="zip">ZIP Code *</label>
            <input type="text" id="zip" name="zip" required autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5" placeholder="44134">
          </div>
        </div>

        <div class="form-group">
          <label for="school_name">School Name</label>
          <input type="text" id="school_name" name="school_name" placeholder="Cleveland High School">
          <p class="field-hint">Optional - helps build your profile</p>
        </div>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;">

        <h3 style="margin-bottom: 16px; color: #1e293b;">Parent/Guardian Information</h3>
        <p class="field-hint" style="margin-bottom: 24px;">We need a parent's email to send a consent request. They must approve before you can accept jobs.</p>

        <div class="form-group">
          <label for="parent_email">Parent/Guardian Email *</label>
          <input type="email" id="parent_email" name="parent_email" required placeholder="parent@example.com">
          <p class="field-hint">We'll send them an email to approve your account</p>
        </div>

        <button type="submit" class="btn btn-primary" id="submit-btn">Create Account</button>
      </form>

      <p class="switch-link">
        Already have an account? <a href="/login">Sign In</a>
      </p>
    </div>
  </main>

  <script>
    const form = document.getElementById('signup-form');
    const alert = document.getElementById('alert');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alert.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      // Convert age to number
      data.age = parseInt(data.age, 10);

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = '/dashboard?welcome=teen';
        } else {
          alert.textContent = result.error;
          alert.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      } catch (error) {
        alert.textContent = 'Something went wrong. Please try again.';
        alert.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Login page
 */
export function loginPage(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In | A Kid and a Shovel</title>
  <meta name="description" content="Sign in to your A Kid and a Shovel account">
  <style>${authStyles}</style>
</head>
<body>
  <header>
    <div class="header-content">
      <a href="/" class="logo">A Kid and a Shovel</a>
      <a href="/" class="back-link">&larr; Back to Home</a>
    </div>
  </header>

  <main class="container">
    <div class="form-card">
      <h1>Welcome Back</h1>
      <p class="subtitle">Sign in to your account</p>

      <div id="alert" class="alert alert-error" style="display: none;"></div>

      <form id="login-form">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="your@email.com">
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required autocomplete="current-password">
        </div>

        <button type="submit" class="btn btn-primary" id="submit-btn">Sign In</button>
      </form>

      <p class="switch-link" style="margin-top: 16px;">
        <a href="/forgot-password">Forgot your password?</a>
      </p>

      <p class="switch-link">
        Don't have an account?<br>
        <a href="/signup/homeowner">Sign up as Homeowner</a> &bull;
        <a href="/signup/teen">Sign up as Teen Worker</a>
      </p>
    </div>
  </main>

  <script>
    const form = document.getElementById('login-form');
    const alert = document.getElementById('alert');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alert.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing In...';

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = '/dashboard';
        } else {
          alert.textContent = result.error;
          alert.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
      } catch (error) {
        alert.textContent = 'Something went wrong. Please try again.';
        alert.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Parent consent page
 */
export function consentPage(env: Env, token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parent Consent | A Kid and a Shovel</title>
  <style>${authStyles}</style>
</head>
<body>
  <header>
    <div class="header-content">
      <a href="/" class="logo">A Kid and a Shovel</a>
    </div>
  </header>

  <main class="container">
    <div class="form-card" id="loading">
      <h1>Loading...</h1>
      <p class="subtitle">Please wait while we load the consent request.</p>
    </div>

    <div class="form-card" id="consent-form" style="display: none;">
      <h1>Parent Consent Request</h1>
      <p class="subtitle" id="consent-info"></p>

      <div id="alert" class="alert" style="display: none;"></div>

      <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <h3 style="margin-bottom: 12px;">What this means:</h3>
        <ul style="color: #64748b; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Your child can accept snow removal jobs in your neighborhood</li>
          <li style="margin-bottom: 8px;">They will be paid in cash or through the platform</li>
          <li style="margin-bottom: 8px;">All jobs require before/after photos</li>
          <li>You can monitor their earnings and activity</li>
        </ul>
      </div>

      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <button class="btn btn-primary" style="flex: 1; min-width: 150px;" onclick="handleConsent(true)" id="approve-btn">
          I Approve
        </button>
        <button class="btn" style="flex: 1; min-width: 150px; background: #f1f5f9; color: #64748b;" onclick="handleConsent(false)" id="decline-btn">
          I Decline
        </button>
      </div>
    </div>

    <div class="form-card" id="result" style="display: none;">
      <div id="result-content"></div>
    </div>
  </main>

  <script>
    const token = '${token}';
    let consentData = null;

    async function loadConsent() {
      try {
        const response = await fetch('/api/auth/consent/' + token);
        const result = await response.json();

        if (result.success) {
          consentData = result.data;
          document.getElementById('consent-info').textContent =
            \`\${result.data.teenName} (age \${result.data.teenAge}) has requested to create an account to work as a snow shoveler.\`;
          document.getElementById('loading').style.display = 'none';
          document.getElementById('consent-form').style.display = 'block';
        } else {
          document.getElementById('loading').innerHTML =
            '<h1>Invalid Link</h1><p class="subtitle">' + result.error + '</p><p><a href="/">Return to Home</a></p>';
        }
      } catch (error) {
        document.getElementById('loading').innerHTML =
          '<h1>Error</h1><p class="subtitle">Could not load consent request. Please try again later.</p>';
      }
    }

    async function handleConsent(approved) {
      const approveBtn = document.getElementById('approve-btn');
      const declineBtn = document.getElementById('decline-btn');
      approveBtn.disabled = true;
      declineBtn.disabled = true;

      try {
        const response = await fetch('/api/auth/consent/' + token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved })
        });

        const result = await response.json();

        document.getElementById('consent-form').style.display = 'none';
        document.getElementById('result').style.display = 'block';

        if (result.success) {
          document.getElementById('result-content').innerHTML = approved
            ? '<h1 style="color: #16a34a;">Thank You!</h1><p class="subtitle">' + result.message + '</p><p><a href="/">Return to Home</a></p>'
            : '<h1>Consent Declined</h1><p class="subtitle">' + result.message + '</p><p><a href="/">Return to Home</a></p>';
        } else {
          document.getElementById('result-content').innerHTML =
            '<h1>Error</h1><p class="subtitle">' + result.error + '</p><p><a href="/">Return to Home</a></p>';
        }
      } catch (error) {
        document.getElementById('result-content').innerHTML =
          '<h1>Error</h1><p class="subtitle">Something went wrong. Please try again.</p><p><a href="/">Return to Home</a></p>';
        document.getElementById('consent-form').style.display = 'none';
        document.getElementById('result').style.display = 'block';
      }
    }

    loadConsent();
  </script>
</body>
</html>`;
}

/**
 * Simple dashboard placeholder
 */
export function dashboardPage(env: Env, userName: string, userType: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard | A Kid and a Shovel</title>
  <style>${authStyles}
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .user-info {
      color: #64748b;
    }
    .welcome-card {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 32px;
      border-radius: 16px;
      margin-bottom: 24px;
    }
    .welcome-card h2 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .action-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
    }
    .action-card:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }
    .action-card h3 {
      color: #1e293b;
      margin-bottom: 8px;
    }
    .action-card p {
      color: #64748b;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-content">
      <a href="/" class="logo">A Kid and a Shovel</a>
      <div class="user-info">
        ${userName} &bull; <a href="#" onclick="logout()">Sign Out</a>
      </div>
    </div>
  </header>

  <main class="container" style="max-width: 800px;">
    <div class="welcome-card">
      <h2>Welcome, ${userName}!</h2>
      <p>You're signed in as a ${userType === 'homeowner' ? 'Homeowner' : userType === 'teen' ? 'Teen Worker' : 'Parent'}.</p>
    </div>

    <div class="action-grid">
      ${userType === 'homeowner' ? `
        <a href="/jobs/post" class="action-card">
          <h3>Post a Job</h3>
          <p>Request snow removal for your property</p>
        </a>
        <a href="/jobs" class="action-card">
          <h3>My Jobs</h3>
          <p>View and manage your job postings</p>
        </a>
        <a href="/workers" class="action-card">
          <h3>Find Workers</h3>
          <p>Browse available teen workers nearby</p>
        </a>
        <a href="/profile" class="action-card">
          <h3>My Profile</h3>
          <p>Update your address and preferences</p>
        </a>
      ` : `
        <a href="/jobs/available" class="action-card">
          <h3>Available Jobs</h3>
          <p>Browse jobs near you</p>
        </a>
        <a href="/jobs/my" class="action-card">
          <h3>My Jobs</h3>
          <p>View jobs you've claimed</p>
        </a>
        <a href="/earnings" class="action-card">
          <h3>My Earnings</h3>
          <p>Track your income and savings goals</p>
        </a>
        <a href="/profile" class="action-card">
          <h3>My Profile</h3>
          <p>Update your profile and availability</p>
        </a>
      `}
    </div>
  </main>

  <script>
    async function logout() {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/';
    }
  </script>
</body>
</html>`;
}
