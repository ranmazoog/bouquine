# Fix Report: Tiptap BubbleMenu Crash

## Issue
The application crashed with `Uncaught SyntaxError: ... does not provide an export named 'BubbleMenu'`.

## Cause
The `BubbleMenu` component is no longer exported from the main `@tiptap/react` entry point in the installed version (`^3.15.3`). It has been moved to a submodule.

## Fix
1.  **Updated Import Path**: logic moved to `import { BubbleMenu } from '@tiptap/react/menus'`.
2.  **Removed Deprecated Prop**: Removed `tippyOptions` prop from `BubbleMenu` component as it caused TypeScript errors and is no longer part of the API.

## Verification
- Usage of `BubbleMenu` now matches the package exports.
- Application should load the editor without runtime errors.
