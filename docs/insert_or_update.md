# Insert or Update (Upsert)

Creates the item if it doesn't exist, or updates it if it does. Primary key fields are extracted automatically.

Use `schema()` to prevent an extra `describeTable` call.

## Basic Upsert

```js
await db.table('users').insert_or_update({
  email: 'test@test.com',
  name: 'Alice',
  active: true,
});
```

## With Increment and Sets

```js
await db.table('users').insert_or_update({
  email: 'test@test.com',

  // Set or overwrite
  name: 'Smith',
  password: 'qwert',

  // Increment by 5 (creates with 5 if doesn't exist)
  page_views: db.add(5),

  // Lists
  list: [5, 'a', {}, []],

  // Push to end of list
  phones: db.add([5, 'a']),

  // Add to String Set
  string_set: db.add(db.SS(['ddd', 'eee'])),

  // Add to Number Set
  number_set: db.add(db.NS([444, 555])),

  // Delete an attribute
  unneeded_attribute: db.del(),

  // Remove elements from String Set
  old_tags: db.del(db.SS(['ccc', 'ddd'])),

  // Remove elements from Number Set
  old_numbers: db.del(db.NS([111, 222])),
});
```

## With ReturnValues

```js
const old = await db.table('users')
  .return('UPDATED_OLD')
  .insert_or_update({
    email: 'test@test.com',
    name: 'Updated Name',
    page_views: db.add(1),
  });

console.log(old); // previous values of updated attributes
```

## With Callback

```js
db.table('users')
  .return('UPDATED_OLD')
  .insert_or_update({
    email: 'test@test.com',
    name: 'Alice',
    login_count: db.add(1),
  }, function (err, data) {
    console.log(err, data);
  });
```
