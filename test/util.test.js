import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Raw, config, clone, anormalizeType, stringify, parse, anormalizeItem, normalizeItem, buildExpected, expressionNameSplit, applySetConfig } from '../src/util.js';

// ---------------------------------------------------------------------------
// Raw
// ---------------------------------------------------------------------------
describe('Raw', () => {
	it('stores data and exposes getRawData()', () => {
		const raw = new Raw({ S: 'hello' });
		assert.deepStrictEqual(raw.data, { S: 'hello' });
		assert.deepStrictEqual(raw.getRawData(), { S: 'hello' });
	});
});

// ---------------------------------------------------------------------------
// clone
// ---------------------------------------------------------------------------
describe('clone', () => {
	it('deep clones an object', () => {
		const obj = { a: 1, b: { c: 2 } };
		const cloned = clone(obj);
		assert.deepStrictEqual(cloned, obj);
		cloned.b.c = 99;
		assert.strictEqual(obj.b.c, 2);
	});

	it('deep clones an array', () => {
		const arr = [1, [2, 3]];
		const cloned = clone(arr);
		assert.deepStrictEqual(cloned, arr);
		cloned[1][0] = 99;
		assert.strictEqual(arr[1][0], 2);
	});
});

// ---------------------------------------------------------------------------
// anormalizeType
// ---------------------------------------------------------------------------
describe('anormalizeType', () => {
	it('detects null', () => assert.strictEqual(anormalizeType(null), 'NULL'));
	it('detects undefined', () => assert.strictEqual(anormalizeType(undefined), 'NULL'));
	it('detects boolean', () => assert.strictEqual(anormalizeType(true), 'BOOL'));
	it('detects number', () => assert.strictEqual(anormalizeType(42), 'N'));
	it('detects string', () => assert.strictEqual(anormalizeType('hello'), 'S'));
	it('detects array', () => assert.strictEqual(anormalizeType([1, 2]), 'L'));
	it('detects object', () => assert.strictEqual(anormalizeType({ a: 1 }), 'M'));
});

// ---------------------------------------------------------------------------
// stringify
// ---------------------------------------------------------------------------
describe('stringify', () => {
	it('converts null to NULL', () => {
		assert.deepStrictEqual(stringify(null), { NULL: true });
	});

	it('converts undefined to NULL', () => {
		assert.deepStrictEqual(stringify(undefined), { NULL: true });
	});

	it('converts boolean', () => {
		assert.deepStrictEqual(stringify(true), { BOOL: true });
		assert.deepStrictEqual(stringify(false), { BOOL: false });
	});

	it('converts number to N string', () => {
		assert.deepStrictEqual(stringify(42), { N: '42' });
		assert.deepStrictEqual(stringify(3.14), { N: '3.14' });
		assert.deepStrictEqual(stringify(0), { N: '0' });
	});

	it('converts string to S', () => {
		assert.deepStrictEqual(stringify('hello'), { S: 'hello' });
	});

	it('converts array to L', () => {
		const result = stringify([1, 'a', true]);
		assert.deepStrictEqual(result, {
			L: [{ N: '1' }, { S: 'a' }, { BOOL: true }],
		});
	});

	it('converts object to M', () => {
		const result = stringify({ name: 'Alice', age: 30 });
		assert.deepStrictEqual(result, {
			M: { name: { S: 'Alice' }, age: { N: '30' } },
		});
	});

	it('converts nested object', () => {
		const result = stringify({ user: { name: 'Alice' } });
		assert.deepStrictEqual(result, {
			M: { user: { M: { name: { S: 'Alice' } } } },
		});
	});

	it('passes through Raw values', () => {
		const raw = new Raw({ SS: ['a', 'b'] });
		assert.deepStrictEqual(stringify(raw), { SS: ['a', 'b'] });
	});

	it('handles empty string with config', () => {
		const original = config.empty_string_replace_as;
		config.empty_string_replace_as = null;
		assert.deepStrictEqual(stringify(''), { NULL: true });
		config.empty_string_replace_as = original;
	});
});

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------
describe('parse', () => {
	it('parses S', () => assert.strictEqual(parse({ S: 'hello' }), 'hello'));
	it('parses N', () => assert.strictEqual(parse({ N: '42' }), 42));
	it('parses BOOL', () => assert.strictEqual(parse({ BOOL: true }), true));
	it('parses NULL', () => assert.strictEqual(parse({ NULL: true }), null));
	it('parses B', () => assert.strictEqual(parse({ B: 'binary' }), 'binary'));

	it('parses SS as array by default', () => {
		assert.deepStrictEqual(parse({ SS: ['a', 'b'] }), ['a', 'b']);
	});

	it('parses SS as Set when configured', () => {
		const original = config.stringset_parse_as_set;
		config.stringset_parse_as_set = true;
		const result = parse({ SS: ['a', 'b'] });
		assert.ok(result instanceof Set);
		assert.ok(result.has('a'));
		assert.ok(result.has('b'));
		config.stringset_parse_as_set = original;
	});

	it('parses NS as array of numbers', () => {
		assert.deepStrictEqual(parse({ NS: ['1', '2', '3'] }), [1, 2, 3]);
	});

	it('parses NS as Set when configured', () => {
		const original = config.numberset_parse_as_set;
		config.numberset_parse_as_set = true;
		const result = parse({ NS: ['1', '2'] });
		assert.ok(result instanceof Set);
		assert.ok(result.has(1));
		config.numberset_parse_as_set = original;
	});

	it('parses L', () => {
		const result = parse({ L: [{ S: 'a' }, { N: '1' }] });
		assert.deepStrictEqual(result, ['a', 1]);
	});

	it('parses M', () => {
		const result = parse({ M: { name: { S: 'Alice' }, age: { N: '30' } } });
		assert.deepStrictEqual(result, { name: 'Alice', age: 30 });
	});

	it('parses nested M', () => {
		const result = parse({
			M: { user: { M: { name: { S: 'Alice' }, active: { BOOL: true } } } },
		});
		assert.deepStrictEqual(result, { user: { name: 'Alice', active: true } });
	});

	it('returns input for unknown types', () => {
		assert.deepStrictEqual(parse({ UNKNOWN: 'x' }), { UNKNOWN: 'x' });
	});

	it('returns null/undefined as-is', () => {
		assert.strictEqual(parse(null), null);
		assert.strictEqual(parse(undefined), undefined);
	});
});

// ---------------------------------------------------------------------------
// applySetConfig — converts JS Sets (from lib-dynamodb) to arrays per config
// ---------------------------------------------------------------------------
describe('applySetConfig', () => {
	it('string Set → array by default', () => {
		assert.deepStrictEqual(applySetConfig(new Set(['a', 'b'])), ['a', 'b']);
	});

	it('number Set → array by default', () => {
		assert.deepStrictEqual(applySetConfig(new Set([1, 2])), [1, 2]);
	});

	it('keeps string Set when stringset_parse_as_set=true', () => {
		const original = config.stringset_parse_as_set;
		config.stringset_parse_as_set = true;
		const result = applySetConfig(new Set(['a', 'b']));
		assert.ok(result instanceof Set);
		config.stringset_parse_as_set = original;
	});

	it('keeps number Set when numberset_parse_as_set=true', () => {
		const original = config.numberset_parse_as_set;
		config.numberset_parse_as_set = true;
		const result = applySetConfig(new Set([1, 2]));
		assert.ok(result instanceof Set);
		config.numberset_parse_as_set = original;
	});

	it('walks nested objects and arrays', () => {
		const input = {
			tags: new Set(['x']),
			meta: { ids: new Set([1, 2]) },
			list: [{ inner: new Set(['y']) }],
		};
		const result = applySetConfig(input);
		assert.deepStrictEqual(result.tags, ['x']);
		assert.deepStrictEqual(result.meta.ids, [1, 2]);
		assert.deepStrictEqual(result.list[0].inner, ['y']);
	});

	it('passes scalars through untouched', () => {
		assert.strictEqual(applySetConfig('hi'), 'hi');
		assert.strictEqual(applySetConfig(42), 42);
		assert.strictEqual(applySetConfig(null), null);
		assert.strictEqual(applySetConfig(true), true);
	});

	it('preserves Uint8Array (binary scalar) as-is', () => {
		const buf = new Uint8Array([1, 2, 3]);
		assert.strictEqual(applySetConfig(buf), buf);
	});
});

// ---------------------------------------------------------------------------
// anormalizeItem / normalizeItem roundtrip
// ---------------------------------------------------------------------------
describe('anormalizeItem / normalizeItem', () => {
	it('roundtrips a simple object', () => {
		const item = { name: 'Alice', age: 30, active: true };
		const marshalled = anormalizeItem(item);
		const restored = normalizeItem(marshalled);
		assert.deepStrictEqual(restored, item);
	});

	it('roundtrips nested objects', () => {
		const item = { user: { name: 'Alice', scores: [1, 2, 3] } };
		const marshalled = anormalizeItem(item);
		const restored = normalizeItem(marshalled);
		assert.deepStrictEqual(restored, item);
	});

	it('handles empty input', () => {
		assert.deepStrictEqual(anormalizeItem(null), {});
		assert.deepStrictEqual(normalizeItem(null), {});
	});
});

// ---------------------------------------------------------------------------
// buildExpected
// ---------------------------------------------------------------------------
describe('buildExpected', () => {
	it('builds expected from Raw condition', () => {
		const filter = { id: new Raw({ Exists: true, Value: { S: '123' } }) };
		const result = buildExpected(filter);
		assert.deepStrictEqual(result, {
			id: { Exists: true, Value: { S: '123' } },
		});
	});

	it('builds expected from operator condition', () => {
		const filter = { status: { operator: 'EQ', value: 'active' } };
		const result = buildExpected(filter);
		assert.deepStrictEqual(result, {
			status: {
				ComparisonOperator: 'EQ',
				AttributeValueList: [{ S: 'active' }],
			},
		});
	});

	it('returns empty for empty filter', () => {
		assert.deepStrictEqual(buildExpected({}), {});
	});
});

// ---------------------------------------------------------------------------
// expressionNameSplit
// ---------------------------------------------------------------------------
describe('expressionNameSplit', () => {
	it('splits dotted names', () => {
		assert.deepStrictEqual(expressionNameSplit('a.b.c'), ['a', 'b', 'c']);
	});

	it('returns single name as array', () => {
		assert.deepStrictEqual(expressionNameSplit('name'), ['name']);
	});
});
