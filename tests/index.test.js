import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import DynamoDB, { DynamoDB as NamedDynamoDB, Request, ExpressionBuilder, Raw, util, SS, BS, N, S, NS, L, add, del } from '../src/index.js';

describe('index.js exports', () => {
	it('default export is DynamoDB', () => {
		assert.strictEqual(DynamoDB, NamedDynamoDB);
	});

	it('exports Request', () => {
		assert.ok(Request);
		assert.strictEqual(typeof Request, 'function');
	});

	it('exports ExpressionBuilder', () => {
		assert.ok(ExpressionBuilder);
		assert.strictEqual(typeof ExpressionBuilder, 'function');
	});

	it('exports Raw', () => {
		assert.ok(Raw);
		const raw = new Raw({ S: 'test' });
		assert.deepStrictEqual(raw.data, { S: 'test' });
	});

	it('exports util', () => {
		assert.ok(util);
		assert.strictEqual(typeof util.stringify, 'function');
		assert.strictEqual(typeof util.parse, 'function');
		assert.strictEqual(typeof util.clone, 'function');
		assert.strictEqual(typeof util.anormalizeItem, 'function');
		assert.strictEqual(typeof util.normalizeItem, 'function');
	});

	it('exports type helpers', () => {
		assert.strictEqual(typeof SS, 'function');
		assert.strictEqual(typeof BS, 'function');
		assert.strictEqual(typeof N, 'function');
		assert.strictEqual(typeof S, 'function');
		assert.strictEqual(typeof NS, 'function');
		assert.strictEqual(typeof L, 'function');
		assert.strictEqual(typeof add, 'function');
		assert.strictEqual(typeof del, 'function');
	});

	it('DynamoDB is constructable', () => {
		const db = new DynamoDB();
		assert.ok(db);
		assert.ok(db.client);
	});
});
