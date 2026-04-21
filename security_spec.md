# Security Specification

1. **Data Invariants**: 
   - A notification cannot exist outside of `users/{userId}/notifications/{notificationId}`.
   - A user can only access their own notifications.
   - All notifications must have strict data types and boundaries.
   - It cannot be updated to change the `userId` or `createdAt` fields.

2. **The "Dirty Dozen" Payloads**:
   1. Valid create payload.
   2. Missing required field (e.g. `summary`).
   3. Extraneous "Ghost Field" (e.g. `isAdmin: true`).
   4. Invalid priority value (e.g. `EXTREME`).
   5. ActionItems array too large or contains non-strings.
   6. Invalid User ID attempting to create on someone else's path.
   7. Attempting to blanket read collections.
   8. Overly long strings for properties (Resource poison).
   9. Ghost field masquerading inside `actionItems` bypassing checks.
   10. Updating a notification to change the `createdAt` timestamp.
   11. Updating a notification to change the `userId` (ownership takeover).
   12. Unauthenticated user attempt to list.
