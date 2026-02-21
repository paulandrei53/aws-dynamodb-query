# Delete

Delete an item by its primary key.

## Basic Delete

```js
await db.table('users').where('email').eq('test@test.com').delete();
```

## Composite Key (Hash + Range)

```js
await db.table('messages').where('conversation_id').eq('conv_123').where('timestamp').eq(1700000000).delete();
```

## With ReturnValues

Get the deleted item's data back:

```js
const result = await db.table('users').where('email').eq('test@test.com').return('ALL_OLD').delete();

console.log(result.attributes); // the item that was deleted
console.log(result.consumedCapacity);
```
