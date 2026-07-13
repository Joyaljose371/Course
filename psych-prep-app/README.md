# Psych Catalog — NET/SET/JRF Prep App

A React + Firebase study app for PG-level psychology exam prep: browse topics by
category, a theories & persons index, research methodology, quiz mode, and
flashcards — with real user accounts and an admin content manager.

## 1. Create your Firebase project

1. Go to https://console.firebase.google.com and click **Add project**. Give it
   any name (e.g. `psych-catalog`) and finish the wizard (Google Analytics is optional).
2. In the left sidebar, go to **Build → Authentication → Get started**.
   Enable the **Email/Password** sign-in provider.
3. Go to **Build → Firestore Database → Create database**. Start in
   **production mode** (we'll add our own rules next), pick any region.
4. Go to **Project settings** (gear icon) → scroll to **Your apps** → click the
   **</> (Web)** icon → register an app (any nickname) → you don't need Firebase
   Hosting for this. Copy the `firebaseConfig` values shown — you'll need them
   in step 3 below.

## 2. Deploy the security rules

The file `firestore.rules` in this project enforces:
- Any signed-in user can **read** all study content.
- Only users listed in a separate `admins` collection can **write** (add/edit/delete)
  content — this is enforced by Firebase itself, not just hidden in the app.
- Each user can only read/write their own profile.

To apply these rules:
1. In the Firebase Console, go to **Firestore Database → Rules**.
2. Paste in the contents of `firestore.rules` from this project, replacing the
   default rules.
3. Click **Publish**.

(Alternatively, if you have the Firebase CLI installed: `firebase deploy --only firestore:rules`.)

## 3. Configure the app

```bash
cp .env.example .env
```

Open `.env` and fill in the six `VITE_FIREBASE_...` values from step 1.4 above.

## 4. Run it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## 5. Sign up and become admin

1. In the running app, click **Create one** and sign up with any email/password
   (Firebase Auth handles this for real — no inbox confirmation needed for
   email/password unless you turn that on later).
2. You'll be dropped into onboarding — pick a name. Categories will be empty at
   first, that's expected.
3. To promote yourself to admin:
   - Firebase Console → **Authentication → Users** → copy your **User UID**.
   - Firebase Console → **Firestore Database → Data** → **Start collection** →
     collection ID: `admins` → **Document ID**: paste your UID → add any field
     (e.g. `role: "admin"`) → **Save**.
   - Refresh the app. You should now see an **Admin** tab in the nav.
4. In the Admin tab, click **Import starter content** once — this seeds the
   built-in categories, topics, theories, quiz questions, and flashcards so you
   have something to work with. After that, add/edit/delete anything you like.

Anyone else who signs up will **not** be an admin unless you manually add their
UID to the `admins` collection the same way — that's the real security boundary.

## 6. Push to GitHub

From inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit: Psych Catalog prep app"
```

Then create a new **empty** repository on GitHub (no README/license, since you
already have one): https://github.com/new

GitHub will show you a remote URL like `https://github.com/YOUR_USERNAME/YOUR_REPO.git`.
Run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Your `.env` file is git-ignored on purpose (it has your Firebase keys) — anyone
cloning the repo will need to create their own `.env` from `.env.example`.

## 7. Deploying it live (optional)

The quickest free option is **Firebase Hosting**:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # choose "dist" as the public directory, configure as a single-page app: Yes
npm run build
firebase deploy --only hosting
```

Or deploy `dist/` after `npm run build` to Vercel/Netlify — either works fine,
since all the backend logic lives in Firebase, not on a server you host.

## Project structure

```
src/
  data/seed.js          starter content (categories, topics, theories, quiz, flashcards, research)
  firebase.js           Firebase app/auth/Firestore initialization
  hooks/useAuth.js       sign up / log in / log out
  hooks/useProfile.js    per-user profile + admin-status check
  hooks/useContentDB.js  shared content CRUD + starter-content import
  App.jsx               all UI (dashboard, browse, theories, quiz, flashcards, admin)
firestore.rules          security rules (deploy via Firebase Console, see step 2)
```
