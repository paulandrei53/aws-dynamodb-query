# Scan

Scan reads every item in the table or index, optionally filtering the results.

**Note:** Scans consume capacity based on the total items scanned, not the items returned. Use queries when possible.

## Basic Scan

```js
const items = await db.table('users').scan();
```

## Select Specific Attributes

```js
const items = await db.table('users').select(['name', 'email', 'address.city', 'phones[0]']).limit(10).scan();
```

## Filters

```js
const items = await db.table('users').filter('country').eq('Canada').scan();
```

```js
const items = await db.table('users').filter('age').between(18, 65).filter('active').eq(true).scan();
```

All filter operators:

```js
.filter('attr').eq(value)          // =
.filter('attr').ne(value)          // <>
.filter('attr').lt(value)          // <
.filter('attr').le(value)          // <=
.filter('attr').gt(value)          // >
.filter('attr').ge(value)          // >=
.filter('attr').between(a, b)      // BETWEEN a AND b
.filter('attr').begins_with(value) // begins_with()
.filter('attr').contains(value)    // contains()
.filter('attr').not_contains(value)// NOT contains()
.filter('attr').in([a, b, c])      // IN (a, b, c)
.filter('attr').not_null()         // attribute_exists()
.filter('attr').null()             // attribute_not_exists()
```

Use `.filter()` for post-scan filters.

## Scan an Index (GSI)

```js
const items = await db.table('users').index('country-index').scan();
```

## Pagination

```js
let lastKey = null;

do {
	const result = await db.table('users').resume(lastKey).limit(1000).scan();

	// process result.items...
	console.log(`Got ${result.count} items`);
	lastKey = result.lastKey;
} while (lastKey);
```

## Pagination with Callback

```js
db.table('users')
	.limit(1000)
	.scan(function (err, items, raw) {
		if (err) return console.error(err);
		console.log(items);
		console.log(this.LastEvaluatedKey);
	});
```

## With Callback

```js
db.table('users')
	.select(['name', 'country'])
	.filter('country')
	.eq('Canada')
	.limit(10)
	.scan(function (err, data) {
		console.log(err, data);
		console.log(this.ConsumedCapacity);
	});
```
