'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The disconnect toast.
 *
 * Reads the navigation state the console sets when it sends someone back to the
 * landing page, then clears it so a refresh does not show it again. It confirms
 * the one thing worth confirming: the console stayed shut.
 */

import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const MESSAGE = 'Wallet disconnected. The console stays closed until you reconnect.';
const DWELL_MS = 4000;

/**
 * Renders the disconnect toast when the landing page is reached by disconnecting.
 * @returns the toast, or null when it should not be shown
 */
export function DisconnectToast(): JSX.Element | null {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const history = window.history.state as { disconnected?: boolean } | null;
    if (history?.disconnected !== true) {
      return;
    }

    // Clear the flag first, so a refresh does not raise the toast again.
    window.history.replaceState({}, '');

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), DWELL_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="status"
          className="fixed bottom-6 left-1/2 z-[var(--z-toast)] -translate-x-1/2 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-5 py-3 font-body text-sm text-[var(--text-primary)]"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {MESSAGE}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}