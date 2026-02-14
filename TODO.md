# TODO

## Firestore Security Rules
- [ ] Add Firebase Auth to the habits page (gate behind login)
- [ ] Lock down Firestore rules to require authentication:
  ```
  allow read, write: if request.auth != null;
  ```
- [ ] Consider per-user data scoping (e.g. `/users/{userId}/habits/`) so each user only accesses their own data
