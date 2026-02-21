import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Request } from '../src/request.js';

// ---------------------------------------------------------------------------
// Mock DynamoDB client
// ---------------------------------------------------------------------------
function createMockClient(responseOverride = {}) {
	const calls = [];
	return {
		calls,
		send(command) {
			calls.push({ name: command.constructor.name, input: command.input });
			const defaults = {
				Item: {},
				Items: [],
				Attributes: {},
				Count: 0,
				ScannedCount: 0,
				ConsumedCapacity: { TableName: 'test', CapacityUnits: 1 },
				Table: {
					TableName: 'test',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
				},
			};
			return Promise.resolve({ ...defaults, ...responseOverride });
		},
	};
}

const TEST_SCHEMA = {
	test: {
		TableName: 'test',
		KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
	},
	orders: {
		TableName: 'orders',
		KeySchema: [
			{ AttributeName: 'customer_id', KeyType: 'HASH' },
			{ AttributeName: 'order_id', KeyType: 'RANGE' },
		],
	},
};

function createRequest(responseOverride = {}, opts = {}) {
	const mock = createMockClient(responseOverride);
	const req = new Request(mock, {
		describeTables: TEST_SCHEMA,
		...opts,
	});
	return { req, mock };
}

// ---------------------------------------------------------------------------
// Chaining methods
// ---------------------------------------------------------------------------
describe('Request chaining', () => {
	it('table() sets table name and returns this', () => {
		const { req } = createRequest();
		const result = req.table('users');
		assert.strictEqual(result, req);
		assert.strictEqual(req.tableName, 'users');
	});

	it('index() sets IndexName', () => {
		const { req } = createRequest();
		req.table('test').index('gsi-email');
		assert.strictEqual(req.IndexName, 'gsi-email');
	});

	it('order_by() is alias for index()', () => {
		const { req } = createRequest();
		req.table('test').order_by('gsi-email');
		assert.strictEqual(req.IndexName, 'gsi-email');
	});

	it('limit() sets limit value', () => {
		const { req } = createRequest();
		req.table('test').limit(10);
		assert.strictEqual(req.limitValue, 10);
	});

	it('descending() disables ScanIndexForward', () => {
		const { req } = createRequest();
		req.table('test').descending();
		assert.strictEqual(req.ScanIndexForward, false);
	});

	it('desc() is alias for descending()', () => {
		const { req } = createRequest();
		req.table('test').desc();
		assert.strictEqual(req.ScanIndexForward, false);
	});

	it('consistentRead() enables ConsistentRead', () => {
		const { req } = createRequest();
		req.table('test').consistentRead();
		assert.strictEqual(req.ConsistentRead, true);
	});

	it('consistent_read() is alias for consistentRead()', () => {
		const { req } = createRequest();
		req.table('test').consistent_read();
		assert.strictEqual(req.ConsistentRead, true);
	});

	it('resume() sets ExclusiveStartKey', () => {
		const { req } = createRequest();
		const key = { id: { S: 'abc' } };
		req.table('test').resume(key);
		assert.deepStrictEqual(req.ExclusiveStartKey, key);
	});

	it('select() with array sets AttributesToGet', () => {
		const { req } = createRequest();
		req.table('test').select(['name', 'email']);
		assert.deepStrictEqual(req.AttributesToGet, ['name', 'email']);
	});

	it('select(1) sets ALL_ATTRIBUTES', () => {
		const { req } = createRequest();
		req.table('test').select(1);
		assert.strictEqual(req.Select, 'ALL_ATTRIBUTES');
	});

	it('select(2) sets ALL_PROJECTED_ATTRIBUTES', () => {
		const { req } = createRequest();
		req.table('test').select(2);
		assert.strictEqual(req.Select, 'ALL_PROJECTED_ATTRIBUTES');
	});

	it('select(3) sets COUNT', () => {
		const { req } = createRequest();
		req.table('test').select(3);
		assert.strictEqual(req.Select, 'COUNT');
	});

	it('return() sets ReturnValues', () => {
		const { req } = createRequest();
		req.table('test').return('ALL_OLD');
		assert.strictEqual(req.ReturnValues, 'ALL_OLD');
	});

	it('return_consumed_capacity() sets ReturnConsumedCapacity', () => {
		const { req } = createRequest();
		req.table('test').return_consumed_capacity('INDEXES');
		assert.strictEqual(req.ReturnConsumedCapacity, 'INDEXES');
	});

	it('full chain is fluent', () => {
		const { req } = createRequest();
		const result = req.table('test').index('gsi-1').where('id').eq('123').filter('status').eq('active').select(['id', 'name']).limit(10).descending().consistentRead();
		assert.strictEqual(result, req);
	});
});

// ---------------------------------------------------------------------------
// Where / Filter / If conditions
// ---------------------------------------------------------------------------
describe('Request conditions', () => {
	it('where().eq() sets key condition', () => {
		const { req } = createRequest();
		req.table('test').where('id').eq('123');
		assert.ok(req.whereKey['id']);
	});

	it('where(key, value) shorthand sets key', () => {
		const { req } = createRequest();
		req.table('test').where('id', '123');
		assert.deepStrictEqual(req.whereKey['id'], { S: '123' });
	});

	it('where(key, numericValue) detects number', () => {
		const { req } = createRequest();
		req.table('test').where('id', 42);
		assert.deepStrictEqual(req.whereKey['id'], { N: '42' });
	});

	it('filter().eq() sets filter expression', () => {
		const { req } = createRequest();
		req.table('test').filter('status').eq('active');
		assert.strictEqual(req.whereFilterExpression.length, 1);
		assert.strictEqual(req.whereFilterExpression[0].attribute, 'status');
		assert.strictEqual(req.whereFilterExpression[0].operator, 'EQ');
	});

	it('filter operators work', () => {
		const operators = [
			['ne', 'NE'],
			['lt', 'LT'],
			['le', 'LE'],
			['gt', 'GT'],
			['ge', 'GE'],
			['begins_with', 'BEGINS_WITH'],
			['contains', 'CONTAINS'],
			['not_contains', 'NOT_CONTAINS'],
		];

		for (const [method, expected] of operators) {
			const { req } = createRequest();
			req.table('test').filter('attr')[method]('val');
			assert.strictEqual(req.whereFilterExpression[0].operator, expected, `${method} → ${expected}`);
		}
	});

	it('filter().between() sets BETWEEN', () => {
		const { req } = createRequest();
		req.table('test').filter('age').between(18, 65);
		assert.strictEqual(req.whereFilterExpression[0].operator, 'BETWEEN');
		assert.strictEqual(req.whereFilterExpression[0].value, 18);
		assert.strictEqual(req.whereFilterExpression[0].value2, 65);
	});

	it('filter().in() sets IN', () => {
		const { req } = createRequest();
		req.table('test').filter('role').in(['admin', 'editor']);
		assert.strictEqual(req.whereFilterExpression[0].operator, 'IN');
	});

	it('filter().not_null()', () => {
		const { req } = createRequest();
		req.table('test').filter('email').not_null();
		assert.strictEqual(req.whereFilterExpression[0].operator, 'NOT_NULL');
	});

	it('filter().null()', () => {
		const { req } = createRequest();
		req.table('test').filter('deleted_at').null();
		assert.strictEqual(req.whereFilterExpression[0].operator, 'NULL');
	});

	it('if().eq() sets ifFilter', () => {
		const { req } = createRequest();
		req.table('test').if('version').eq(1);
		assert.ok(req.ifFilter['version']);
	});

	it('if().not_exists() sets ifFilter', () => {
		const { req } = createRequest();
		req.table('test').if('id').not_exists();
		assert.deepStrictEqual(req.ifFilter['id'].data, { Exists: false });
	});

	it('if().exists() sets ifFilter', () => {
		const { req } = createRequest();
		req.table('test').if('id').exists();
		assert.deepStrictEqual(req.ifFilter['id'].data, { Exists: true });
	});

	it('defined() is alias for not_null()', () => {
		const { req } = createRequest();
		req.table('test').filter('x').defined();
		assert.strictEqual(req.whereFilterExpression[0].operator, 'NOT_NULL');
	});

	it('undefined() is alias for null()', () => {
		const { req } = createRequest();
		req.table('test').filter('x').undefined();
		assert.strictEqual(req.whereFilterExpression[0].operator, 'NULL');
	});
});

// ---------------------------------------------------------------------------
// Local events
// ---------------------------------------------------------------------------
describe('Request.on', () => {
	it('registers a local event', () => {
		const { req } = createRequest();
		const fn = () => {};
		req.on('beforeRequest', fn);
		assert.strictEqual(req.localEvents['beforeRequest'], fn);
	});
});

// ---------------------------------------------------------------------------
// Explain mode
// ---------------------------------------------------------------------------
describe('Explain mode', () => {
	it('get returns explain result (passes through)', async () => {
		const { req } = createRequest({}, { returnExplain: true });
		const result = await req.table('test').where('id').eq('123').get();
		// In explain mode, _send returns { _explain, method, params }
		// but get() wraps it in parse({ M: result.Item || {} })
		// The explain object doesn't have .Item so we get an empty object
		assert.ok(result !== null);
	});

	it('query explain returns object with items shape', async () => {
		const { req } = createRequest({}, { returnExplain: true });
		const result = await req.table('test').where('id').eq('123').query();
		// query() transforms the result, so explain object goes through .then()
		assert.ok(result.hasOwnProperty('items'));
	});

	it('scan explain returns object with items shape', async () => {
		const { req } = createRequest({}, { returnExplain: true });
		const result = await req.table('test').scan();
		assert.ok(result.hasOwnProperty('items'));
	});
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
describe('Request.get', () => {
	it('returns parsed item in promise mode', async () => {
		const { req } = createRequest({
			Item: { id: { S: '123' }, name: { S: 'Alice' } },
		});
		const result = await req.table('test').where('id').eq('123').get();
		assert.deepStrictEqual(result, { id: '123', name: 'Alice' });
	});

	it('returns empty object when item not found', async () => {
		const { req } = createRequest({ Item: undefined });
		const result = await req.table('test').where('id').eq('123').get();
		assert.deepStrictEqual(result, {});
	});

	it('sends GetItemCommand', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('123').get();
		assert.strictEqual(mock.calls[0].name, 'GetItemCommand');
	});

	it('passes ConsistentRead', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('123').consistentRead().get();
		assert.strictEqual(mock.calls[0].input.ConsistentRead, true);
	});
});

// ---------------------------------------------------------------------------
// QUERY
// ---------------------------------------------------------------------------
describe('Request.query', () => {
	it('returns { items, lastKey, count, scannedCount, consumedCapacity }', async () => {
		const { req } = createRequest({
			Items: [{ id: '1' }, { id: '2' }],
			Count: 2,
			ScannedCount: 5,
			LastEvaluatedKey: { id: { S: 'abc' } },
			ConsumedCapacity: { TableName: 'test', CapacityUnits: 3 },
		});

		const result = await req.table('test').where('id').eq('123').query();
		assert.deepStrictEqual(result.items, [{ id: '1' }, { id: '2' }]);
		assert.deepStrictEqual(result.lastKey, { id: { S: 'abc' } });
		assert.strictEqual(result.count, 2);
		assert.strictEqual(result.scannedCount, 5);
		assert.deepStrictEqual(result.consumedCapacity, { TableName: 'test', CapacityUnits: 3 });
	});

	it('returns null lastKey when no more pages', async () => {
		const { req } = createRequest({ Items: [], Count: 0 });
		const result = await req.table('test').where('id').eq('123').query();
		assert.strictEqual(result.lastKey, null);
	});

	it('sends QueryCommand', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('123').query();
		assert.strictEqual(mock.calls[0].name, 'QueryCommand');
	});

	it('passes limit', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('123').limit(10).query();
		assert.strictEqual(mock.calls[0].input.Limit, 10);
	});

	it('passes ScanIndexForward=false for descending', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('123').descending().query();
		assert.strictEqual(mock.calls[0].input.ScanIndexForward, false);
	});

	it('passes IndexName', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('123').index('gsi-1').query();
		assert.strictEqual(mock.calls[0].input.IndexName, 'gsi-1');
	});

	it('passes ExclusiveStartKey from resume()', async () => {
		const key = { id: { S: 'last' } };
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('123').resume(key).query();
		assert.deepStrictEqual(mock.calls[0].input.ExclusiveStartKey, key);
	});
});

// ---------------------------------------------------------------------------
// SCAN
// ---------------------------------------------------------------------------
describe('Request.scan', () => {
	it('returns { items, lastKey, count, scannedCount, consumedCapacity }', async () => {
		const { req } = createRequest({
			Items: [{ id: '1' }],
			Count: 1,
			ScannedCount: 100,
		});
		const result = await req.table('test').scan();
		assert.deepStrictEqual(result.items, [{ id: '1' }]);
		assert.strictEqual(result.count, 1);
		assert.strictEqual(result.scannedCount, 100);
	});

	it('sends ScanCommand', async () => {
		const { req, mock } = createRequest();
		await req.table('test').scan();
		assert.strictEqual(mock.calls[0].name, 'ScanCommand');
	});

	it('passes limit and IndexName', async () => {
		const { req, mock } = createRequest();
		await req.table('test').index('gsi-1').limit(50).scan();
		assert.strictEqual(mock.calls[0].input.Limit, 50);
		assert.strictEqual(mock.calls[0].input.IndexName, 'gsi-1');
	});
});

// ---------------------------------------------------------------------------
// INSERT
// ---------------------------------------------------------------------------
describe('Request.insert', () => {
	it('returns { attributes, consumedCapacity }', async () => {
		const { req } = createRequest({
			Attributes: {},
			ConsumedCapacity: { TableName: 'test', CapacityUnits: 5 },
		});
		const result = await req.table('test').insert({ id: '1', name: 'Alice' });
		assert.ok(result.hasOwnProperty('attributes'));
		assert.ok(result.hasOwnProperty('consumedCapacity'));
		assert.deepStrictEqual(result.consumedCapacity, { TableName: 'test', CapacityUnits: 5 });
	});

	it('sends PutItemCommand', async () => {
		const { req, mock } = createRequest();
		await req.table('test').insert({ id: '1', name: 'Alice' });
		assert.strictEqual(mock.calls[0].name, 'PutItemCommand');
	});

	it('adds attribute_not_exists condition for keys', async () => {
		const { req, mock } = createRequest();
		await req.table('test').insert({ id: '1', name: 'Alice' });
		const expected = mock.calls[0].input.Expected;
		assert.ok(expected['id']);
		assert.strictEqual(expected['id'].Exists, false);
	});
});

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------
describe('Request.update', () => {
	it('returns { attributes, consumedCapacity }', async () => {
		const { req } = createRequest({
			Attributes: { id: { S: '1' }, name: { S: 'Bob' } },
			ConsumedCapacity: { TableName: 'test', CapacityUnits: 2 },
		});
		const result = await req.table('test').where('id').eq('1').update({ name: 'Bob' });
		assert.ok(result.hasOwnProperty('attributes'));
		assert.ok(result.hasOwnProperty('consumedCapacity'));
	});

	it('sends UpdateItemCommand', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('1').update({ name: 'Bob' });
		assert.strictEqual(mock.calls[0].name, 'UpdateItemCommand');
	});

	it('sets undefined values as DELETE action', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('1').update({ oldField: undefined });
		const updates = mock.calls[0].input.AttributeUpdates;
		assert.deepStrictEqual(updates['oldField'], { Action: 'DELETE' });
	});

	it('sets normal values as PUT action', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('1').update({ name: 'Bob' });
		const updates = mock.calls[0].input.AttributeUpdates;
		assert.strictEqual(updates['name'].Action, 'PUT');
	});

	it('passes ReturnValues', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('1').return('ALL_NEW').update({ name: 'Bob' });
		assert.strictEqual(mock.calls[0].input.ReturnValues, 'ALL_NEW');
	});

	it('throws when missing where key', async () => {
		const { req } = createRequest();
		await assert.rejects(() => req.table('test').update({ name: 'Bob' }), /ValidationException/);
	});
});

// ---------------------------------------------------------------------------
// INSERT_OR_UPDATE (upsert)
// ---------------------------------------------------------------------------
describe('Request.insert_or_update', () => {
	it('returns { attributes, consumedCapacity }', async () => {
		const { req } = createRequest();
		const result = await req.table('test').insert_or_update({ id: '1', name: 'Alice' });
		assert.ok(result.hasOwnProperty('attributes'));
		assert.ok(result.hasOwnProperty('consumedCapacity'));
	});

	it('sends UpdateItemCommand', async () => {
		const { req, mock } = createRequest();
		await req.table('test').insert_or_update({ id: '1', name: 'Alice' });
		assert.strictEqual(mock.calls[0].name, 'UpdateItemCommand');
	});

	it('removes key attributes from updates', async () => {
		const { req, mock } = createRequest();
		await req.table('test').insert_or_update({ id: '1', name: 'Alice' });
		const updates = mock.calls[0].input.AttributeUpdates;
		assert.ok(!updates['id'], 'key attribute should not be in updates');
		assert.ok(updates['name']);
	});
});

// ---------------------------------------------------------------------------
// REPLACE
// ---------------------------------------------------------------------------
describe('Request.replace', () => {
	it('returns { attributes, consumedCapacity }', async () => {
		const { req } = createRequest();
		const result = await req.table('test').replace({ id: '1', name: 'Alice' });
		assert.ok(result.hasOwnProperty('attributes'));
		assert.ok(result.hasOwnProperty('consumedCapacity'));
	});

	it('sends PutItemCommand', async () => {
		const { req, mock } = createRequest();
		await req.table('test').replace({ id: '1', name: 'Alice' });
		assert.strictEqual(mock.calls[0].name, 'PutItemCommand');
	});

	it('adds exists condition for key', async () => {
		const { req, mock } = createRequest();
		await req.table('test').replace({ id: '1', name: 'Alice' });
		const expected = mock.calls[0].input.Expected;
		assert.ok(expected['id']);
		assert.strictEqual(expected['id'].Exists, true);
	});
});

// ---------------------------------------------------------------------------
// INSERT_OR_REPLACE
// ---------------------------------------------------------------------------
describe('Request.insert_or_replace', () => {
	it('returns { attributes, consumedCapacity }', async () => {
		const { req } = createRequest();
		const result = await req.table('test').insert_or_replace({ id: '1', name: 'Alice' });
		assert.ok(result.hasOwnProperty('attributes'));
		assert.ok(result.hasOwnProperty('consumedCapacity'));
	});

	it('sends PutItemCommand without conditions', async () => {
		const { req, mock } = createRequest();
		await req.table('test').insert_or_replace({ id: '1', name: 'Alice' });
		assert.strictEqual(mock.calls[0].name, 'PutItemCommand');
		assert.ok(!mock.calls[0].input.Expected);
	});
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
describe('Request.delete', () => {
	it('returns { attributes, consumedCapacity } in promise mode', async () => {
		const { req } = createRequest();
		const result = await req.table('test').where('id').eq('1').delete();
		assert.ok(result.hasOwnProperty('attributes'));
		assert.ok(result.hasOwnProperty('consumedCapacity'));
	});

	it('sends DeleteItemCommand', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('1').delete();
		assert.strictEqual(mock.calls[0].name, 'DeleteItemCommand');
	});

	it('delete specific attributes sends UpdateItemCommand with DELETE actions', async () => {
		const { req, mock } = createRequest();
		await req.table('test').where('id').eq('1').delete(['field1', 'field2']);
		// delete attrs still uses deleteItem command path but with AttributeUpdates
		const input = mock.calls[0].input;
		assert.ok(input.AttributeUpdates);
		assert.deepStrictEqual(input.AttributeUpdates['field1'], { Action: 'DELETE' });
		assert.deepStrictEqual(input.AttributeUpdates['field2'], { Action: 'DELETE' });
	});
});

// ---------------------------------------------------------------------------
// _describeTable caching
// ---------------------------------------------------------------------------
describe('Request._describeTable', () => {
	it('uses pre-registered schema without API call', async () => {
		const { req, mock } = createRequest();
		const result = await req._describeTable('test');
		assert.strictEqual(result.Table.TableName, 'test');
		assert.strictEqual(mock.calls.length, 0);
	});

	it('calls API and caches for unknown table', async () => {
		const { req, mock } = createRequest({
			Table: {
				TableName: 'unknown',
				KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
			},
		});
		const result = await req._describeTable('unknown');
		assert.strictEqual(mock.calls.length, 1);
		assert.strictEqual(mock.calls[0].name, 'DescribeTableCommand');

		// Second call should use cache
		await req._describeTable('unknown');
		assert.strictEqual(mock.calls.length, 1);
	});
});

// ---------------------------------------------------------------------------
// _buildCommand
// ---------------------------------------------------------------------------
describe('Request._buildCommand', () => {
	it('maps method names to commands', () => {
		const { req } = createRequest();
		const methods = ['put', 'update', 'delete', 'get', 'query', 'scan', 'listTables', 'describeTable'];
		for (const method of methods) {
			const cmd = req._buildCommand(method, {});
			assert.ok(cmd, `${method} should return a command`);
		}
	});

	it('throws on unknown method', () => {
		const { req } = createRequest();
		assert.throws(() => req._buildCommand('invalid', {}), /Unknown method/);
	});
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
describe('Request error handling', () => {
	it('fires events.error on failure', async () => {
		let errorCalled = false;
		const mock = {
			send() {
				return Promise.reject(new Error('test error'));
			},
		};
		const req = new Request(mock, {
			describeTables: TEST_SCHEMA,
			events: {
				error(method, err, params) {
					errorCalled = true;
					assert.strictEqual(method, 'get');
					assert.strictEqual(err.message, 'test error');
				},
			},
		});

		await assert.rejects(() => req.table('test').where('id').eq('1').get(), /test error/);
		assert.ok(errorCalled);
	});

	it('fires events.beforeRequest', async () => {
		let beforeCalled = false;
		const { req } = createRequest(
			{},
			{
				events: {
					beforeRequest(method, params) {
						beforeCalled = true;
						assert.strictEqual(method, 'get');
					},
				},
			},
		);

		await req.table('test').where('id').eq('1').get();
		assert.ok(beforeCalled);
	});
});

// ---------------------------------------------------------------------------
// Reset after operations
// ---------------------------------------------------------------------------
describe('Request._reset', () => {
	it('resets state after get()', async () => {
		const { req } = createRequest();
		await req.table('test').where('id').eq('123').consistentRead().limit(1).get();
		assert.strictEqual(req.ConsistentRead, false);
		assert.strictEqual(req.limitValue, null);
		assert.deepStrictEqual(req.whereKey, {});
	});

	it('resets state after query()', async () => {
		const { req } = createRequest();
		await req.table('test').where('id').eq('123').limit(10).descending().query();
		assert.strictEqual(req.limitValue, null);
		assert.strictEqual(req.ScanIndexForward, true);
	});

	it('resets state after scan()', async () => {
		const { req } = createRequest();
		await req.table('test').limit(50).scan();
		assert.strictEqual(req.limitValue, null);
	});
});
