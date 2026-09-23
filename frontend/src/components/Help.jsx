import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Pressable from './ui/Pressable';
import { useAppMotion } from '../hooks/useAppMotion';

const FAQS = [
  {
    id: 'auth',
    icon: '🔐',
    question: 'How does my PIN keep my data private?',
    answer: (
      <>
        <p>
          Your 4-character PIN works like a personal key rather than a password we keep on file. It's hashed with
          bcrypt the moment you set it — Nomi never stores, logs, or can look up the plain PIN itself, only that
          hash.
        </p>
        <p className="mt-3">
          Every request your device makes after logging in is authenticated with a signed token instead of resending
          your PIN, and all traffic between the app and the backend travels over HTTPS. Nobody, including us, can
          read your PIN back out of the database.
        </p>
      </>
    ),
  },
  {
    id: 'import',
    icon: '📋',
    question: 'How do I import my timetable from VTOP?',
    answer: (
      <>
        <p>Nomi can parse your course registration table directly from VTOP — no manual entry needed:</p>
        <ol className="list-decimal pl-5 mt-3 flex flex-col gap-1.5">
          <li>In VTOP, open <span className="text-textPrimary font-semibold">Course Registration → Time Table</span> for the current semester.</li>
          <li>Select the entire course registration table and copy it.</li>
          <li>In Nomi, go to the <span className="text-textPrimary font-semibold">Timetable</span> tab.</li>
          <li>Tap <span className="text-textPrimary font-semibold">+ Import from VTOP</span>.</li>
          <li>Paste the copied text into the box and tap <span className="text-textPrimary font-semibold">Parse</span>.</li>
          <li>Review the detected courses, then tap <span className="text-textPrimary font-semibold">Import</span> to confirm.</li>
        </ol>
        <p className="mt-3">
          Embedded courses (the same course code appearing as both Theory and Lab) are merged automatically into one
          entry, with attendance tracked independently for each half.
        </p>
      </>
    ),
  },
  {
    id: 'offline',
    icon: '📡',
    question: 'Does Nomi work without an internet connection?',
    answer: (
      <>
        <p>
          Nomi installs like a real app and opens instantly even with no signal — you'll never see a blank white
          screen or a browser "no connection" page while your network catches up.
        </p>
        <p className="mt-3">
          Loading your actual timetable, tasks, expenses, and notes still needs a connection to the backend, since
          that data lives on the server rather than on your device. Once you're back online, everything picks up
          right where it left off.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    icon: '🗑️',
    question: 'What control do I have over my data?',
    answer: (
      <>
        <p>
          Full control, at any time — no request or waiting period needed. From{' '}
          <span className="text-textPrimary font-semibold">Profile → Danger Zone → Hold to Self-Destruct</span>, you
          can permanently delete your account and everything tied to it: timetable, attendance, expenses, notes, and
          portfolio. It's irreversible, and it's entirely in your hands.
        </p>
        <p className="mt-3">
          For the full breakdown of what's collected and why, see the{' '}
          <a href="/privacy" className="text-accent font-bold hover:underline">Privacy Policy</a>.
        </p>
      </>
    ),
  },
];

function FaqCard({ faq, isOpen, onToggle }) {
  const m = useAppMotion();

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden transition-colors">
      <Pressable
        as="div"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-5 cursor-pointer text-left"
      >
        <span className="text-2xl shrink-0" aria-hidden="true">{faq.icon}</span>
        <h3 className="flex-1 font-bold text-textPrimary leading-tight">{faq.question}</h3>
        <motion.span
          className="text-textSecondary text-sm shrink-0"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={m.snappy}
        >
          ▾
        </motion.span>
      </Pressable>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={m.fast}
            className="px-5 pb-5 text-sm text-textSecondary leading-relaxed"
          >
            {faq.answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Help & FAQ — a normal authenticated tab (activeTab: 'help'), same as
// Timetable or Finance, not a public route like /privacy: Google Play only
// requires the privacy policy to be reachable logged-out, and this app has
// no client-side router to wire a real URL to in the first place.
function Help() {
  const [openId, setOpenId] = useState(FAQS[0].id);

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="w-full max-w-3xl mx-auto pb-10 animate-fade-in flex flex-col gap-6">
      <header className="bg-surface p-6 rounded-xl border border-border shadow-lg transition-colors duration-300">
        <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2 leading-tight">❓ Help &amp; FAQ</h1>
        <p className="text-textSecondary text-sm mt-1">Answers to the questions we hear most.</p>
      </header>

      <div className="flex flex-col gap-4">
        {FAQS.map((faq) => (
          <FaqCard key={faq.id} faq={faq} isOpen={openId === faq.id} onToggle={() => toggle(faq.id)} />
        ))}
      </div>
    </div>
  );
}

export default Help;
