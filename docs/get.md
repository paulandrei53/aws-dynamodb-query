# Get Item

Retrieve a single item by its primary key.

## Basic Get

```js
const item = await db.table('users').where('email').eq('test@test.com').get();
```

## Composite Key (Hash + Range)

```js
const item = await db.table('messages').where('conversation_id').eq('conv_123').where('timestamp').eq(1700000000).get();
```

## Select Specific Attributes

```js
const item = await db.table('users').where('email').eq('test@test.com').select(['name', 'email', 'created_at']).get();
```

## Nested Attributes and Array Indexes

```js
const item = await db.table('users').where('email').eq('test@test.com').select(['name', 'address.city', 'phones[0]']).get();
```

## Consistent Read

```js
const item = await db.table('users').where('email').eq('test@test.com').consistentRead().get();
```
