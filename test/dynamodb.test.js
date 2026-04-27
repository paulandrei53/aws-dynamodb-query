import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DynamoDB } from '../src/dynamodb.js';
import { Request } from '../src/request.js';

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------
describe('DynamoDB constructor', () => {
	it('creates instance with no args', () => {
		const db = new DynamoDB();
		assert.ok(db.client);
		assert.strictEqual(db.debug, false);
	});

	it('creates instance with region', () => {
		const db = new DynamoDB({ region: 'us-east-1' });
		assert.ok(db.client);
	});

	it('creates instance with credentials', () => {
		const db = new DynamoDB({
			region: 'us-east-1',
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
		});
		assert.ok(db.client);
	});

	it('enables debug mode', () => {
		const db = new DynamoDB({ region: 'us-east-1', debug: true });
		assert.strictEqual(db.debug, true);
	});
});

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
describe('DynamoDB.schema', () => {
	it('registers a single schema', () => {
		const db = new DynamoDB();
		db.schema({
			TableName: 'users',
			KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
		});
		assert.ok(db.describeTables['users']);
		assert.strictEqual(db.describeTables['users'].TableName, 'users');
	});

	it('registers multiple schemas', () => {
		const db = new DynamoDB();
		db.schema([
			{ TableName: 'users', KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }] },
			{ TableName: 'orders', KeySchema: [{ AttributeName: 'order_id', KeyType: 'HASH' }] },
		]);
		assert.ok(db.describeTables['users']);
		assert.ok(db.describeTables['orders']);
	});

	it('throws on missing TableName', () => {
		const db = new DynamoDB();
		assert.throws(() => db.schema({ KeySchema: [] }), /TableName/);
	});

	it('throws on missing KeySchema', () => {
		const db = new DynamoDB();
		assert.throws(() => db.schema({ TableName: 'test' }), /KeySchema/);
	});

	it('is chainable', () => {
		const db = new DynamoDB();
		const result = db.schema({
			TableName: 'test',
			KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
		});
		assert.strictEqual(result, db);
	});
});

// ---------------------------------------------------------------------------
// table() returns Request
// ---------------------------------------------------------------------------
describe('DynamoDB.table', () => {
	it('returns a Request instance', () => {
		const db = new DynamoDB();
		const req = db.table('users');
		assert.ok(req instanceof Request);
	});

	it('passes debug flag to Request', () => {
		const db = new DynamoDB({ debug: true });
		const req = db.table('users');
		assert.strictEqual(req.debug, true);
	});

	it('passes registered schemas to Request', () => {
		const db = new DynamoDB();
		db.schema({ TableName: 'users', KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }] });
		const req = db.table('users');
		assert.ok(req.describeTables['users']);
	});
});

// ---------------------------------------------------------------------------
// Type helpers (instance methods)
// ---------------------------------------------------------------------------
describe('DynamoDB type helpers', () => {
	const db = new DynamoDB();

	it('SS creates String Set', () => {
		const result = db.SS(['a', 'b']);
		assert.deepStrictEqual(result.data, { SS: ['a', 'b'] });
	});

	it('NS creates Number Set', () => {
		const result = db.NS([1, 2]);
		assert.deepStrictEqual(result.data, { NS: ['1', '2'] });
	});

	it('N creates Number', () => {
		assert.deepStrictEqual(db.N(42).data, { N: '42' });
	});

	it('S creates String', () => {
		assert.deepStrictEqual(db.S('hello').data, { S: 'hello' });
	});

	it('L creates List', () => {
		const result = db.L([1, 'a']);
		assert.ok(result.data.L);
	});

	it('add() returns increment action', () => {
		const result = db.add(5);
		assert.deepStrictEqual(result.getRawData(), { Action: 'ADD', Value: { N: '5' } });
	});

	it('add() defaults to 1', () => {
		const result = db.add();
		assert.deepStrictEqual(result.getRawData(), { Action: 'ADD', Value: { N: '1' } });
	});

	it('del() returns delete action', () => {
		const result = db.del(db.SS(['old']));
		assert.deepStrictEqual(result.getRawData(), { Action: 'DELETE', Value: { SS: ['old'] } });
	});

	it('del() with no args returns bare delete action', () => {
		const result = db.del();
		assert.deepStrictEqual(result.getRawData(), { Action: 'DELETE' });
	});
});

// ---------------------------------------------------------------------------
// Static constants
// ---------------------------------------------------------------------------
describe('DynamoDB constants', () => {
	it('has Select constants', () => {
		assert.strictEqual(DynamoDB.ALL, 1);
		assert.strictEqual(DynamoDB.ALL_ATTRIBUTES, 1);
		assert.strictEqual(DynamoDB.PROJECTED, 2);
		assert.strictEqual(DynamoDB.ALL_PROJECTED_ATTRIBUTES, 2);
		assert.strictEqual(DynamoDB.COUNT, 3);
	});

	it('has ReturnValues constants', () => {
		assert.strictEqual(DynamoDB.NONE, 'NONE');
		assert.strictEqual(DynamoDB.ALL_OLD, 'ALL_OLD');
		assert.strictEqual(DynamoDB.UPDATED_OLD, 'UPDATED_OLD');
		assert.strictEqual(DynamoDB.ALL_NEW, 'ALL_NEW');
		assert.strictEqual(DynamoDB.UPDATED_NEW, 'UPDATED_NEW');
	});

	it('has ReturnConsumedCapacity constants', () => {
		assert.strictEqual(DynamoDB.TOTAL, 'TOTAL');
		assert.strictEqual(DynamoDB.INDEXES, 'INDEXES');
	});
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
describe('DynamoDB.on', () => {
	it('registers an error handler', () => {
		const db = new DynamoDB();
		const handler = () => {};
		db.on('error', handler);
		assert.strictEqual(db.events.error, handler);
	});

	it('registers a beforeRequest handler', () => {
		const db = new DynamoDB();
		const handler = () => {};
		db.on('beforeRequest', handler);
		assert.strictEqual(db.events.beforeRequest, handler);
	});
});

// ---------------------------------------------------------------------------
// getClient
// ---------------------------------------------------------------------------
describe('DynamoDB.getClient', () => {
	it('returns the DynamoDB document client', () => {
		const db = new DynamoDB();
		assert.ok(db.getClient());
		assert.strictEqual(db.getClient(), db.client);
	});
});

// ---------------------------------------------------------------------------
// explain mode
// ---------------------------------------------------------------------------
describe('DynamoDB.explain', () => {
	it('sets returnExplain flag', () => {
		const db = new DynamoDB();
		db.explain();
		assert.strictEqual(db.returnExplain, true);
	});

	it('resets after table() call', () => {
		const db = new DynamoDB();
		db.explain();
		db.table('users');
		assert.strictEqual(db.returnExplain, false);
	});
});
