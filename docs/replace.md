# Replace

Completely replaces an existing item. **Fails if the item does not exist.**

## Basic Replace

```js
await db.table('users').replace({
  email: 'test@test.com',
  name: 'Alice Updated',
  active: false,
});
```

## With ReturnValues

```js
const old = await db.table('users')
  .return('ALL_OLD')
  .replace({
    email: 'test@test.com',
    name: 'Alice Replaced',
  });

console.log(old); // the item before replacement
```

## With Callback

```js
db.table('users').replace({
  email: 'test@test.com',
  name: 'Alice Replaced',
}, function (err, data) {
  console.log(err, data);
});
```
