# Web Demo Server Notes

While most of the demo runs purely in the browser, a tiny backend helps collect email sign-ups and optional telemetry. These notes outline a simple Node.js service that pairs with the React front-end.

## Responsibilities

- Store beta sign-up emails in a SQLite database.
- Receive latency and token count metrics when the user opts in.
- Serve the static web demo files during development.

## Suggested Stack

- **Express** for a lightweight HTTP server.
- **SQLite** via `better-sqlite3` for zero-config persistence.
- **Vite middleware** to integrate with the front-end dev server.

## Endpoints

```
POST /api/signup { email: string }
POST /api/metrics { latencyMs: number, tokensIn: number, tokensOut: number }
```

Both return `{ ok: true }` and ignore additional properties.

## Basic Implementation Sketch

```ts
import express from 'express';
import Database from 'better-sqlite3';

const db = new Database('data.db');
const app = express();
app.use(express.json());

app.post('/api/signup', (req, res) => {
  const email = String(req.body.email || '').trim();
  if (email) db.prepare('INSERT INTO signups(email) VALUES (?)').run(email);
  res.json({ ok: true });
});

app.post('/api/metrics', (req, res) => {
  const { latencyMs, tokensIn, tokensOut } = req.body;
  db.prepare('INSERT INTO metrics(latencyMs, tokensIn, tokensOut) VALUES (?,?,?)').run(
    latencyMs,
    tokensIn,
    tokensOut,
  );
  res.json({ ok: true });
});

export default app;
```

This server is intentionally trivial. It can run locally or be deployed to a small VPS. Authentication and rate limiting are unnecessary for the early demo, but HTTPS should still be enabled in production.

The goal is to reduce friction for developers wanting to try the full pipeline. Having a predefined backend makes it clear how the front-end connects and what data is expected.
