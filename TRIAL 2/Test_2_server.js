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
//
// EDGE-CASE DECISION:
// The spec calls out an unhandled edge case on this endpoint. The case is:
// what should happen when `?status=` is provided but matches zero tasks
// (either because the value is empty, e.g. `?status=`, or because no task
// currently has that status, e.g. `?status=banana`)?
//
// Decision: return 200 with an empty `tasks` array. A filter that matches
// nothing is not an error — the client asked a valid question and the
// answer is "none". Returning 404 here would conflate "resource missing"
// with "query produced no results", which makes pagination and UI code
// harder to write. We also explicitly ignore `?status=` with an empty
// value (treat it as "no filter") so a stray empty query param doesn't
// silently hide every task.
app.get('/tasks', (req, res) => {
  const tasks = loadTasks();
  const { status } = req.query;
  if (status && status.trim() !== '') {
    const filtered = tasks.filter(t => t.status === status);
    return res.json({ success: true, tasks: filtered });
  }
  res.json({ success: true, tasks });
});

// POST /tasks
app.post('/tasks', (req, res) => {
  const { title, status } = req.body;

  // BUG FIX: `title` was being assigned without validation, so a missing
  // or blank title would create a task with `title: undefined`. The spec
  // requires returning 400 when title is missing.
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'title is required and must be a non-empty string',
    });
  }

  const tasks = loadTasks();
  const newTask = {
    id: Date.now(),
    title: title,
    // BUG FIX: `status` was assigned directly from req.body with no
    // default, so omitting it produced a task with `status: undefined`.
    // The spec says status defaults to "pending" if not provided.
    status: typeof status === 'string' && status.trim() !== '' ? status : 'pending',
  };
  tasks.push(newTask);
  saveTasks(tasks);

  // BUG FIX: The original sent the default 200 status. For resource
  // creation the spec requires 201 Created.
  res.status(201).json({ success: true, task: newTask });
});

// PATCH /tasks/:id
app.patch('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const { status } = req.body;

  // BUG FIX: `status` was applied to the task with no validation, so a
  // PATCH with no body (or a non-string status) would overwrite the
  // task's status with `undefined`. We reject those requests with 400.
  if (typeof status !== 'string' || status.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'status is required and must be a non-empty string',
    });
  }

  // BUG FIX: req.params.id is always a STRING (e.g. "1717000000000"),
  // but tasks are stored with a NUMERIC id from Date.now(). The original
  // `t.id === req.params.id` compared number to string with strict
  // equality and was therefore always false — meaning every PATCH
  // returned 404, even for existing tasks. We coerce the param to a
  // number for comparison. Using Number() (not parseInt) so that an
  // entirely non-numeric id like "abc" becomes NaN and reliably fails
  // to match rather than silently matching id 0 or similar.
  const idNum = Number(req.params.id);
  const task = Number.isNaN(idNum) ? undefined : tasks.find(t => t.id === idNum);
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  task.status = status;
  saveTasks(tasks);
  res.json({ success: true, task });
});

// DELETE /tasks/:id
app.delete('/tasks/:id', (req, res) => {
  const tasks = loadTasks();

  // BUG FIX (same as PATCH): string-vs-number id comparison. findIndex
  // with `t.id === req.params.id` always returned -1, so the endpoint
  // never actually found the task it was asked to delete.
  const idNum = Number(req.params.id);
  const index = Number.isNaN(idNum) ? -1 : tasks.findIndex(t => t.id === idNum);

  // BUG FIX: The original never checked for index === -1. Combined with
  // the next bug, this meant a missing id would call splice(-1, 1) —
  // which silently removes the LAST task in the list — instead of
  // returning 404 as the spec requires.
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  // BUG FIX: The original did `tasks = tasks.splice(index, 1)`. splice
  // mutates the array AND returns the REMOVED elements, so this
  // reassigned `tasks` to a one-element array containing only the
  // deleted task, then wrote that to disk — wiping out every other task
  // in the database on every delete. The correct usage is to call
  // splice for its side effect and then save the (now-shorter) array.
  tasks.splice(index, 1);
  saveTasks(tasks);
  res.json({ success: true, message: 'Task deleted' });
});

app.listen(3000, () => {
  console.log('Launchmen Task API running on http://localhost:3000');
});