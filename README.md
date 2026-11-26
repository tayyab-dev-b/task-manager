# ✅ Task Manager API

A production-style **Task Manager REST API** built with **Node.js, Express.js, MongoDB (Mongoose)** and **JWT authentication** — register, log in, and manage your own tasks with full CRUD, filtering and pagination.

> Built by **Muhammad Tayyab** — MERN Stack Developer.
> This project grew out of my earlier learning work (a MongoDB notes app and a JWT auth project in my `Mern_Backend_Mastery` repo) and rebuilds the same ideas in a clean, layered, deploy-ready structure.

---

## 🚀 Features

- 🔐 **Authentication** — register & login with **bcrypt**-hashed passwords and **JWT** (Bearer token)
- 📝 **Task CRUD** — create, read, update and delete tasks, always scoped to the logged-in user
- 🎯 **Filtering** — by `status` (`todo` / `in-progress` / `done`), `priority` (`low` / `medium` / `high`) and title `search`
- 📄 **Pagination** — `page` / `limit` with total counts on the list endpoint
- ✅ **Validation** — request bodies validated with **Zod** before they reach the controllers
- 🧯 **Central error handling** — one error middleware, consistent `{ success, message }` JSON everywhere
- ❤️ **Health check** — `GET /health` reports API + database status
- 🖥️ **Web UI** — a full single-page task board served at `/` (see below), built with vanilla HTML/CSS/JS on this same API

---

## 🖥️ Web UI

Opening `/` serves a complete single-page app from the `public/` folder — no build step and no extra dependencies, just vanilla HTML, CSS and JavaScript talking to this API with `fetch`.

- **Login & register** screens; the JWT is kept in `localStorage` and sent as `Authorization: Bearer <token>` on every API call
- **Task board** with three columns — To Do / In Progress / Done — task cards with priority badges and due dates (overdue ones are highlighted)
- **Create & edit** tasks in a modal form, move them between columns from the card, and delete with a confirmation
- **Search, priority filter and "load more"** pagination, wired to the list endpoint's `search` / `priority` / `page` / `limit` parameters
- **Stats strip** with per-status counts, friendly empty states, and an automatic return to the login screen when the session expires (HTTP 401)

The UI and the REST API share one server and one auth system — anything you can do in the browser, you can do with the endpoints below.

---

## 🧠 Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Runtime  | Node.js (≥ 18)                      |
| Framework| Express.js                          |
| Database | MongoDB with Mongoose ODM           |
| Auth     | bcryptjs + JSON Web Tokens (JWT)    |
| Validation | Zod                               |
| Views    | Vanilla HTML/CSS/JS single-page app (`public/`) |
| Logging  | Morgan (development)                |

---

## 📁 Project Structure

Requests flow through the app in one direction:

```text
Routes → Middleware → Controllers → Services → Database
```

```text
task-manager/
├── server.js                  # Entry point: loads env, connects DB, starts HTTP server
├── render.yaml                # Render (free tier) deployment blueprint
├── vercel.json                # Vercel rewrites: /api/* and /health → serverless function
├── api/
│   └── index.js               # Vercel serverless entry: exports the Express app (no listener)
├── .env.example               # Environment variable template
├── public/                    # Web UI (single-page app, served at /)
│   ├── index.html             # Auth screens + task board + task modal
│   ├── style.css              # Light theme with emerald accent, responsive
│   └── app.js                 # fetch + JWT client logic for the whole UI
└── src/
    ├── app.js                 # Express app wiring (middleware, static UI, routes, errors)
    ├── config/
    │   └── db.js              # MongoDB connection (fails soft — server stays up)
    ├── models/
    │   ├── User.js            # username, email (unique), password (hashed)
    │   └── Task.js            # title, description, status, priority, dueDate, owner
    ├── middleware/
    │   ├── auth.js            # JWT `protect` middleware
    │   ├── validate.js        # Zod body validation middleware
    │   └── errorHandler.js    # 404 + central error handler
    ├── validators/
    │   └── schemas.js         # Zod schemas for auth & task payloads
    ├── controllers/
    │   ├── authController.js  # HTTP layer for auth (thin — delegates to services)
    │   └── taskController.js  # HTTP layer for tasks
    ├── services/
    │   ├── authService.js     # Business logic: hashing, tokens, credential checks
    │   └── taskService.js     # Business logic: owner-scoped CRUD, filters, pagination
    ├── routes/
    │   ├── authRoutes.js      # /api/auth/*
    │   └── taskRoutes.js      # /api/tasks/*
    └── utils/
        ├── AppError.js        # Error class carrying an HTTP status code
        └── asyncHandler.js    # Async controller wrapper
```

---

## ⚙️ Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable        | Description                                             |
| --------------- | ------------------------------------------------------- |
| `PORT`          | Port to listen on (default `5000`)                      |
| `MONGO_URI`     | MongoDB connection string (local or Atlas)              |
| `JWT_SECRET`    | Secret used to sign JWTs — use a long random value      |
| `JWT_EXPIRES_IN`| Token lifetime (default `7d`)                           |

### 3. Run

```bash
npm run dev    # development (nodemon)
npm start      # production
```

Open http://localhost:5000 for the web UI (register an account and start adding tasks) and http://localhost:5000/health for the health check.

> If MongoDB is unreachable the server still starts — `/health` reports `database: "disconnected"` and DB-backed routes return errors until the connection is restored.

---

## 🔥 API Endpoints

### Auth

| Method | Route              | Description            | Auth |
| ------ | ------------------ | ---------------------- | ---- |
| POST   | `/api/auth/register` | Register a new user  | —    |
| POST   | `/api/auth/login`    | Login, receive a JWT | —    |
| GET    | `/api/auth/profile`  | Current user's profile | JWT |

**Register / Login body**

```json
{ "username": "tayyab", "email": "tayyab@example.com", "password": "secret123" }
```

**Response**

```json
{
  "success": true,
  "message": "User registered successfully.",
  "user": { "id": "...", "username": "tayyab", "email": "tayyab@example.com" },
  "token": "<jwt>"
}
```

Send the token on protected routes as `Authorization: Bearer <jwt>`.

### Tasks (all routes require a JWT)

| Method | Route           | Description                                  |
| ------ | --------------- | -------------------------------------------- |
| POST   | `/api/tasks`    | Create a task                                |
| GET    | `/api/tasks`    | List my tasks — `?status=todo&priority=high&search=report&page=1&limit=10` |
| GET    | `/api/tasks/:id`| Get one of my tasks                          |
| PATCH  | `/api/tasks/:id`| Update a task (partial)                      |
| DELETE | `/api/tasks/:id`| Delete a task                                |

**Create task body**

```json
{
  "title": "Finish portfolio",
  "description": "Deploy the Task Manager API",
  "status": "in-progress",
  "priority": "high",
  "dueDate": "2026-12-01"
}
```

Tasks are **owner-scoped**: listing, reading, updating and deleting only ever touch the authenticated user's own tasks — another user's task id returns `404`.

---

## ☁️ Deployment (Render)

This repo includes a `render.yaml` blueprint for Render's free tier:

1. Push the repo to GitHub and create a new **Blueprint** (or Web Service) on Render.
2. Set `MONGO_URI` (e.g. a MongoDB Atlas connection string) in the Render dashboard — `JWT_SECRET` is generated automatically by the blueprint.
3. Render builds with `npm install` and starts with `npm start`; `/health` is the health-check path.

### Deploy on Vercel

The repo also runs on Vercel as a serverless deployment — the Express app is exported by `api/index.js` (no listener), `vercel.json` rewrites `/api/*` and `/health` to that function, and Vercel serves the `public/` UI as static files:

1. Import the repo in the Vercel dashboard (framework preset: **Other**) — no build command is needed; Vercel just installs the dependencies from `package.json`.
2. Set the `MONGO_URI` and `JWT_SECRET` environment variables in the Vercel project settings.
3. Deploy — the board loads at `/` and the API answers under `/api/*`, exactly as locally.

---

## 🎯 Key Concepts Demonstrated

- Layered backend architecture (routes / middleware / controllers / services / models)
- JWT authentication & route protection
- Password hashing with bcrypt
- Mongoose schemas, enums, references (`owner` → `User`) and indexes
- Query filtering, searching and pagination
- Centralized error handling with operational errors
- Environment-based configuration with dotenv

---

*Muhammad Tayyab — MERN Stack Developer (MongoDB · Express · React · Node.js)*
