# Insert

Insert a new item. **Fails if an item with the same primary key already exists.**

Use `schema()` to prevent an extra `describeTable` call on every insert.

## Basic Insert

```js
await db.table('users').insert({
  email: 'test@test.com',
  name: 'Alice',
  active: true,
});
```

## All Data Types

```js
await db.table('demo').insert({
  partition_key: 'pk_001',
  sort_key: 1,

  // String
  name: 'Alice',

  // Number
  age: 30,

  // Boolean
  active: true,

  // Null
  deleted_at: null,

  // Binary
  avatar: Buffer.from('iVBOR...', 'base64'),

  // List (mixed types)
  tags: ['admin', 42, true, null, { nested: 'object' }, ['nested_array']],

  // Map (object)
  address: {
    street: '123 Main St',
    city: 'Toronto',
    zip: 'M5V 1A1',
  },

  // String Set
  roles: db.SS(['admin', 'editor']),

  // Number Set
  scores: db.NS([100, 200, 300]),
});
```

## With ReturnValues

```js
const result = await db.table('users')
  .return('ALL_OLD')
  .insert({
    email: 'test@test.com',
    name: 'Alice',
  });
```

## With Callback

```js
db.table('users').insert({
  email: 'test@test.com',
  name: 'Alice',
}, function (err, data) {
  console.log(err, data);
});
```
