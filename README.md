# aws-dynamodb-query

A simple and elegant DynamoDB client for Node.js.

[![npm version](https://img.shields.io/npm/v/aws-dynamodb-query.svg)](https://www.npmjs.com/package/aws-dynamodb-query)
[![npm downloads](https://img.shields.io/npm/dm/aws-dynamodb-query.svg)](https://www.npmjs.com/package/aws-dynamodb-query)
[![license](https://img.shields.io/npm/l/aws-dynamodb-query.svg)](https://github.com/paulandrei53/aws-dynamodb-query/blob/master/LICENSE)

```bash
npm install aws-dynamodb-query
```

## Features

- **AWS SDK v3** — Built on `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`
- **Fluent API** — Chainable query builder that reads like English
- **Promises + Callbacks** — Every operation returns a Promise, or accepts a callback
- **ESM native** — Modern ES modules, Node 18+

## Quick Start

```js
import DynamoDB from 'aws-dynamodb-query';

// With credentials
const db = new DynamoDB({
	accessKeyId: 'XXXXXXXXXX',
	secretAccessKey: 'XXXXXXXXXX',
	region: 'us-east-1',
});

// With IAM role (Lambda, EC2, ECS)
const db = new DynamoDB();
```

## Usage

```js
// Get
const user = await db.table('users').where('id').eq('123').get();

// Query with index
const orders = await db.table('orders').index('index-customer_id').where('customer_id').eq('cus_123').filter('status').eq('active').limit(10).descending().query();

// Scan
const all = await db.table('users').scan();

// Insert (fails if key exists)
await db.table('users').insert({ id: '123', name: 'Alice' });

// Update
await db.table('users').where('id').eq('123').update({ name: 'Bob' });

// Upsert
await db.table('users').insert_or_update({ id: '123', login_count: db.add(1) });

// Delete
await db.table('users').where('id').eq('123').delete();
```

## Callback API

All operations also accept a callback. Inside the callback, `this` provides `LastEvaluatedKey` and `ConsumedCapacity`:

```js
db.table('orders')
	.index('index-customer_id')
	.where('customer_id')
	.eq('cus_123')
	.limit(100)
	.query(function (err, items, raw) {
		if (err) return console.error(err);
		console.log(items);
		console.log(this.LastEvaluatedKey);
		console.log(this.ConsumedCapacity);
	});
```

## Pagination

```js
let lastKey = null;
do {
	const result = await db.table('users').resume(lastKey).limit(100).query();

	console.log(result.items);
	lastKey = result.lastKey;
} while (lastKey);
```

## Operators

| Method                      | Operator                 |
| --------------------------- | ------------------------ |
| `.eq(value)`                | `=`                      |
| `.ne(value)`                | `<>`                     |
| `.lt(value)` / `.le(value)` | `<` / `<=`               |
| `.gt(value)` / `.ge(value)` | `>` / `>=`               |
| `.between(a, b)`            | `BETWEEN`                |
| `.begins_with(value)`       | `begins_with()`          |
| `.contains(value)`          | `contains()`             |
| `.not_contains(value)`      | `NOT contains()`         |
| `.in([values])`             | `IN (...)`               |
| `.not_null()`               | `attribute_exists()`     |
| `.null()`                   | `attribute_not_exists()` |

## Type Helpers

```js
db.add(5); // Increment number
db.SS(['a', 'b']); // String Set
db.NS([1, 2, 3]); // Number Set
db.N(42); // Number
db.S('hello'); // String
db.L([1, 'a']); // List
db.del(db.SS(['a'])); // Remove from set
```

## Schema Pre-registration

Avoid `describeTable` API calls:

```js
db.schema([
	{
		TableName: 'users',
		KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
	},
]);
```

## Configuration

```js
DynamoDB.config({
	stringset_parse_as_set: true,
	numberset_parse_as_set: true,
	empty_string_replace_as: '\0',
});
```

## [Documentation](https://github.com/paulandrei53/aws-dynamodb-query/tree/master/docs)

## License

MIT
