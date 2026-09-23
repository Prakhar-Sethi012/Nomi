import React from 'react';

// Public, unauthenticated page — Google Play requires a live Privacy Policy
// URL for the Play Store listing. Wired to /privacy in App.jsx *before* the
// auth gate, specifically so it renders with no login and no backend call.
function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="w-full max-w-3xl mx-auto px-4 py-10">
        <a href="/" className="text-sm font-bold text-accent hover:underline">← Back to Command Center</a>

        <header className="mt-6 mb-8">
          <h1 className="text-3xl font-black text-textPrimary">Privacy Policy</h1>
          <p className="text-textSecondary text-sm mt-2">Command Center — VIT Student Dashboard</p>
        </header>

        <div className="bg-surface border border-border rounded-2xl shadow-lg p-6 md:p-8 flex flex-col gap-6 text-textPrimary">
          <p className="text-sm text-textSecondary leading-relaxed">
            Command Center is a personal dashboard built for VIT students to manage their timetable, attendance,
            tasks, expenses, and campus social circles in one place. This page explains what data the app collects,
            why, and how it's handled.
          </p>

          <section>
            <h2 className="text-lg font-bold text-textPrimary mb-2">Information We Collect</h2>
            <ul className="text-sm text-textSecondary leading-relaxed list-disc pl-5 flex flex-col gap-2">
              <li><span className="text-textPrimary font-semibold">Account &amp; authentication:</span> your name, registration number, and a 4-character PIN, used solely to identify you and secure your account.</li>
              <li><span className="text-textPrimary font-semibold">Academic data:</span> your timetable, subjects, and attendance records, and CGPA — entered by you, either manually or by pasting your VTOP course registration data.</li>
              <li><span className="text-textPrimary font-semibold">Financial data:</span> expenses and budgets you log yourself. This is a personal tracking tool only — we never ask for or store real bank, card, or payment details.</li>
              <li><span className="text-textPrimary font-semibold">Social data:</span> circles or friends you choose to join, nicknames you set, and your timetable's visibility to them — all opt-in, and hideable at any time via Ghost Mode.</li>
              <li><span className="text-textPrimary font-semibold">Content you create:</span> notes, doodles, tasks, and portfolio entries you add to the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-textPrimary mb-2">How We Protect Your Data</h2>
            <ul className="text-sm text-textSecondary leading-relaxed list-disc pl-5 flex flex-col gap-2">
              <li>Your PIN is hashed with bcrypt before it's ever stored — we don't keep or log it in plain text.</li>
              <li>Sessions are authenticated with signed JWTs (JSON Web Tokens), not stored passwords.</li>
              <li>All traffic between the app and our backend is encrypted in transit over HTTPS.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-textPrimary mb-2">How We Use Your Data</h2>
            <p className="text-sm text-textSecondary leading-relaxed">
              Solely to run the features you're using — showing your timetable, tracking your attendance and
              expenses, and connecting you with circles you've chosen to join. We don't use your data for
              advertising, profiling, or anything unrelated to operating the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-textPrimary mb-2">Data Sharing</h2>
            <p className="text-sm text-textSecondary leading-relaxed">
              We do not sell your data, and we do not share it with third parties for marketing or advertising
              purposes. Your data passes through our hosting and database providers only as needed to run the
              service — they don't get to use it for anything else.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-textPrimary mb-2">Your Rights &amp; Data Deletion</h2>
            <p className="text-sm text-textSecondary leading-relaxed">
              You can permanently delete your account and every piece of data associated with it at any time —
              no request or waiting period needed. Inside the app: <span className="text-textPrimary font-semibold">Profile → Danger Zone → Hold to Self-Destruct</span>.
              This is irreversible and removes your account, timetable, finances, notes, and portfolio entirely.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-textPrimary mb-2">Who This Is For</h2>
            <p className="text-sm text-textSecondary leading-relaxed">
              Command Center is built for VIT students and isn't knowingly directed at or used by children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-textPrimary mb-2">Changes to This Policy</h2>
            <p className="text-sm text-textSecondary leading-relaxed">
              If this policy changes, the update will be posted on this page with a new date below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-textPrimary mb-2">Contact</h2>
            <p className="text-sm text-textSecondary leading-relaxed">
              Questions about this policy or your data can be sent to{' '}
              <span className="text-textPrimary font-semibold">[YOUR_CONTACT_EMAIL_HERE]</span>.
            </p>
          </section>

          <p className="text-xs text-textSecondary/70 pt-4 border-t border-border">Last updated: September 2026</p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
