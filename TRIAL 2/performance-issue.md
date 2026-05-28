# SQL Performance — Code Review Task

## Scenario

The page became slow, and you need find why.

## Schema

```sql
CREATE TABLE authors (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  author_id  INT NOT NULL REFERENCES authors(id),
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## The Code

```typescript
// Get the 50 most recent posts
const posts = await db.query(
  `SELECT id, author_id, title, created_at
   FROM posts
   ORDER BY created_at DESC
   LIMIT 50`
);

// Attach author info to each post
const postsWithAuthors = [];
for (const post of posts) {
  const author = await db.query(
    `SELECT id, name, email
     FROM authors
     WHERE id = ${post.author_id}`
  );
  postsWithAuthors.push({ ...post, author: author[0] });
}

return postsWithAuthors;
```

## Questions

1. **Identify the issue.** What performance problem does this code have?
2. **How you can fix.**



## ANSWER
1. Issues:
  a. N+1 Queries: The first query fetches 50 posts in one round trip. The loop then runs another 50 queries — one per post — just to look up the author. That's 51 round trips to the database to render a single page.
  Fix: collapse it into a single query with a JOIN.

```typescript
const rows = await db.query(
  `SELECT
     p.id, p.author_id, p.title, p.created_at,
     a.id   AS author_id_full,
     a.name AS author_name,
     a.email AS author_email
   FROM posts p
   JOIN authors a ON a.id = p.author_id
   ORDER BY p.created_at DESC
   LIMIT 50`
);
```
2. SQL injection at:
```typescript
`SELECT ... WHERE id = ${post.author_id}`
```
Fix: Use parameterized querry instead:
```typescript
db.query(`SELECT id, name, email FROM authors WHERE id = $1`, [post.author_id]);
```

3. Add index to created_at field of post table. This prevent the database to scan full page when query

