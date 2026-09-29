POSTIK V6 — COMPLETE READY PACKAGE

Files:
- index.html
- style.css
- app.js
- config.js
- supabase_test_patch.sql

The frontend is connected to the existing Supabase project and D17 number.
D17 verification is manual: the admin checks the real transfer before approving.

NO-REAL-MONEY TEST:
1. Run supabase_test_patch.sql once in Supabase SQL Editor.
2. Make sure nizarlartisto@gmail.com exists in Auth; the patch gives its profile the admin role.
3. Log into POSTIK with that admin account.
4. The admin panel can create a test payment for a user.
5. Approve the test payment to verify that Coins are added without a real D17 transfer.

IMPORTANT:
- Never put a Supabase secret/service_role key in config.js.
- The publishable key is intended for browser use with RLS enabled.
- Test payments are admin-only and are for testing the workflow without real money.
- Before public launch, keep real D17 verification manual and remove/disable the test-payment RPC if you no longer need it.
