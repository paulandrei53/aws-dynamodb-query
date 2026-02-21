import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import DynamoDB from '../src/index.js';

describe('index.js exports', () => {
	it('default export is DynamoDB', () => {
		assert.strictEqual(typeof DynamoDB, 'function');
		assert.strictEqual(DynamoDB.name, 'DynamoDB');
	});

	it('DynamoDB is constructable', () => {
		const db = new DynamoDB();
		assert.ok(db);
		assert.ok(db.client);
	});

	it('type helpers are available on instance', () => {
		const db = new DynamoDB();
		assert.strictEqual(typeof db.SS, 'function');
		assert.strictEqual(typeof db.NS, 'function');
		assert.strictEqual(typeof db.N, 'function');
		assert.strictEqual(typeof db.S, 'function');
		assert.strictEqual(typeof db.L, 'function');
		assert.strictEqual(typeof db.add, 'function');
		assert.strictEqual(typeof db.del, 'function');
	});

	it('util is available as static', () => {
		assert.ok(DynamoDB.util);
		assert.strictEqual(typeof DynamoDB.util.stringify, 'function');
		assert.strictEqual(typeof DynamoDB.util.parse, 'function');
	});

	it('constants are available as static', () => {
		assert.strictEqual(DynamoDB.ALL_OLD, 'ALL_OLD');
		assert.strictEqual(DynamoDB.ALL_NEW, 'ALL_NEW');
	});
});
