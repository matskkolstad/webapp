# Privacy & GDPR

## Principles

LiggNett follows **Privacy by Design** principles:

1. **Data Minimization**: Aliases as default identifiers, no real name requirement
2. **Purpose Limitation**: Data used only for network visualization and exposure alerting
3. **Consent**: Explicit consent for terms, privacy policy, and sensitive data handling
4. **Right to Access**: Users can export all their data as JSON
5. **Right to Erasure**: Users can delete their account (soft delete → hard delete procedure)
6. **Audit Trail**: All critical actions are logged

## Data Categories

| Data | Sensitivity | Retention |
|------|------------|-----------|
| Email + password hash | Personal | Until account deletion |
| Aliases | Pseudonymized | Until deletion |
| Relationship events | Sensitive (Art. 9) | Until deletion |
| Exposure alerts | Health-adjacent | Until deletion |
| Audit logs | Operational | 1 year |

## Consent Flow

1. Registration: Accept terms + privacy policy + 18+ confirmation
2. First relationship entry: Consent for sensitive data processing
3. Alert creation: Consent for health-adjacent data processing

## Data Export

Users can request a JSON export of all their data via Settings → Export Data.

## Account Deletion

1. **Soft delete**: Account marked as deleted, data retained for 30 days
2. **Hard delete**: After 30 days, a scheduled job permanently removes all data
3. **Immediate hard delete**: Can be requested by contacting admin

## Contact Token

The optional "contact token" allows users to share contact information voluntarily. It is:
- Not required
- Not validated (free text)
- Only visible to group members
- Deleted with the person alias
