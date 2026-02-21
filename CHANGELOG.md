# Changelog

## 1.0.0

### Features

- Fluent chainable API for DynamoDB (`.table().where().eq().query()`)
- Built on AWS SDK v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- Pure async/await — all operations return Promises
- `query()` and `scan()` return `{ items, lastKey, count, scannedCount, consumedCapacity }`
- Write operations return `{ attributes, consumedCapacity }`
- `describe()` returns `{ table, consumedCapacity }`
- All comparison operators (eq, ne, lt, le, gt, ge, between, begins_with, contains, in, etc.)
- Type helpers (SS, NS, N, S, L, add, del)
- Schema pre-registration to avoid DescribeTable API calls
- DescribeTable results are cached after first call
- Configurable parsing (empty_string_replace_as, stringset_parse_as_set, etc.)
- Debug mode with `[aws-dynamodb-query]` log prefix
- Error events via `db.on('error', handler)`
- ESM native, Node 18+
