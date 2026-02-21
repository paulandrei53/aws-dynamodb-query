# Query

Query items by partition key, with optional sort key conditions, filters, and pagination.

## Basic Query

```js
const items = await db.table('orders')
  .where('customer_id').eq('cus_123')
  .query();
```

## Query with Sort Key Conditions

For the partition key, the comparison is always `eq()`. For the sort key, you can use:

```js
// Equal
.where('sort_key').eq(100)

// Less than / Less than or equal
.where('sort_key').lt(100)
.where('sort_key').le(100)

// Greater than / Greater than or equal
.where('sort_key').gt(100)
.where('sort_key').ge(100)

// Between (inclusive)
.where('sort_key').between(100, 200)

// Begins with (strings only)
.where('sort_key').begins_with('2024-01')
```

## Query an Index

```js
const items = await db.table('orders')
  .index('index-customer_id')
  .where('customer_id').eq('cus_123')
  .query();
```

## Select Specific Attributes

```js
// Array syntax
const items = await db.table('orders')
  .where('customer_id').eq('cus_123')
  .select(['order_id', 'amount', 'created_at'])
  .query();

// Multiple arguments
const items = await db.table('orders')
  .where('customer_id').eq('cus_123')
  .select('order_id', 'amount', 'created_at')
  .query();

// Nested attributes and array indexes
const items = await db.table('orders')
  .where('customer_id').eq('cus_123')
  .select(['order_id', 'shipping.city', 'items[0]'])
  .query();

// All attributes (including non-projected, LSI only)
const items = await db.table('orders')
  .index('my-lsi-index')
  .select(DynamoDB.ALL)
  .where('customer_id').eq('cus_123')
  .query();
```

## Filters (FilterExpression)

Filters are applied **after** the query, on the results. They do not reduce consumed capacity.

```js
const items = await db.table('orders')
  .where('customer_id').eq('cus_123')
  .filter('status').eq('active')
  .filter('amount').gt(100)
  .query();
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

`.having()` is an alias for `.filter()`.

## Descending Order

```js
const items = await db.table('orders')
  .where('customer_id').eq('cus_123')
  .descending()
  .query();
```

## Limit Results

```js
const items = await db.table('orders')
  .where('customer_id').eq('cus_123')
  .limit(10)
  .query();
```

## Consistent Read

```js
const items = await db.table('orders')
  .where('customer_id').eq('cus_123')
  .consistentRead()
  .query();
```

## Pagination

Use the callback form to access `this.LastEvaluatedKey`:

```js
let lastKey = null;

do {
  const items = await new Promise((resolve, reject) => {
    db.table('orders')
      .where('customer_id').eq('cus_123')
      .resume(lastKey)
      .limit(100)
      .query(function (err, data) {
        if (err) return reject(err);
        lastKey = this.LastEvaluatedKey;
        resolve(data);
      });
  });

  console.log(`Got ${items.length} items`);
} while (lastKey);
```

## Full Example

```js
db.table('orders')
  .index('index-customer_id')
  .select(['order_id', 'amount', 'status'])
  .where('customer_id').eq('cus_123')
  .where('created_at').between('2024-01-01', '2024-12-31')
  .filter('status').eq('completed')
  .descending()
  .limit(25)
  .consistentRead()
  .query(function (err, data, raw) {
    console.log('LastEvaluatedKey:', this.LastEvaluatedKey);
    console.log('ConsumedCapacity:', this.ConsumedCapacity);
    console.log(err, data);
  });
```
