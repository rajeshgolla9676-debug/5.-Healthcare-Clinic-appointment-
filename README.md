# SmartCare Clinic — Supabase-backed Appointment & Token System

Responsive HTML/CSS/JavaScript clinic website with Supabase Auth and PostgreSQL.

## Features
- Existing SmartCare responsive design and doctor directory
- Email/password patient registration and sign-in (Supabase Auth)
- Online appointment records shared across devices
- Atomic token generation per doctor and appointment date
- Duplicate active booking protection
- Appointment receipt and print action
- Token lookup using appointment UUID plus phone verification
- Role-protected admin and doctor dashboards
- Staff call, complete and cancel actions
- Row Level Security policies for patient and staff access

## Setup (required before live bookings)
1. Create a Supabase project.
2. Open **SQL Editor** in Supabase and run the complete script in `supabase/schema.sql`.
3. In Supabase **Project Settings → API**, copy the Project URL and publishable/anon key.
4. Paste those values into `url` and `anonKey` in `supabase-config.js`.
   - These values are intended for browser use when RLS is enabled.
   - NEVER put a service_role key or database password in this file or GitHub.
5. In Supabase **Authentication → URL Configuration**, add the Vercel production URL and local development URL to allowed redirect URLs.
6. Deploy the GitHub repository on Vercel (Framework Preset: Other; no build command; project root).
7. Register a staff account, then promote it only after confirming its Auth user UUID:
   `update public.profiles set role='admin' where id='AUTH_USER_UUID';`
   For a doctor account, set both role and matching doctor id:
   `update public.profiles set role='doctor', doctor_id='doc-ravi' where id='AUTH_USER_UUID';`

## Security notes
- RLS is enabled for profiles, doctors, appointments and token counters.
- Patients can read only their own appointment records. Doctors can read/update only appointments assigned to their doctor id. Admins can manage all appointments.
- Token allocation runs in a database function with a row lock to prevent duplicate token numbers during concurrent bookings.
- Public token lookup requires both the random appointment UUID and matching phone number and returns limited queue information.
- Do not store detailed medical histories or sensitive clinical notes in this student project.
- Use fictional test data until the clinic owner has reviewed privacy, security, retention, backups and applicable legal requirements. This is not certified clinical software.

## Deploy
The site is static and deploys on Vercel. Supabase provides authentication and persistent storage; no SQLite file or serverless local storage is used.

## Local testing
Open the folder with VS Code and use Live Server. Configure Supabase first, then test with fictional accounts.