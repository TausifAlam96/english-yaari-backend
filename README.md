# English Yaari — Backend Developer Assignment

REST API for a platform where **teachers publish sessions**, **users book them**, and **completed sessions appear in the user's history**.

Built with **Node.js, TypeScript, Express.js, MongoDB and Mongoose**, with all required async/await, centralized error handling, environment-based configuration and the two mandatory MongoDB **aggregation pipeline** endpoints.

---

## 1. Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 20+ |
| Language | TypeScript (strict mode) |
| Framework | Express 4 |
| Database | MongoDB |
| ODM | Mongoose 8 |
| Dev runner | tsx |
| Config | dotenv |

---

## 2. Project structure

```
.
├── postman/
│   └── Backend-Assignment.postman_collection.json
├── src/
│   ├── config/
│   │   ├── db.ts                 # Mongo connection + graceful disconnect
│   │   └── env.ts                # Env loading and validation
│   ├── controllers/
│   │   ├── session.controller.ts # APIs 2–5
│   │   ├── teacher.controller.ts # Supporting endpoints
│   │   └── user.controller.ts    # APIs 1 and 6
│   ├── middleware/
│   │   └── error.middleware.ts   # 404 + centralized error handler
│   ├── models/
│   │   ├── session.model.ts
│   │   ├── teacher.model.ts
│   │   └── user.model.ts
│   ├── routes/
│   │   ├── session.routes.ts
│   │   ├── teacher.routes.ts
│   │   └── user.routes.ts
│   ├── utils/
│   │   ├── AppError.ts
│   │   ├── asyncHandler.ts
│   │   ├── date.ts
│   │   └── validate.ts
│   ├── app.ts                    # Express app (middleware + routes)
│   ├── seed.ts                   # Demo data
│   └── server.ts                 # Bootstrap + graceful shutdown
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Setup

### Prerequisites

- Node.js 20 or newer
- MongoDB running locally or a MongoDB Atlas connection string
- npm

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env        # Windows: copy .env.example .env

# 3. Update MONGODB_URI in .env if needed
#    local: mongodb://127.0.0.1:27017/english_yaari
#    atlas: mongodb+srv://<user>:<pass>@<cluster>/english_yaari

# 4. Optional: seed a demo teacher, user and three sessions for tomorrow
npm run seed

# 5. Start in development (watch mode)
npm run dev
```

Server: **http://localhost:5000**  
Health check: **GET /health**

### Production build

```bash
npm run build
npm start
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm run seed` | Insert demo teacher, user and sessions |

### Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `5000` | HTTP port |
| `MONGODB_URI` | No | `mongodb://127.0.0.1:27017/english_yaari` | Mongo connection string |

---

## 4. Data models

### User

| Field | Type | Notes |
| --- | --- | --- |
| `fullName` | String | required |
| `email` | String | required, **unique**, lowercased |
| `phone` | String | optional |
| `createdAt` / `updatedAt` | Date | timestamps |

### Teacher

| Field | Type | Notes |
| --- | --- | --- |
| `fullName` | String | required |
| `email` | String | required |
| `specialization` | String | required |
| `experience` | Number | required, ≥ 0 (years) |
| `createdAt` / `updatedAt` | Date | timestamps |

### Session

| Field | Type | Notes |
| --- | --- | --- |
| `teacherId` | ObjectId → Teacher | required |
| `userId` | ObjectId → User \| null | `null` until booked |
| `startTime` | Date | required |
| `endTime` | Date | required, must be after `startTime` |
| `status` | `AVAILABLE` \| `BOOKED` \| `COMPLETED` | defaults to `AVAILABLE` |
| `completedAt` | Date \| null | set when completed |
| `createdAt` / `updatedAt` | Date | timestamps |

Indexes: `userId`, `teacherId`, `{ status, startTime }` (available-by-date), `{ userId, status, startTime }` (user history).

---

## 5. API reference

Base URL: `http://localhost:5000`  
All request/response bodies are JSON.

Success envelope:

```json
{ "success": true, "message": "...", "data": {} }
```

Error envelope:

```json
{ "success": false, "message": "Human readable error", "details": [] }
```

### API 1 — Create User

`POST /users`

```json
{
  "fullName": "Rahul Verma",
  "email": "rahul.verma@example.com",
  "phone": "+919876543210"
}
```

- `201` user created
- `400` validation error / missing fields / invalid email
- `409` email already exists

### API 2 — Create Session

`POST /sessions`

```json
{
  "teacherId": "6712a1f3c9e77b4a1c8d9e10",
  "startTime": "2026-11-02T10:00:00.000Z",
  "endTime": "2026-11-02T11:00:00.000Z"
}
```

- `201` session created with status `AVAILABLE` and `userId: null`
- `400` `endTime` not greater than `startTime`, invalid ObjectId or date
- `404` teacher not found

### API 3 — Available Sessions for Booking

`GET /sessions/available?dateTimestamp={timestamp}`

- `dateTimestamp` is required and may be in **milliseconds or seconds** (seconds are auto-detected).
- Returns all `AVAILABLE` sessions whose `startTime` falls within that calendar day (server local timezone), sorted by start time.
- **Implemented with an aggregation pipeline:** `$match` → `$lookup` (teacher) → `$unwind` → `$addFields` → `$project` → `$sort`.

Example response:

```json
{
  "success": true,
  "data": {
    "date": "2026-11-02T00:00:00.000Z",
    "total": 1,
    "sessions": [
      {
        "_id": "6712a2...",
        "teacherId": "6712a1...",
        "userId": null,
        "startTime": "2026-11-02T10:00:00.000Z",
        "endTime": "2026-11-02T11:00:00.000Z",
        "status": "AVAILABLE",
        "completedAt": null,
        "teacher": {
          "_id": "6712a1...",
          "fullName": "Priya Sharma",
          "email": "priya.sharma@example.com",
          "specialization": "Spoken English",
          "experience": 7
        }
      }
    ]
  }
}
```

- `400` missing/invalid `dateTimestamp`

### API 4 — Book Session

`POST /sessions/:id/book`

```json
{ "userId": "6712a3f3c9e77b4a1c8d9e11" }
```

Checks, in order: valid ids → user exists (`404`) → session exists (`404`) → status is `AVAILABLE` (`409`, with a specific message for already-booked/completed sessions) → conditional update `{ status: AVAILABLE }` to book.

The final write is atomic (`findOneAndUpdate` filtered on `status: AVAILABLE`), so a race between two users can never double-book: the loser receives `409`.

- `200` booked, returns the session with populated `teacherId`
- `400` invalid id
- `404` user/session not found
- `409` session already booked, completed, or taken concurrently

### API 5 — Mark Session Complete

`PATCH /sessions/:id/complete`

- Session must exist (`404`).
- Only a `BOOKED` session can be completed; `AVAILABLE` or already `COMPLETED` returns `409`.
- Sets `status: COMPLETED` and `completedAt: new Date()` atomically with a `{ status: BOOKED }` guard.

`200` returns the updated session.

### API 6 — User Session List

`GET /users/:id/sessions`

- `404` if the user does not exist.
- **Implemented with an aggregation pipeline:** `$match` (user's BOOKED/COMPLETED sessions) → `$lookup` (teacher) → `$unwind` → `$addFields` → `$project` → `$facet` (upcoming vs completed).

```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "fullName": "Rahul Verma", "email": "rahul.verma@example.com" },
    "upcomingSessions": [ { "_id": "...", "status": "BOOKED", "startTime": "...", "teacher": { "...": "..." } } ],
    "completedSessions": [ { "_id": "...", "status": "COMPLETED", "completedAt": "...", "teacher": { "...": "..." } } ]
  }
}
```

Upcoming sessions are sorted by `startTime` ascending; completed sessions by `completedAt` descending.

### Supporting endpoints (not graded, for testing convenience)

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/teachers` | Create a teacher so a real `teacherId` exists |
| `GET` | `/teachers` | List teachers |
| `GET` | `/users` | List users |
| `GET` | `/health` | Health check |

---

## 6. Error handling

All errors flow through `src/middleware/error.middleware.ts`:

- `AppError` → its status code and message
- Mongoose `ValidationError` → `400` with an array of messages
- Mongoose `CastError` → `400`
- MongoDB duplicate key `11000` → `409` (`email must be unique`)
- Unknown route → `404`
- Unexpected error → `500` (stack included only outside production)

Async controllers are wrapped in `asyncHandler`, so rejected promises always reach the central handler.

---

## 7. Testing with Postman

Import [`postman/Backend-Assignment.postman_collection.json`](postman/Backend-Assignment.postman_collection.json).

`baseUrl` defaults to `http://localhost:5000`. Run the folders in order:

1. **Users → Create User** (captures `userId`)
2. **Teachers → Create Teacher** (captures `teacherId`)
3. **Sessions → Create Session** (captures `sessionId` and the matching `dateTimestamp`)
4. **Sessions → Available Sessions**
5. **Sessions → Book Session**
6. **Sessions → Complete Session**
7. **Users → Get User Sessions**

Each request includes tests asserting status codes and state transitions.

Quick manual smoke test:

```bash
curl http://localhost:5000/health

curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Rahul Verma\",\"email\":\"rahul@example.com\"}"
```

---

## 8. Design notes

- **Validation** is explicit (no extra validation library) and throws `400 AppError`s with field-specific messages.
- **Dates:** `endTime > startTime` is enforced in both the controller and a Mongoose schema validator.
- **Concurrency:** booking and completion use conditional `findOneAndUpdate` so status transitions are atomic.
- **Aggregations:** required for APIs 3 and 6; both also `$lookup` the teacher so clients don't need extra requests.
- **Errors:** one handler, one response shape, correct status codes (`200/201/400/404/409/500`).
- **Config:** everything runs off `.env`; `env.ts` validates `PORT` and provides sane local defaults.
