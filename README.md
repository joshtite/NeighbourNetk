# NeighbourNetk

NeighbourNetk is a neighbourhood help board where residents can post what they need and volunteers can respond — from errands and groceries to tech questions and study support.

It is built as a full-stack web app with:

- React (Create React App) for the frontend
- Node/Express for the legacy local API (optional)
- Supabase (Postgres + Auth + Row Level Security) for the production database and authentication

The project is designed to be:

- **Human‑centred** – focused on clear, low‑friction flows for neighbours and volunteers
- **Production‑minded** – real authentication, persistent storage, access control, and deployment‑ready
- **Portfolio‑ready** – clean structure and documentation suitable for graduate applications and hiring managers

---

## Features

- **Neighbour requests**
  - Create help requests with title, detailed description, category, and neighbourhood/area
  - Status workflow: **Open → In progress → Resolved**
  - Filters by status, category, and view (all requests / my requests / requests I’m helping with)

- **Volunteer responses**
  - Any authenticated user can respond to a request with a message and their name
  - Responses are timestamped and shown in chronological order under each request

- **Two roles**
  - **Neighbour** – focuses on posting and tracking their own requests
  - **Volunteer** – focuses on browsing open requests and responding where they can help

- **Authentication & accounts (Supabase Auth)**
  - Email + password signup with confirmation emails
  - Sign in / sign out flows
  - Requests and responses linked to `auth.users` via `created_by_user_id` and `volunteer_user_id`

- **Security (Row Level Security)**
  - Public read access to help requests and responses
  - Only authenticated users can create requests and responses
  - Only the owner of a request (matching `created_by_user_id`) can update its content and status

---

## Architecture overview

### Frontend

- React app in `frontend/`
- Main screen (`App.js`) provides:
  - “Display as” profile strip for name, email, and role
  - Auth strip for email/password signup and sign in
  - Request creation form
  - Explainer sidebar (“How NeighbourNetk works”)
  - Filterable list of help requests and responses
- Styling is done with plain CSS in `App.css`, focusing on a calm, legible look rather than a heavy component library

### Backend / data

- **Supabase Postgres**
  - Tables defined in `supabase/schema.sql`:
    - `help_requests`
    - `help_responses`
  - Indices on `created_at`, `status`, and `request_id`
  - Row Level Security policies:
    - Public read on both tables
    - Authenticated inserts only, with user IDs constrained to `auth.uid()`
    - Owners‑only updates on `help_requests`

- **Supabase Auth**
  - Email/password auth with confirmation emails
  - Application code uses `supabase.auth.getUser()` to attach user IDs and emails to records

- **Legacy Node/Express API**
  - Simple in‑memory Express server in `backend/server.js`
  - Kept for local/offline experimentation; the production path uses Supabase directly from the frontend

---

## Running the project locally

### Prerequisites

- Node.js (LTS)
- npm
- A Supabase project (free tier is fine)

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/NeighbourNetk.git
cd NeighbourNetk
```

### 2. Set up Supabase

1. Create a new Supabase project.
2. In the Supabase dashboard, open **SQL Editor** and run the contents of:

   ```text
   supabase/schema.sql
   ```

   This creates the `help_requests` and `help_responses` tables and all RLS policies.

3. In Supabase **Auth → Sign in / Providers**, enable **Email** (email + password) signups.

### 3. Configure the frontend

1. Go to the `frontend/` folder.

   ```bash
   cd frontend
   ```

2. Copy the example environment file and fill it with your Supabase values:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env`:

   ```env
   REACT_APP_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
   REACT_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

3. Install dependencies and start the dev server:

   ```bash
   npm install
   npm start
   ```

4. Open the app at `http://localhost:3000`.

### 4. (Optional) Run the legacy Express backend

The frontend is designed to talk directly to Supabase when environment variables are present.  
If you want to experiment with the older Node/Express API:

```bash
cd ..
npm install
node backend/server.js
```

Then adjust the fetch calls in `App.js` to use `http://localhost:5000` instead of Supabase.

---

## Deployment notes

The recommended deployment is:

- Frontend on **Vercel** (or Netlify/Render)
- Supabase project hosted by Supabase

High‑level deployment steps:

1. Push the repo to GitHub.
2. Create a new Vercel project pointing at the `frontend` folder.
3. Configure environment variables in Vercel:

   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

4. Trigger a deploy and verify that:

   - Signing up / signing in works.
   - Creating requests and responses writes to the Supabase tables.
   - Status updates succeed only for the owner of the request.

---

## How this relates to community / impact

NeighbourNetk is intentionally aligned with community‑oriented initiatives:

- Encourages **mutual aid** within local communities.
- Lowers the barrier for asking for help by focusing on short, structured requests.
- Makes it easy for volunteers to discover where they can be most useful.

From a technical perspective, it demonstrates:

- Practical use of a managed Postgres (Supabase) with a carefully designed schema.
- Real authentication and authorisation with Row Level Security.
- A thoughtful UX for two user roles interacting around a shared resource.

This combination makes it a strong, honest portfolio piece for graduate applications and software engineering roles.

