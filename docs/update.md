# Update

Update attributes on an existing item. **Fails if the item does not exist.**

Use `schema()` to prevent an extra `describeTable` call.

## Basic Update

```js
await db.table('users').where('email').eq('test@test.com').update({
	name: 'Bob',
	active: true,
	subscription: null,
});
```

## Composite Key (Hash + Range)

```js
await db.table('messages').where('partition_key').eq('test@test.com').where('sort_key').eq(1234).update({
	password: 'new_password',
	name: 'Smith',
});
```

## Increment a Number

```js
await db
	.table('users')
	.where('email')
	.eq('test@test.com')
	.update({
		page_views: db.add(5), // increment by 5
		login_count: db.add(1), // increment by 1
	});
```

## Delete an Attribute

Set the value to `undefined` to remove an attribute:

```js
await db.table('users').where('email').eq('test@test.com').update({
	temp_token: undefined, // removes the attribute
	activation_code: undefined, // removes the attribute
});
```

## Sets — Update, Add, Remove

```js
await db
	.table('users')
	.where('email')
	.eq('test@test.com')
	.update({
		// Overwrite with a new String Set
		roles: db.SS(['admin', 'editor']),

		// Overwrite with a new Number Set
		scores: db.NS([100, 200, 300]),

		// Add elements to an existing String Set
		tags: db.add(db.SS(['new_tag_1', 'new_tag_2'])),

		// Add elements to an existing Number Set
		lucky_numbers: db.add(db.NS([7, 13])),

		// Remove elements from a String Set
		old_tags: db.del(db.SS(['deprecated_tag'])),

		// Remove elements from a Number Set
		old_numbers: db.del(db.NS([999])),
	});
```

## Add to a List (Array)

```js
await db
	.table('users')
	.where('email')
	.eq('test@test.com')
	.update({
		// Push elements to end of a List
		activity_log: db.add(['logged_in', 'viewed_dashboard']),
	});
```

## Lists, Maps, Binary

```js
await db
	.table('users')
	.where('email')
	.eq('test@test.com')
	.update({
		list: [5, 'a', {}, []],
		address: {
			street: '456 Oak Ave',
			city: 'Vancouver',
		},
		avatar: Buffer.from('iVBOR...', 'base64'),
	});
```

## With ReturnValues

```js
const result = await db.table('users').where('email').eq('test@test.com').return('ALL_OLD').update({ name: 'New Name' });

console.log(result.attributes); // previous item values
console.log(result.consumedCapacity);
```

**ReturnValues options:** `NONE`, `ALL_OLD`, `UPDATED_OLD`, `ALL_NEW`, `UPDATED_NEW`
