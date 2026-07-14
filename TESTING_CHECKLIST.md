# SUSU Collection System Testing Checklist

Use this before real operational testing.

## Roles And Access

- Log in separately as Owner Admin, Supervisor, General Staff, and SUSU Agent.
- Confirm only Owner Admin can open Portal Control, encrypted backups, supervisor access, and archived staff.
- Confirm audit records can be viewed but cannot be created, changed, or deleted from the client.
- Confirm supervisors see only assigned branch operational data.
- Confirm General Staff cannot see admin, supervisor, owner, or collection-entry controls.
- Confirm only SUSU AGENT users can open Field Collection and create deposits.

## SUSU-Only Cleanup

- Confirm Training, Forms, Support, and Announcement pages are not visible in navigation or global search.
- Confirm old content APIs return disabled/unavailable if called.
- Confirm Portal Control only exposes SUSU-relevant settings: brand/login, timing, branches, and departments.
- Confirm labels say SUSU Collection Portal rather than generic staff/training/support portal wording.

## Customers And Collections

- Add a customer and confirm it appears in Customers and Field Collection search for the correct scope.
- Record a deposit as SUSU AGENT and confirm Dashboard, Customers, Transactions, and Reports update for that selected date.
- Switch Today, Yesterday, custom day, month, and chart-click selection.
- Confirm inactive customers leave Field Collection search and can be restored from Inactive Customers.

## Directory And Staff

- Confirm all staff can view directory cards by department.
- Confirm Add User opens registration and is mobile-friendly.
- Confirm only allowed admin roles can edit/remove users.
- Confirm Owner Admin cannot be archived or permanently removed.
- Confirm archive/remove/delete dialogs are styled app dialogs, not browser popups.
- Confirm profile image, online dot, email wrapping, and card height work at 400px.

## Supervisor And Agents

- Confirm Supervisor Management permissions are SUSU-specific.
- Assign a supervisor to one branch and selected departments.
- Confirm supervisor can view only branch-relevant customers, collections, transactions, reports, and approvals.
- Confirm Agent Management only lists `SUSU AGENT` department staff.
- Test agent reassignment, archive selected, restore from Users & Access, and PDF export.

## Reports And Exports

- Export daily Excel and confirm columns: Account Name, Account Number, Amount (GH₵), Agent Code, Branch.
- Confirm account names are spaced correctly.
- Export PDF for Reports, Agent Management, and Audit Log.
- Confirm exports match selected date/month and branch scope.
- Confirm export buttons show success/failure feedback.

## Mobile Pass

- Test at 400px width.
- Check Dashboard, Customers, Inactive Customers, Directory, Transactions, Reports, Audit Log, Agents, Profile, Portal Control, and Register.
- Confirm there is no horizontal overflow.
- Confirm bottom nav includes the right buttons per role.
- Confirm dropdowns fit inside phone width.

## Backup And Recovery

- Log in as OwnerAdmin and export backup before serious testing.
- Confirm an encrypted `.json` backup downloads and contains no readable user/password data.
- Store the backup and its passphrase separately outside the app folder.

## Final Smoke Test

- Run `python -m py_compile mail-api/app.py`.
- Run `python -m unittest discover -s mail-api/tests -v`.
- Run `npm run lint`.
- Run `npm run typecheck` and `npm audit --audit-level=moderate`.
- Run `npm run build`.
- Confirm frontend returns HTTP 200.
- Confirm backend `/api/health` returns `{"ok":true}`.
