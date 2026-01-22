# Fix Report: Missing Handlers & Build Error

## Problem
The application was crashing with "No handler registered" errors and a build error related to `electron-store`.

## Root Cause
1.  **Build Failure:** The Electron main process failed to build because `electron-store` was not marked as `external` in `vite.config.ts`.
2.  **Missing Dependency:** `electron-store` was missing from `dependencies`.
3.  **Stale Main Process:** Due to the build failure, the running Electron app was using an old version of the main process code that didn't have the new Vault/Export handlers registered.

## Fixes Applied
1.  **Vite Config:** Updated `vite.config.ts` to externalize `electron-store`.
2.  **Dependencies:** Installed `electron-store` as a runtime dependency.
3.  **Clean Build:** Verified a successful `npm run build`.

## Required Action
⚠️ **You must restart the Electron development server.**
1.  Stop the current `npm run dev` process (Ctrl+C).
2.  Run `npm run dev` again.

This will load the new `dist-electron/main.js` which contains all the required handlers (`get-characters`, `create-world-element`, etc.).
