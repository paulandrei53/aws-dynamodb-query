# Data Types

DynamoDB supports these data types. `aws-dynamodb-query` handles serialization automatically for most types, with explicit helpers for Sets.

## Automatic Types

These are serialized automatically from JavaScript values:

| JavaScript | DynamoDB Type | Example                         |
| ---------- | ------------- | ------------------------------- |
| `string`   | S (String)    | `'hello'`                       |
| `number`   | N (Number)    | `42`, `3.14`                    |
| `boolean`  | BOOL          | `true`, `false`                 |
| `null`     | NULL          | `null`                          |
| `Buffer`   | B (Binary)    | `Buffer.from('data', 'base64')` |
| `Array`    | L (List)      | `[1, 'a', true, null]`          |
| `Object`   | M (Map)       | `{ key: 'value' }`              |

## Explicit Type Helpers

Use these for Set types and special operations:

### String Set (SS)

```js
db.SS(['admin', 'editor', 'viewer']);
```

### Number Set (NS)

```js
db.NS([100, 200, 300]);
```

### Binary Set (BS)

```js
db.BS([Buffer.from('item1', 'base64'), Buffer.from('item2', 'base64')]);
```

### Force Number (N)

```js
db.N(42);
db.N('42'); // string that converts to number
```

### Force String (S)

```js
db.S('hello');
```

### Force List (L)

```js
db.L([1, 'mixed', true]);
```

## Update Helpers

### add() — Increment or Add to Set

```js
// Increment number
db.add(); // +1
db.add(5); // +5

// Add to List
db.add(['new_item_1', 'new_item_2']);

// Add to String Set
db.add(db.SS(['new_tag']));

// Add to Number Set
db.add(db.NS([777]));
```

### del() — Delete Attribute or Remove from Set

```js
// Delete attribute entirely (set value to undefined)
{
	my_attr: undefined;
}

// Remove from attribute using del()
db.del(); // remove attribute

// Remove elements from String Set
db.del(db.SS(['old_tag']));

// Remove elements from Number Set
db.del(db.NS([999]));
```

## Parsing Configuration

Control how DynamoDB types are parsed back to JavaScript:

```js
import DynamoDB from 'aws-dynamodb-query';

DynamoDB.config({
	// Parse SS as Set instead of Array (default: false)
	stringset_parse_as_set: true,

	// Parse NS as Set instead of Array (default: false)
	numberset_parse_as_set: true,

	// Parse BS as Set instead of Array (default: false)
	binaryset_parse_as_set: true,
});
```

## Empty Strings

DynamoDB does not allow empty strings in certain contexts. Configure how they are handled:

```js
DynamoDB.config({
	// Replace empty strings with \0 (restored on parse)
	empty_string_replace_as: '\0',

	// Or ignore empty string attributes entirely
	empty_string_replace_as: undefined,

	// Or replace with null
	empty_string_replace_as: null,
});
```
