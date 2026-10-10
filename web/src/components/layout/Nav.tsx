'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The A2 scroll-morph pill.
 *
 * Below 80px of scroll the nav is a full width transparent bar. Above it the bar
 * contracts into a compact liquid glass pill with the centre links collapsed
 * behind a toggle. The transition between the two is a layout spring, so the
 * wordmark and the call to action stay put while the shell changes shape around
 * them.
 *
 * There is no box shadow in either state. Separation comes from the glass border.
 */

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useConsoleGate } from '@/lib/console-gate';

/** The scroll distance at which the nav morphs into a pill. */
const MORPH_THRESHOLD = 80;

/** The centre links, in order. */
const LINKS = [
  { label: 'Mechanism', href: '#mechanism' },
  { label: 'Integration', href: '#integration' },
  { label: 'Compare', href: '#compare' },
  { label: 'Docs', href: 'https://github.com/midnightntwrk' },
] as const;

/**
 * Renders the fixed navigation.
 * @returns the nav element
 */
export function Nav(): JSX.Element {
  const { scrollY } = useScroll();
  const [pill, setPill] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { enter } = useConsoleGate();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setPill(latest >= MORPH_THRESHOLD);
  });

  // Close the menus when the reader scrolls away from the open state.
  useEffect(() => {
    if (!pill) {
      setMenuOpen(false);
      setOverlayOpen(false);
    }
  }, [pill]);

  // Track which section is in view so the active link carries an underline, not
  // a colour change alone.
  useEffect(() => {
    const ids = ['mechanism', 'integration', 'compare'];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        setActiveSection(visible ? visible.target.id : null);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element !== null) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, []);

  const scrollToTop = useCallback((): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isActive = useCallback(
    (href: string): boolean => href.startsWith('#') && href.slice(1) === activeSection,
    [activeSection],
  );

  const navClasses = pill
    ? 'liquid-glass rounded-full px-2.5 py-2 max-w-fit mx-auto mt-3'
    : 'w-full px-6 md:px-10 py-4 md:py-5 bg-transparent border-0';

  return (
    <>
      <motion.nav
        className={`fixed top-0 inset-x-0 z-[var(--z-nav)] ${navClasses}`}
        layout
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <div
          className={
            pill
              ? 'flex items-center gap-1'
              : 'flex items-center justify-between max-w-[1200px] mx-auto'
          }
        >
          <button
            type="button"
            onClick={scrollToTop}
            className="font-display font-extrabold tracking-[-0.02em] text-[var(--text-primary)] px-2 py-2 transition-opacity duration-150 hover:opacity-70"
          >
            <span className={pill ? 'text-base' : 'text-lg md:text-xl'}>WRIT</span>
          </button>

          {/* Centre links. Expanded bar shows them inline; pill collapses them. */}
          {!pill ? (
            <div className="hidden md:flex items-center gap-1">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-body font-medium transition-colors duration-150 ${
                    isActive(link.href)
                      ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-2 border-transparent'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            {!pill ? (
              <a
                href="https://github.com/dr4ken-soul/Writ"
                className="hidden lg:inline text-sm font-body text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
              >
                GitHub
              </a>
            ) : null}

            <button
              type="button"
              onClick={enter}
              className="group flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 font-mono text-xs font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
            >
              OPEN THE CONSOLE
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <ArrowUpRight size={12} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (pill) {
                  setMenuOpen((open) => !open);
                } else {
                  setOverlayOpen((open) => !open);
                }
              }}
              aria-expanded={pill ? menuOpen : overlayOpen}
              aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/5 md:hidden"
            >
              <span className="flex flex-col gap-1">
                <span className="block h-px w-4 bg-[var(--text-primary)]" />
                <span className="block h-px w-4 bg-[var(--text-primary)]" />
                <span className="block h-px w-4 bg-[var(--text-primary)]" />
              </span>
            </button>
          </div>
        </div>

        {/* The pill's collapsed dropdown. */}
        <AnimatePresence>
          {pill && menuOpen ? (
            <motion.div
              className="liquid-glass absolute right-0 top-full mt-2 min-w-[200px] rounded-2xl p-2"
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm font-body text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--text-primary)]"
                >
                  {link.label}
                </a>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.nav>

      {/* The mobile full screen menu. */}
      <AnimatePresence>
        {overlayOpen ? (
          <motion.div
            className="fixed inset-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-md md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex h-full flex-col justify-center px-6">
              {LINKS.map((link, index) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOverlayOpen(false)}
                  className="border-b border-[var(--border-subtle)] py-3 font-display text-4xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]"
                  initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                    delay: index * 0.06,
                  }}
                >
                  {link.label}
                </motion.a>
              ))}

              <p className="mt-10 font-mono text-[11px] tracking-[0.2em] text-[var(--text-muted)]">
                MIDNIGHT BUILDATHON · BUILD 2
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}