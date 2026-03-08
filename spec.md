# Myapp

## Current State
Full messaging app with username/password auth, serial numbers, MyBucks, admin panel, calls, notifications. Login and signup both show "Login failed" error on every attempt.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `loginWithToken` backend: stop using `Runtime.trap` for banned users — instead return the profile with `isBanned=true` so the frontend ban dialog can handle it. Change error messages to be specific ("Username not found", "Invalid username or password") so the frontend can show them accurately.
- Frontend `LoginPage`: improve catch block to extract and display the actual error message from the IC trap response, rather than always falling back to "Login failed".
- Frontend `RegisterPage`: same improvement — show the real error from the backend.

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate backend with fixed `loginWithToken`: use `switch` on `users.get(username)` instead of `getUser` (which traps with a generic message), return profile for banned users instead of trapping, keep auto-unban logic, ensure session token is always rebound to the current caller principal.
2. Update frontend login/register error catch blocks to parse the actual trap message out of the IC error string and show it to the user.
