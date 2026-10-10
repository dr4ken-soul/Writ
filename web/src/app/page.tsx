// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The landing page.
 *
 * Nine sections in the order the design system fixes. Each declares its ScopeSeal
 * state and density with data attributes, which is how the single mounted canvas
 * knows what to draw for whichever section is in view.
 */

import { Nav } from '@/components/layout/Nav';
import { Hero } from '@/components/sections/Hero';
import { Problem } from '@/components/sections/Problem';
import { Mechanism } from '@/components/sections/Mechanism';
import { LiveMetrics } from '@/components/sections/LiveMetrics';
import { Integration } from '@/components/sections/Integration';
import { Compare } from '@/components/sections/Compare';
import { Trust } from '@/components/sections/Trust';
import { FinalCta } from '@/components/sections/FinalCta';
import { Footer } from '@/components/sections/Footer';

/**
 * Renders the public landing page.
 * @returns the page element
 */
export default function LandingPage(): JSX.Element {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Mechanism />
        <LiveMetrics />
        <Integration />
        <Compare />
        <Trust />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}