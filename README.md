# SmartCare Clinic — Appointment & Token Demo

A responsive clinic appointment and token-generation project built with HTML, CSS and vanilla JavaScript.

## Current version

This repository contains a **front-end demonstration** suitable for learning and project presentation.

Features:
- Responsive clinic landing page and doctor directory
- Appointment form with validation
- Separate sequential token queues per doctor and appointment date
- Duplicate booking check for the same patient, doctor, date and time
- Appointment confirmation receipt and print action
- Token lookup by appointment ID or token number
- Patient demo registration
- Demo staff dashboard (press **Ctrl + Shift + A**, demo code: `care2026`)
- CSV export, call-next, complete and cancel actions

## Important data and security limitation

The current demo stores data in the browser's `localStorage`. This means:
- Data is only available in the same browser on the same device.
- Patients and clinic staff do not share a central database.
- The staff demo code is visible in the client-side source and is **not secure authentication**.
- Do not enter real patient or medical information.
- This is an educational prototype, not a production healthcare system.

For a real multi-user clinic system, connect Supabase (or another hosted database) with:
1. Supabase Auth for patient, doctor and admin accounts.
2. PostgreSQL tables for profiles, doctors, appointments and token queues.
3. Row Level Security policies and server-side role checks.
4. A database transaction or RPC function to allocate tokens atomically and prevent race conditions.
5. Private handling of patient data, HTTPS, backups and appropriate privacy/security review.

SQLite is suitable for local development, but a local SQLite file should not be used as persistent storage on Vercel serverless functions.

## Run locally

1. Install VS Code.
2. Download or clone this repository.
3. Open the project folder in VS Code.
4. Open `index.html` directly in a browser, or install the VS Code **Live Server** extension and choose **Open with Live Server**.

No build command or package installation is needed for this demo.

## Deploy on Vercel

The site is static and can be deployed from the connected GitHub repository:
1. Import the repository in Vercel.
2. Keep Framework Preset as **Other**.
3. Leave Build Command empty.
4. Leave Output Directory empty (project root).
5. Deploy.

## Demo testing

1. Open the site and scroll to **Book an appointment**.
2. Enter sample patient details, choose a doctor and date, and select a time.
3. Submit to receive an appointment ID and token receipt.
4. Use the appointment ID in **Check Token**.
5. To test staff actions, press **Ctrl + Shift + A** and enter `care2026`.
6. Call a token, complete or cancel appointments, and export CSV.

## Project structure

- `index.html` — page structure
- `style.css` — responsive design
- `app.js` — demo booking, token logic, lookup and staff console
- `vercel.json` — static hosting configuration
