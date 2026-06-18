# Task: Landing Page Enhancement (v1.5.1-beta)

## Objective
Elevate the Bouquine landing page (`index.html`) from a functional site to a premium "wow" experience.

## Proposed Changes

### 1. Interactive Muse Simulation (Hero)
- **Feature**: A simulated terminal/editor window in the hero section that types out a sentence and shows the AI completing it.
- **Goal**: Demonstrate the core "AI for novelists" value prop immediately without the user having to scroll.

### 2. Mission 04: The Professional Manuscript
- **Feature**: Add a 4th mission box to "The Architect's Missions".
- **Focus**: Professional export (PDF/DOCX/EPUB).
- **Goal**: Highlight the recently implemented export engine.

### 3. Visual & Content Polish
- **Email Normalization**: Change all instances of `info@bouquine.com` to `info@bouquine.app`.
- **Scroll Reveals**: Add a `reveal` animation system (Intersection Observer + CSS) for sections and feature cards.
- **Glassmorphism Refinement**: Improve card border-glow intensity and backdrop-blur values.

### 4. Installation UX
- **Feature**: Add visual steps for bypassing macOS/Windows security warnings.
- **Goal**: Reduce friction during the private beta onboarding.

## Implementation Plan

1. **CSS Refinement**:
   - Add `@keyframes reveal` and `.reveal` classes.
   - Add `.typewriter` styles.
2. **Hero Simulation**:
   - Inject the simulation container into the hero section.
   - Add the typing logic to the bottom of the `<script>` tag.
3. **Missions Update**:
   - Append "Mission 04" to the protocol list.
4. **General Content Update**:
   - Find and replace email addresses.
   - Update release date to Today.
5. **Preview**:
   - Update `index.html` locally.

## Verification Criteria
- [ ] No layout shifts on mobile.
- [ ] Typewriter effect is smooth and loops.
- [ ] Scroll reveal animations trigger correctly.
- [ ] All links are functional.
- [ ] Version is consistent (v1.5.0 base).
