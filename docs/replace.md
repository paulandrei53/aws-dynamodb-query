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
const result = await db.table('users').return('ALL_OLD').replace({
	email: 'test@test.com',
	name: 'Alice Replaced',
});

console.log(result.attributes); // the item before replacement
console.log(result.consumedCapacity);
```
