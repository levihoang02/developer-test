// ============================================================
// Launchmen Task API
// Developer Candidate Test — Trial 2
// ============================================================
// Instructions:
//   Run with: npm install && node server.js
//   Server starts on: http://localhost:3000
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const DB_FILE = path.join(__dirname, 'tasks.json');

function loadTasks() {
  if (!fs.existsSync(DB_FILE)) return [];
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveTasks(tasks) {
  fs.writeFileSync(DB_FILE, JSON.stringify(tasks, null, 2));
}

// GET /tasks
// Returns all tasks. Supports optional status filter.
app.get('/tasks', (req, res) => {
  const tasks = loadTasks();
  const { status } = req.query;
  if (status) {
    const filtered = tasks.filter(t => t.status === status);
    return res.json({ success: true, tasks: filtered });
  }
  res.json({ success: true, tasks });
});

// POST /tasks
app.post('/tasks', (req, res) => {
  const { title, status } = req.body;
  const tasks = loadTasks();
  const newTask = {
    id: Date.now(),
    title: title,
    status: status,
  };
  tasks.push(newTask);
  saveTasks(tasks);
  res.json({ success: true, task: newTask });
});

// PATCH /tasks/:id
app.patch('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const { status } = req.body;
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  task.status = status;
  saveTasks(tasks);
  res.json({ success: true, task });
});

// DELETE /tasks/:id
app.delete('/tasks/:id', (req, res) => {
  let tasks = loadTasks();
  const index = tasks.findIndex(t => t.id === req.params.id);
  tasks = tasks.splice(index, 1);
  saveTasks(tasks);
  res.json({ success: true, message: 'Task deleted' });
});

app.listen(3000, () => {
  console.log('Launchmen Task API running on http://localhost:3000');
});


// ## ANSWER
// 1. Issues:
//   a. N+1 Queries: The first query fetches 50 posts in one round trip. The loop then runs another 50 queries — one per post — just to look up the author. That's 51 round trips to the database to render a single page.
//   Fix: collapse it into a single query with a JOIN.

// ```typescript
// const rows = await db.query(
//   `SELECT
//      p.id, p.author_id, p.title, p.created_at,
//      a.id   AS author_id_full,
//      a.name AS author_name,
//      a.email AS author_email
//    FROM posts p
//    JOIN authors a ON a.id = p.author_id
//    ORDER BY p.created_at DESC
//    LIMIT 50`
// );
// ```
// 2. SQL injection at:
// ```typescript
// `SELECT ... WHERE id = ${post.author_id}`
// ```
// Fix: Use parameterized querry instead:
// ```typescript
// db.query(`SELECT id, name, email FROM authors WHERE id = $1`, [post.author_id]);
// ```

// 3. Add index to created_at field of post table. This prevent the database to scan full page when query