import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SS, NS, BS, N, S, L, add, del } from '../src/types.js';
import { Raw } from '../src/util.js';

// ---------------------------------------------------------------------------
// SS - String Set
// ---------------------------------------------------------------------------
describe('SS', () => {
	it('creates a String Set', () => {
		const result = SS(['a', 'b', 'c']);
		assert.ok(result instanceof Raw);
		assert.deepStrictEqual(result.data, { SS: ['a', 'b', 'c'] });
	});

	it('throws on non-array', () => {
		assert.throws(() => SS('not-array'), /array/);
	});
});

// ---------------------------------------------------------------------------
// NS - Number Set
// ---------------------------------------------------------------------------
describe('NS', () => {
	it('creates a Number Set with string values', () => {
		const result = NS([1, 2, 3]);
		assert.ok(result instanceof Raw);
		assert.deepStrictEqual(result.data, { NS: ['1', '2', '3'] });
	});

	it('throws on non-array', () => {
		assert.throws(() => NS(42), /array/);
	});
});

// ---------------------------------------------------------------------------
// BS - Binary Set
// ---------------------------------------------------------------------------
describe('BS', () => {
	it('creates a Binary Set', () => {
		const buf = Buffer.from('test');
		const result = BS([buf]);
		assert.ok(result instanceof Raw);
		assert.deepStrictEqual(result.data, { BS: [buf] });
	});

	it('throws on non-array', () => {
		assert.throws(() => BS('not-array'), /array/);
	});
});

// ---------------------------------------------------------------------------
// N - Number
// ---------------------------------------------------------------------------
describe('N', () => {
	it('creates a Number from number', () => {
		const result = N(42);
		assert.deepStrictEqual(result.data, { N: '42' });
	});

	it('creates a Number from string', () => {
		const result = N('99');
		assert.deepStrictEqual(result.data, { N: '99' });
	});

	it('throws on non-number/string', () => {
		assert.throws(() => N(true), /number or string/);
		assert.throws(() => N(null), /number or string/);
	});
});

// ---------------------------------------------------------------------------
// S - String
// ---------------------------------------------------------------------------
describe('S', () => {
	it('creates a String', () => {
		const result = S('hello');
		assert.deepStrictEqual(result.data, { S: 'hello' });
	});

	it('throws on non-string', () => {
		assert.throws(() => S(42), /string/);
	});
});

// ---------------------------------------------------------------------------
// L - List
// ---------------------------------------------------------------------------
describe('L', () => {
	it('creates a List with stringified items', () => {
		const result = L([1, 'a']);
		assert.deepStrictEqual(result.data, {
			L: [{ N: '1' }, { S: 'a' }],
		});
	});

	it('throws on non-array', () => {
		assert.throws(() => L('not-array'), /array/);
	});
});

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------
describe('add', () => {
	it('defaults to increment by 1', () => {
		const result = add();
		assert.deepStrictEqual(result.getRawData(), { Action: 'ADD', Value: { N: '1' } });
	});

	it('increments by a specific number', () => {
		const result = add(5);
		assert.deepStrictEqual(result.getRawData(), { Action: 'ADD', Value: { N: '5' } });
	});

	it('adds to a String Set', () => {
		const result = add(SS(['a', 'b']));
		assert.deepStrictEqual(result.getRawData(), { Action: 'ADD', Value: { SS: ['a', 'b'] } });
	});

	it('adds to a Number Set', () => {
		const result = add(NS([1, 2]));
		assert.deepStrictEqual(result.getRawData(), { Action: 'ADD', Value: { NS: ['1', '2'] } });
	});

	it('adds to a List (array)', () => {
		const result = add(['x', 'y']);
		const raw = result.getRawData();
		assert.strictEqual(raw.Action, 'ADD');
		assert.ok(raw.Value.L);
	});

	it('supports forced datatype string', () => {
		const result = add(5, 'N');
		assert.deepStrictEqual(result.getRawData(), { Action: 'ADD', Value: { N: '5' } });
	});

	it('throws on unsupported forced type', () => {
		assert.throws(() => add('text', 'S'), /not supported/);
		assert.throws(() => add(true, 'BOOL'), /not supported/);
	});

	it('throws on unsupported data type', () => {
		assert.throws(() => add('not-a-number'), /not supported/);
	});
});

// ---------------------------------------------------------------------------
// del
// ---------------------------------------------------------------------------
describe('del', () => {
	it('creates DELETE action with no args', () => {
		const result = del();
		assert.deepStrictEqual(result.getRawData(), { Action: 'DELETE' });
	});

	it('deletes from String Set', () => {
		const result = del(SS(['a']));
		assert.deepStrictEqual(result.getRawData(), { Action: 'DELETE', Value: { SS: ['a'] } });
	});

	it('deletes from Number Set', () => {
		const result = del(NS([1]));
		assert.deepStrictEqual(result.getRawData(), { Action: 'DELETE', Value: { NS: ['1'] } });
	});

	it('supports forced datatype', () => {
		const result = del(['a', 'b'], 'SS');
		assert.deepStrictEqual(result.getRawData(), { Action: 'DELETE', Value: { SS: ['a', 'b'] } });
	});

	it('throws on unsupported forced type', () => {
		assert.throws(() => del(42, 'N'), /not supported/);
	});

	it('throws on unsupported data type', () => {
		assert.throws(() => del(42), /not supported/);
	});
});
