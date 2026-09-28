POSTIK V6 — Installation

1) Create a Supabase project.
2) Open SQL Editor and run ALL of supabase.sql.
3) Create a user from POSTIK > حساب جديد.
4) In Supabase SQL Editor, make your account admin:
   update public.profiles
   set role='admin'
   where id=(select id from auth.users where email='YOUR-ADMIN-EMAIL@example.com');

5) Open config.js and replace:
   SUPABASE_URL
   SUPABASE_KEY

   Use the project's publishable/anon key only.
   NEVER use service_role/secret key in the browser.

6) Upload these files to the root of your GitHub Pages repository:
   index.html
   style.css
   app.js
   config.js

   Keep supabase.sql and README_V6.txt as documentation.

7) Open GitHub Pages.

HOW PAYMENT WORKS
- User selects a Coins pack.
- User transfers the exact amount to D17 number 25723544.
- User enters the D17 transaction reference.
- A payment request is saved in Supabase as "pending".
- Admin opens POSTIK > الإدارة.
- Admin verifies the D17 transfer manually.
- Admin presses "تأكيد الدفع".
- Supabase atomically adds the Coins and marks payment approved.
- The user sees the updated balance.

HOW ORDERS WORK
- The user selects a service and enters a content URL.
- The database function checks the current balance.
- If enough Coins exist, the exact cost is deducted atomically and the order is created.
- The browser cannot simply edit the balance because balance changes happen in protected database functions.

IMPORTANT
GitHub Pages is static hosting. Supabase is the backend/database.
Do not put a service_role/secret key in GitHub.
The D17 verification in this version is MANUAL: the admin verifies the transaction reference before approving.

Security model
The database uses Supabase Auth + PostgreSQL Row Level Security.
Users can read their own profile/orders/payment requests.
Admin can review all payment requests and orders.
Coin addition and order deduction are server-side database functions.
