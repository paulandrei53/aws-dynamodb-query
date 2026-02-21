# Insert or Replace

Inserts a new item, or **completely replaces** the existing item if the primary key already exists. Unlike `insert_or_update`, this overwrites the entire item — any attributes not included will be removed.

## Basic Insert or Replace

```js
await db.table('users').insert_or_replace({
  email: 'test@test.com',
  name: 'Alice',
  active: true,
  created_at: Date.now(),
});
```

## With All Data Types

```js
await db.table('demo').insert_or_replace({
  partition_key: 'pk_001',
  email: 'test@test.com',
  active: true,
  score: 42,
  last_login_at: null,
  avatar: Buffer.from('iVBOR...', 'base64'),
  tags: ['dev', 'nodejs'],
  address: { street: '123 Main St', city: 'Toronto' },
  roles: db.SS(['admin', 'editor']),
  scores: db.NS([100, 200, 300]),
});
```

## With Callback

```js
db.table('users').insert_or_replace({
  email: 'test@test.com',
  name: 'Alice',
  reset: true,
}, function (err, data) {
  console.log(err, data);
});
```
