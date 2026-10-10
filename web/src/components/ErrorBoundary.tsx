'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Runtime error containment.
 *
 * A provider failure must never present as a blank screen. This boundary renders
 * a branded recovery screen with the cause in plain language and two ways out.
 * No stack trace, no error code, nothing a person has to decode.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

/** The props the boundary takes. */
interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
  readonly message: string;
}

/**
 * Turns whatever was thrown into a sentence worth reading.
 * @param error - the thrown value
 * @returns a plain language cause
 */
const describeCause = (error: unknown): string => {
  if (error instanceof Error) {
    if (/fetch|network|ECONN|timeout/i.test(error.message)) {
      return 'The app could not reach Midnight. Check the node endpoint and try again.';
    }
    if (/provider|wallet/i.test(error.message)) {
      return 'The wallet provider stopped responding. Unlock the wallet and try again.';
    }
    return error.message.length > 0 ? error.message : 'Something went wrong while rendering.';
  }
  return 'Something went wrong while rendering.';
};

/**
 * Catches render errors below it and shows a recovery screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { failed: false, message: '' };

  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, message: describeCause(error) };
  }

  public override componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Kept deliberately thin. The console output is for the developer running the
    // preview, and nothing is sent anywhere.
    console.error('Writ failed to render.', error, info.componentStack);
  }

  private readonly retry = (): void => {
    this.setState({ failed: false, message: '' });
  };

  private readonly goHome = (): void => {
    this.setState({ failed: false, message: '' });
    window.location.href = '/';
  };

  public override render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg-primary)] px-6 text-center">
        <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
          WRIT
        </span>

        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
          THE CONSOLE STOPPED
        </h1>
        <p className="mt-4 max-w-[46ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
          {this.state.message}
        </p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={this.retry}
            className="rounded-full bg-[var(--accent)] px-6 py-3 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
          >
            TRY AGAIN
          </button>
          <button
            type="button"
            onClick={this.goHome}
            className="rounded-full border border-[var(--border-default)] px-6 py-3 font-mono text-sm text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
          >
            RETURN HOME
          </button>
        </div>
      </main>
    );
  }
}