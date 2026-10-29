# ORDER OF THE VEIL — KENYA

A premium black-and-gold full-stack web app for a respectful Kenya-based community platform.

## Overview

This project includes:
- A premium public website and homepage
- A real interest application form
- Persistent SQLite-backed data storage
- Secure admin login with hashed passwords
- Admin dashboard with stats, search, filters, detail view, update, delete and CSV export
- Server-side validation, rate limiting, session handling and CSRF protection

## Project structure

```text
order-of-the-veil-kenya/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── server.js
├── data/
│   └── .gitkeep
├── public/
│   ├── admin.html
│   ├── admin.js
│   ├── app.js
│   ├── index.html
│   └── styles.css
└── node_modules/
```

## Install dependencies

```bash
npm install
```

## Configure environment variables

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and set secure values:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=replace-with-a-long-random-secret-string
DB_PATH=./data/order_of_the_veil.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeThisPasswordToSomethingStrong123!
```

Important:
- Use a strong password for `ADMIN_PASSWORD`.
- Do not expose `.env` in frontend code.
- For production, set `NODE_ENV=production` and a secure session secret.

## Start the app

```bash
npm start
```

## Access the website

Public website:

```text
http://localhost:3000/
```

Admin dashboard:

```text
http://localhost:3000/admin
```

## Admin login credentials

Use the values from your `.env` file:

- Username: `ADMIN_USERNAME`
- Password: `ADMIN_PASSWORD`

## Database and persistence

The app uses SQLite and stores data in the `data` directory by default:

```text
data/order_of_the_veil.db
```

This persists across server restarts as long as the `data` directory remains writable. For production hosting, use a persistent volume or disk storage.

## Deployment guidance

For a Node.js-compatible host:
1. Upload the project or zip it and deploy it to the host.
2. Run `npm install` in the project root.
3. Configure environment variables in `.env` on the host.
4. Start the app with `npm start`.
5. Ensure the `data` folder is writable.
6. Keep the database on persistent storage.

## Security notes

The app includes:
- bcrypt password hashing
- secure server-side session management
- CSRF protection for admin actions
- rate limiting for public form and login requests
- secure HTTP headers with Helmet
- server-side validation and sanitization

## Important note

This project is ready for deployment on a Node.js-compatible host, but deployment to a public host has not been performed from this environment.

## Contact

Email: hello@orderoftheveilkenya.org
Location: Kenya
