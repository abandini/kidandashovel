// Home and landing page routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { layout, renderStars } from '../../templates/layout';
import { authMiddleware, getCurrentUser } from '../../middleware/auth';

const pages = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
pages.use('*', authMiddleware());

// Landing page
pages.get('/', (c) => {
  const user = getCurrentUser(c);

  // If logged in, redirect to appropriate dashboard
  if (user) {
    if (user.type === 'teen') {
      return c.redirect('/worker/dashboard');
    } else {
      return c.redirect('/dashboard');
    }
  }

  const html = layout(`
    <section class="hero text-center" style="padding: 4rem 0;">
      <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">
        Snow Removal Made Simple
      </h1>
      <p style="font-size: 1.25rem; color: var(--text-light); max-width: 600px; margin: 0 auto 2rem;">
        Connect with verified local teens for reliable snow removal in Northeast Ohio.
        Safe, simple, and supporting young entrepreneurs.
      </p>
      <div class="flex gap-2" style="justify-content: center;">
        <a href="/signup/homeowner" class="btn btn-primary btn-lg">I Need Snow Removed</a>
        <a href="/signup/teen" class="btn btn-secondary btn-lg">I Want to Shovel</a>
      </div>
    </section>

    <section class="mt-4">
      <h2 class="text-center mb-4">How It Works</h2>
      <div class="grid grid-3">
        <div class="card text-center">
          <div style="font-size: 2rem; margin-bottom: 1rem;">📍</div>
          <h3>Find Local Help</h3>
          <p class="text-light">Browse verified teen workers in your neighborhood or post a job for them to find.</p>
        </div>
        <div class="card text-center">
          <div style="font-size: 2rem; margin-bottom: 1rem;">📸</div>
          <h3>Before & After Photos</h3>
          <p class="text-light">Every job includes photo documentation so you can see the quality of work.</p>
        </div>
        <div class="card text-center">
          <div style="font-size: 2rem; margin-bottom: 1rem;">⭐</div>
          <h3>Build Trust</h3>
          <p class="text-light">Two-way ratings help build a trusted community of workers and homeowners.</p>
        </div>
      </div>
    </section>

    <section class="mt-4">
      <div class="grid grid-2">
        <div class="card">
          <h3 class="mb-2">For Homeowners</h3>
          <ul style="list-style: none; line-height: 2;">
            <li>✓ Browse verified local teen workers</li>
            <li>✓ Post jobs and receive offers</li>
            <li>✓ Pay with cash or card</li>
            <li>✓ See before/after photos</li>
            <li>✓ Rate and review workers</li>
            <li>✓ Get snow alerts</li>
          </ul>
          <a href="/signup/homeowner" class="btn btn-primary mt-2">Sign Up as Homeowner</a>
        </div>
        <div class="card">
          <h3 class="mb-2">For Teen Workers</h3>
          <ul style="list-style: none; line-height: 2;">
            <li>✓ Create your worker profile</li>
            <li>✓ Set your own prices</li>
            <li>✓ Choose your service area</li>
            <li>✓ Build your reputation</li>
            <li>✓ Track your earnings</li>
            <li>✓ Learn financial skills</li>
          </ul>
          <a href="/signup/teen" class="btn btn-primary mt-2">Sign Up as Worker</a>
        </div>
      </div>
    </section>

    <section class="mt-4">
      <h2 class="text-center mb-4">Safety First</h2>
      <div class="card">
        <div class="grid grid-2">
          <div>
            <h4>Parent-Verified Workers</h4>
            <p class="text-light">All teen workers require parental consent before they can accept jobs.</p>
          </div>
          <div>
            <h4>Photo Documentation</h4>
            <p class="text-light">Before and after photos for every job provide transparency and quality assurance.</p>
          </div>
          <div>
            <h4>Two-Way Reviews</h4>
            <p class="text-light">Both parties rate each other, building trust in the community.</p>
          </div>
          <div>
            <h4>Local Focus</h4>
            <p class="text-light">Serving Northeast Ohio communities where neighbors know neighbors.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-4 text-center" style="padding: 3rem 0;">
      <h2 class="mb-2">Ready to Get Started?</h2>
      <p class="text-light mb-4">Join hundreds of Northeast Ohio families using A Kid and a Shovel</p>
      <a href="/signup/homeowner" class="btn btn-primary btn-lg">Get Started Free</a>
    </section>
  `, {
    title: 'A Kid and a Shovel - Snow Removal in Northeast Ohio',
    description: 'Connect with verified local teens for reliable snow removal in Northeast Ohio. Safe, simple, and supporting young entrepreneurs.',
  });

  return c.html(html);
});

// About page
pages.get('/about', (c) => {
  const user = getCurrentUser(c);

  const html = layout(`
    <h1 class="mb-4">About A Kid and a Shovel</h1>

    <div class="card mb-4">
      <h2 class="mb-2">Our Mission</h2>
      <p>A Kid and a Shovel connects Northeast Ohio seniors and homeowners with verified teenage workers for snow removal services. We're building a platform that:</p>
      <ul style="margin: 1rem 0; padding-left: 2rem;">
        <li>Makes it easy for homeowners to find reliable help</li>
        <li>Provides teens with their first entrepreneurial experience</li>
        <li>Teaches financial literacy through real earnings</li>
        <li>Strengthens neighborhood connections</li>
      </ul>
    </div>

    <div class="card mb-4">
      <h2 class="mb-2">How We're Different</h2>
      <div class="grid grid-2">
        <div>
          <h4>Parent Verification</h4>
          <p class="text-light">Every teen worker is verified with parental consent, ensuring accountability.</p>
        </div>
        <div>
          <h4>Photo Documentation</h4>
          <p class="text-light">Before and after photos for transparency and quality assurance.</p>
        </div>
        <div>
          <h4>Financial Education</h4>
          <p class="text-light">Built-in tools to help teens track earnings and learn about saving and investing.</p>
        </div>
        <div>
          <h4>Community Focus</h4>
          <p class="text-light">Serving Northeast Ohio communities where relationships matter.</p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="mb-2">The Future Fund</h2>
      <p>When teens earn through our platform, 3% goes into their "Future Fund" - a savings component designed to teach the power of compound interest. We show teens how their earnings today could grow over time, encouraging smart financial habits from an early age.</p>
    </div>
  `, { title: 'About - A Kid and a Shovel', user });

  return c.html(html);
});

// FAQ page
pages.get('/faq', (c) => {
  const user = getCurrentUser(c);

  const faqs = [
    {
      q: 'What areas do you serve?',
      a: 'We currently serve Northeast Ohio, including Cuyahoga County and surrounding areas. We verify ZIP codes starting with 440-444.',
    },
    {
      q: 'How old do workers need to be?',
      a: 'Workers must be between 13 and 17 years old. All workers require parental consent before they can accept jobs.',
    },
    {
      q: 'How does payment work?',
      a: 'You can pay workers with cash directly or through our secure Stripe integration. For card payments, we charge a small platform fee (10% total: 7% for operations, 3% goes to the teen\'s Future Fund).',
    },
    {
      q: 'What is the Future Fund?',
      a: 'The Future Fund is our financial literacy feature. 3% of each card payment is set aside to help teens learn about saving and investing. We show them how this money could grow over time through compound interest.',
    },
    {
      q: 'How do you verify workers?',
      a: 'All teen workers require parental consent via email verification. We also encourage references and profile photos (moderated for safety).',
    },
    {
      q: 'What if there\'s a problem with a job?',
      a: 'Both parties can rate each other after a job. If there\'s a dispute, you can flag the job and our team will help resolve it.',
    },
    {
      q: 'Do workers bring their own equipment?',
      a: 'Workers list what equipment they have on their profile. Some have shovels, others may have snow blowers. Check their profile before booking.',
    },
    {
      q: 'How do I know when to post a job?',
      a: 'We monitor National Weather Service forecasts and send alerts when significant snow is expected. You\'ll get a notification suggesting you post a job before workers fill up.',
    },
  ];

  const html = layout(`
    <h1 class="mb-4">Frequently Asked Questions</h1>

    ${faqs.map((faq, i) => `
      <div class="card">
        <h3>${faq.q}</h3>
        <p class="text-light mt-1">${faq.a}</p>
      </div>
    `).join('')}

    <div class="card text-center">
      <h3>Still have questions?</h3>
      <p class="text-light">Contact us at <a href="mailto:contact@akidandashovel.com">contact@akidandashovel.com</a></p>
    </div>
  `, { title: 'FAQ - A Kid and a Shovel', user });

  return c.html(html);
});

// Login page
pages.get('/login', (c) => {
  const user = getCurrentUser(c);
  if (user) {
    return c.redirect(user.type === 'teen' ? '/worker/dashboard' : '/dashboard');
  }

  const returnUrl = c.req.query('return') || '/';

  const html = layout(`
    <div style="max-width: 400px; margin: 0 auto;">
      <h1 class="text-center mb-4">Log In</h1>

      <div class="card">
        <form id="loginForm" action="/api/auth/login" method="POST">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required autocomplete="current-password">
          </div>

          <div id="error" class="form-error mb-2" style="display: none;"></div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">Log In</button>
        </form>

        <p class="text-center mt-2">
          <a href="/forgot-password">Forgot password?</a>
        </p>
      </div>

      <p class="text-center mt-4">
        Don't have an account?<br>
        <a href="/signup/homeowner">Sign up as a Homeowner</a> or <a href="/signup/teen">Sign up as a Worker</a>
      </p>
    </div>

    <script>
      document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
          email: form.email.value,
          password: form.password.value
        };

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          const result = await res.json();

          if (result.success) {
            window.location.href = '${returnUrl}';
          } else {
            document.getElementById('error').textContent = result.error || 'Login failed';
            document.getElementById('error').style.display = 'block';
          }
        } catch (err) {
          document.getElementById('error').textContent = 'An error occurred. Please try again.';
          document.getElementById('error').style.display = 'block';
        }
      });
    </script>
  `, { title: 'Log In - A Kid and a Shovel' });

  return c.html(html);
});

// Signup pages
pages.get('/signup/homeowner', (c) => {
  const user = getCurrentUser(c);
  if (user) {
    return c.redirect('/dashboard');
  }

  const html = layout(`
    <div style="max-width: 500px; margin: 0 auto;">
      <h1 class="text-center mb-4">Sign Up as Homeowner</h1>

      <div class="card">
        <form id="signupForm">
          <input type="hidden" name="type" value="homeowner">

          <div class="form-group">
            <label for="name">Full Name</label>
            <input type="text" id="name" name="name" required>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>

          <div class="form-group">
            <label for="phone">Phone (optional)</label>
            <input type="tel" id="phone" name="phone">
          </div>

          <div class="form-group">
            <label for="address">Street Address</label>
            <input type="text" id="address" name="address" required>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label for="city">City</label>
              <input type="text" id="city" name="city" required>
            </div>
            <div class="form-group">
              <label for="zip">ZIP Code</label>
              <input type="text" id="zip" name="zip" required pattern="\\d{5}">
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required minlength="8">
            <small class="text-light">At least 8 characters with uppercase, lowercase, and number</small>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required>
          </div>

          <div id="error" class="form-error mb-2" style="display: none;"></div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button>
        </form>
      </div>

      <p class="text-center mt-4">
        Already have an account? <a href="/login">Log in</a><br>
        Want to shovel instead? <a href="/signup/teen">Sign up as a Worker</a>
      </p>
    </div>

    <script>
      document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;

        if (form.password.value !== form.confirmPassword.value) {
          document.getElementById('error').textContent = 'Passwords do not match';
          document.getElementById('error').style.display = 'block';
          return;
        }

        const data = {
          type: 'homeowner',
          name: form.name.value,
          email: form.email.value,
          phone: form.phone.value,
          address: form.address.value,
          city: form.city.value,
          zip: form.zip.value,
          password: form.password.value
        };

        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          const result = await res.json();

          if (result.success) {
            window.location.href = '/dashboard';
          } else {
            const errors = result.errors ? Object.values(result.errors).join(', ') : result.error;
            document.getElementById('error').textContent = errors || 'Registration failed';
            document.getElementById('error').style.display = 'block';
          }
        } catch (err) {
          document.getElementById('error').textContent = 'An error occurred. Please try again.';
          document.getElementById('error').style.display = 'block';
        }
      });
    </script>
  `, { title: 'Sign Up - A Kid and a Shovel' });

  return c.html(html);
});

pages.get('/signup/teen', (c) => {
  const user = getCurrentUser(c);
  if (user) {
    return c.redirect('/worker/dashboard');
  }

  const html = layout(`
    <div style="max-width: 500px; margin: 0 auto;">
      <h1 class="text-center mb-4">Sign Up as Worker</h1>
      <p class="text-center text-light mb-4">Must be 13-17 years old. Parent/guardian approval required.</p>

      <div class="card">
        <form id="signupForm">
          <input type="hidden" name="type" value="teen">

          <h3 class="mb-2">Your Information</h3>

          <div class="form-group">
            <label for="name">Your Full Name</label>
            <input type="text" id="name" name="name" required>
          </div>

          <div class="form-group">
            <label for="age">Your Age</label>
            <select id="age" name="age" required>
              <option value="">Select age</option>
              <option value="13">13</option>
              <option value="14">14</option>
              <option value="15">15</option>
              <option value="16">16</option>
              <option value="17">17</option>
            </select>
          </div>

          <div class="form-group">
            <label for="email">Your Email</label>
            <input type="email" id="email" name="email" required>
          </div>

          <div class="form-group">
            <label for="school_name">School Name (optional)</label>
            <input type="text" id="school_name" name="school_name">
          </div>

          <div class="form-group">
            <label for="address">Street Address</label>
            <input type="text" id="address" name="address" required>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label for="city">City</label>
              <input type="text" id="city" name="city" required>
            </div>
            <div class="form-group">
              <label for="zip">ZIP Code</label>
              <input type="text" id="zip" name="zip" required pattern="\\d{5}">
            </div>
          </div>

          <h3 class="mb-2 mt-4">Parent/Guardian Information</h3>

          <div class="form-group">
            <label for="parent_name">Parent/Guardian Name</label>
            <input type="text" id="parent_name" name="parent_name" required>
          </div>

          <div class="form-group">
            <label for="parent_email">Parent/Guardian Email</label>
            <input type="email" id="parent_email" name="parent_email" required>
            <small class="text-light">We'll send a consent request to this email</small>
          </div>

          <h3 class="mb-2 mt-4">Account</h3>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required minlength="8">
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required>
          </div>

          <div id="error" class="form-error mb-2" style="display: none;"></div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button>
        </form>
      </div>

      <p class="text-center mt-4">
        Already have an account? <a href="/login">Log in</a><br>
        Need snow removed? <a href="/signup/homeowner">Sign up as a Homeowner</a>
      </p>
    </div>

    <script>
      document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;

        if (form.password.value !== form.confirmPassword.value) {
          document.getElementById('error').textContent = 'Passwords do not match';
          document.getElementById('error').style.display = 'block';
          return;
        }

        const data = {
          type: 'teen',
          name: form.name.value,
          age: parseInt(form.age.value),
          email: form.email.value,
          school_name: form.school_name.value,
          address: form.address.value,
          city: form.city.value,
          zip: form.zip.value,
          parent_name: form.parent_name.value,
          parent_email: form.parent_email.value,
          password: form.password.value
        };

        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          const result = await res.json();

          if (result.success) {
            window.location.href = '/worker/dashboard?consent=pending';
          } else {
            const errors = result.errors ? Object.values(result.errors).join(', ') : result.error;
            document.getElementById('error').textContent = errors || 'Registration failed';
            document.getElementById('error').style.display = 'block';
          }
        } catch (err) {
          document.getElementById('error').textContent = 'An error occurred. Please try again.';
          document.getElementById('error').style.display = 'block';
        }
      });
    </script>
  `, { title: 'Sign Up as Worker - A Kid and a Shovel' });

  return c.html(html);
});

export default pages;
