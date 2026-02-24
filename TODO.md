# TODO

## Firestore Security Rules

- [ ] Add Firebase Auth to the habits page (gate behind login)
- [ ] Lock down Firestore rules to require authentication:
  ```
  allow read, write: if request.auth != null;
  ```
- [ ] Consider per-user data scoping (e.g. `/users/{userId}/habits/`) so each user only accesses their own data

- [ ] I really like stripes blog website: https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2 -- lets use it for inspiration
- [ ] Make the TODOs updatable by me from my mobile + think of how to get it hooked up to whatsapp so I can get AI to update it through a message
