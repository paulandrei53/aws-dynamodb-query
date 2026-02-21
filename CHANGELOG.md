# Changelog

## 1.0.0

- Fluent chainable API for DynamoDB (`.table().where().eq().query()`)
- Built on AWS SDK v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- Native Promise support on every operation, with optional callback support
- Full `async/await` compatibility
- Callback context provides `this.LastEvaluatedKey` and `this.ConsumedCapacity`
- All comparison operators (eq, ne, lt, le, gt, ge, between, begins_with, contains, in, etc.)
- Type helpers (SS, NS, N, S, L, add, del)
- Schema pre-registration to avoid describeTable calls
- Configurable parsing (empty_string_replace_as, stringset_parse_as_set, etc.)
- Debug mode
- ESM native, Node 18+
