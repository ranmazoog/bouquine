# Task: Final UX Polish (Synopsis Wizard & Research FAB)

This task involves implementing a comprehensive UX polish to solve "Blank Page Syndrome" and improve workflow friction.

## 1. Feature: Synopsis Workshop (Wizard Mode)

### Backend: `electron/main.ts`
- [ ] Add `generate-synopsis-from-inputs` IPC handler.
- [ ] Implement AI prompt template for synopsis generation.

### Component: `src/components/synopsis/workshopSteps.ts`
- [ ] Update stages to the requested 4-step wizard:
  1. Who is the Protagonist?
  2. What do they want?
  3. What stands in their way?
  4. How does it end?

### Component: `src/components/synopsis/SynopsisWorkshop.tsx`
- [ ] Update UI to match the 4-step wizard.
- [ ] Call the new backend handler on "Generate" (Step 4).
- [ ] Update progress indicator and layout.

---

## 2. Feature: Research FAB (Floating Action Button)

### Component: `src/components/planning/ResearchPanel.tsx`
- [ ] Remove existing "Collect Info" sidebar section.
- [ ] Implement fixed FAB in the bottom-right corner.
- [ ] Add expansion logic for "Add Link" and "Add Note" bubbles.
- [ ] Style with Tailwind transitions (as `framer-motion` is unavailable).

---

## 3. Feature: Style Drift Warning (Local Logic)

### Component: `src/components/editor/NovelEditor.tsx`
- [ ] Add `useEffect` to detect POV mismatch.
- [ ] Implement text analysis logic (filtering dialogue/italics).
- [ ] Add warning banner with dismissible button.

---

## 4. Polish: Empty States

### Component: `src/components/planning/SynopsisPanel.tsx`
- [ ] Update textarea placeholder with the guided questions list.

## Verification Criteria
- [ ] Synopsis Workshop generates a cohesive 300-word synopsis.
- [ ] Research FAB expands correctly and triggers modals.
- [ ] POV warning triggers accurately for genuine narrative mismatches.
- [ ] New placeholder is visible on empty synopsis.
