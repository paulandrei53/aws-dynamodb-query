import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExpressionBuilder } from '../src/expression-builder.js';

// ---------------------------------------------------------------------------
// registerName
// ---------------------------------------------------------------------------
describe('ExpressionBuilder.registerName', () => {
	it('registers a simple name', () => {
		const eb = new ExpressionBuilder();
		const placeholder = eb.registerName('email');
		assert.strictEqual(placeholder, '#email');
		assert.deepStrictEqual(eb.names, { '#email': 'email' });
	});

	it('handles dotted names (nested)', () => {
		const eb = new ExpressionBuilder();
		const placeholder = eb.registerName('address.city');
		assert.strictEqual(placeholder, '#address.#city');
		assert.strictEqual(eb.names['#address'], 'address');
		assert.strictEqual(eb.names['#city'], 'city');
	});

	it('handles names with hyphens', () => {
		const eb = new ExpressionBuilder();
		const placeholder = eb.registerName('my-attr');
		assert.strictEqual(placeholder, '#my_minus_attr');
		assert.strictEqual(eb.names['#my_minus_attr'], 'my-attr');
	});

	it('handles array notation', () => {
		const eb = new ExpressionBuilder();
		const placeholder = eb.registerName('items[0]');
		assert.ok(placeholder.includes('[0]'));
	});
});

// ---------------------------------------------------------------------------
// registerValue
// ---------------------------------------------------------------------------
describe('ExpressionBuilder.registerValue', () => {
	it('registers a value with versioned placeholder', () => {
		const eb = new ExpressionBuilder();
		const p1 = eb.registerValue('email', 'test@test.com');
		assert.strictEqual(p1, ':email_v1');
		assert.strictEqual(eb.values[':email_v1'], 'test@test.com');
	});

	it('increments version for duplicate names', () => {
		const eb = new ExpressionBuilder();
		const p1 = eb.registerValue('status', 'active');
		const p2 = eb.registerValue('status', 'inactive');
		assert.strictEqual(p1, ':status_v1');
		assert.strictEqual(p2, ':status_v2');
	});
});

// ---------------------------------------------------------------------------
// buildProjection
// ---------------------------------------------------------------------------
describe('ExpressionBuilder.buildProjection', () => {
	it('builds projection from attributes', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildProjection(['name', 'email', 'age']);
		assert.strictEqual(result, '#name, #email, #age');
	});

	it('returns undefined for empty array', () => {
		const eb = new ExpressionBuilder();
		assert.strictEqual(eb.buildProjection([]), undefined);
	});

	it('returns undefined for null', () => {
		const eb = new ExpressionBuilder();
		assert.strictEqual(eb.buildProjection(null), undefined);
	});
});

// ---------------------------------------------------------------------------
// buildKeyCondition
// ---------------------------------------------------------------------------
describe('ExpressionBuilder.buildKeyCondition', () => {
	it('builds simple hash key condition', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildKeyCondition({ id: { S: '123' } }, {});
		assert.ok(result.includes('#id'));
		assert.ok(result.includes('='));
	});

	it('builds hash + range key condition', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildKeyCondition({ pk: { S: 'abc' } }, { sk: { operator: 'BEGINS_WITH', type: 'S', value: 'prefix' } });
		assert.ok(result.includes('#pk'));
		assert.ok(result.includes('begins_with'));
	});
});

// ---------------------------------------------------------------------------
// buildFilter
// ---------------------------------------------------------------------------
describe('ExpressionBuilder.buildFilter', () => {
	it('builds EQ filter', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([{ attribute: 'status', operator: 'EQ', value: 'active' }]);
		assert.ok(result.includes('#status'));
		assert.ok(result.includes('='));
	});

	it('builds BETWEEN filter', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([{ attribute: 'age', operator: 'BETWEEN', value: 18, value2: 65 }]);
		assert.ok(result.includes('BETWEEN'));
		assert.ok(result.includes('AND'));
	});

	it('builds IN filter', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([{ attribute: 'role', operator: 'IN', value: ['admin', 'editor'] }]);
		assert.ok(result.includes('IN'));
	});

	it('builds NOT_NULL filter', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([{ attribute: 'email', operator: 'NOT_NULL' }]);
		assert.ok(result.includes('attribute_exists'));
	});

	it('builds NULL filter', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([{ attribute: 'deleted_at', operator: 'NULL' }]);
		assert.ok(result.includes('attribute_not_exists'));
	});

	it('builds begins_with filter', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([{ attribute: 'name', operator: 'BEGINS_WITH', value: 'Al' }]);
		assert.ok(result.includes('begins_with'));
	});

	it('builds contains filter', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([{ attribute: 'tags', operator: 'CONTAINS', value: 'dev' }]);
		assert.ok(result.includes('contains'));
	});

	it('builds NOT contains filter', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([{ attribute: 'tags', operator: 'NOT_CONTAINS', value: 'spam' }]);
		assert.ok(result.includes('NOT contains'));
	});

	it('builds multiple filters with AND', () => {
		const eb = new ExpressionBuilder();
		const result = eb.buildFilter([
			{ attribute: 'status', operator: 'EQ', value: 'active' },
			{ attribute: 'age', operator: 'GT', value: 18 },
		]);
		assert.ok(result.includes('AND'));
	});

	it('returns undefined for empty array', () => {
		const eb = new ExpressionBuilder();
		assert.strictEqual(eb.buildFilter([]), undefined);
	});

	it('throws on unsupported operator', () => {
		const eb = new ExpressionBuilder();
		assert.throws(() => {
			eb.buildFilter([{ attribute: 'x', operator: 'INVALID', value: 1 }]);
		}, /Unsupported/);
	});
});
