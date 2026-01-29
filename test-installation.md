# Bouquine v1.3.0 Installation Test Protocol

## Test Platforms
- [ ] macOS ARM64 (Apple Silicon M1/M2/M3)
- [ ] macOS x64 (Intel Mac)
- [ ] Windows 10/11 (.exe)
- [ ] Linux (.AppImage)

## Test Steps for Each Platform

### macOS ARM64 (Apple Silicon)
1. Download `Bouquine-mac-arm64.dmg`
2. Mount DMG and drag to Applications
3. Right-click → Open (Gatekeeper bypass)
4. Launch app, verify:
   - [ ] App opens successfully
   - [ ] Main window displays
   - [ ] No crash on startup
   - [ ] Can create new project
   - [ ] AI providers configurable

### macOS x64 (Intel)
1. Download `Bouquine-mac-x64.dmg`
2. Mount DMG and drag to Applications
3. Right-click → Open (Gatekeeper bypass)
4. Launch app, verify:
   - [ ] App opens successfully
   - [ ] Main window displays
   - [ ] No crash on startup
   - [ ] Can create new project
   - [ ] AI providers configurable

### Windows (.exe)
1. Download `Bouquine-win.exe`
2. Run installer
3. Launch from Start Menu/Desktop
4. Verify:
   - [ ] App opens successfully
   - [ ] Main window displays
   - [ ] No crash on startup
   - [ ] Can create new project
   - [ ] AI providers configurable

### Linux (.AppImage)
1. Download `Bouquine-linux.AppImage`
2. `chmod +x Bouquine-linux.AppImage`
3. Run `./Bouquine-linux.AppImage`
4. Verify:
   - [ ] App opens successfully
   - [ ] Main window displays
   - [ ] No crash on startup
   - [ ] Can create new project
   - [ ] AI providers configurable

## Critical Path Tests
- [ ] Database creation works
- [ ] Project saving/loading
- [ ] AI API key configuration
- [ ] Basic text generation
- [ ] Export functionality

## Known Issues to Verify
- [ ] macOS Gatekeeper warning (expected for beta)
- [ ] Right-click open required on macOS
- [ ] AppImage permissions on Linux

## Test Environment Notes
- Test on clean user account if possible
- Document any error messages
- Take screenshots of issues
- Note system specs (OS version, architecture)

## Success Criteria
All platforms should:
1. Install without errors
2. Launch successfully
3. Basic functionality works
4. No data loss/corruption

## Beta Tester Instructions
Once builds are ready, provide testers with:
1. Download links for their platform
2. Gatekeeper bypass instructions (macOS)
3. Bug reporting template
4. Expected timeline for feedback