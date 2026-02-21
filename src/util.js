import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

/**
 * Raw wrapper for DynamoDB-native typed values.
 */
export class Raw {
	constructor(data) {
		this.data = data;
	}

	getRawData() {
		return this.data;
	}
}

/**
 * Configuration for parsing behavior.
 */
export const config = {
	empty_string_replace_as: undefined,
	stringset_parse_as_set: false,
	numberset_parse_as_set: false,
	binaryset_parse_as_set: false,
};

/**
 * Deep clone an object.
 * @param {*} obj
 * @returns {*}
 */
export function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Detect the DynamoDB attribute type string for a JS value.
 * @param {*} value
 * @returns {string}
 */
export function anormalizeType(value) {
	if (value === null || value === undefined) return 'NULL';
	if (typeof value === 'boolean') return 'BOOL';
	if (typeof value === 'number') return 'N';
	if (typeof value === 'string') return 'S';
	if (Array.isArray(value)) return 'L';
	if (typeof value === 'object') return 'M';
	return 'S';
}

/**
 * Convert a JS value into a DynamoDB-typed attribute value.
 * @param {*} value
 * @returns {object}
 */
export function stringify(value) {
	if (value instanceof Raw) return value.data;

	if (value === null || value === undefined) return { NULL: true };
	if (typeof value === 'boolean') return { BOOL: value };
	if (typeof value === 'number') return { N: value.toString() };
	if (typeof value === 'string') {
		if (value === '' && config.empty_string_replace_as !== undefined) {
			return stringify(config.empty_string_replace_as);
		}
		return { S: value };
	}

	if (Array.isArray(value)) {
		return { L: value.map((item) => stringify(item)) };
	}

	if (typeof value === 'object') {
		const mapped = {};
		for (const key of Object.keys(value)) {
			mapped[key] = stringify(value[key]);
		}
		return { M: mapped };
	}

	return { S: String(value) };
}

/**
 * Convert a JS object into a DynamoDB marshalled item.
 * @param {object} item
 * @returns {object}
 */
export function anormalizeItem(item) {
	if (!item || typeof item !== 'object') return {};

	const result = {};
	for (const key of Object.keys(item)) {
		result[key] = stringify(item[key]);
	}
	return result;
}

/**
 * Parse a single DynamoDB typed attribute value back to JS.
 * @param {object} attr
 * @returns {*}
 */
export function parse(attr) {
	if (!attr || typeof attr !== 'object') return attr;

	if (attr.hasOwnProperty('S')) return attr.S;
	if (attr.hasOwnProperty('N')) return Number(attr.N);
	if (attr.hasOwnProperty('BOOL')) return attr.BOOL;
	if (attr.hasOwnProperty('NULL')) return null;
	if (attr.hasOwnProperty('B')) return attr.B;

	if (attr.hasOwnProperty('SS')) {
		return config.stringset_parse_as_set ? new Set(attr.SS) : attr.SS;
	}
	if (attr.hasOwnProperty('NS')) {
		const nums = attr.NS.map(Number);
		return config.numberset_parse_as_set ? new Set(nums) : nums;
	}
	if (attr.hasOwnProperty('BS')) {
		return config.binaryset_parse_as_set ? new Set(attr.BS) : attr.BS;
	}

	if (attr.hasOwnProperty('L')) {
		return attr.L.map((item) => parse(item));
	}

	if (attr.hasOwnProperty('M')) {
		const result = {};
		for (const key of Object.keys(attr.M)) {
			result[key] = parse(attr.M[key]);
		}
		return result;
	}

	return attr;
}

/**
 * Convert a DynamoDB marshalled item back to a JS object.
 * @param {object} item
 * @returns {object}
 */
export function normalizeItem(item) {
	if (!item || typeof item !== 'object') return {};
	return parse({ M: item });
}

/**
 * Build an Expected condition map from an ifFilter object.
 * @param {object} ifFilter
 * @returns {object}
 */
export function buildExpected(ifFilter) {
	const expected = {};

	for (const key of Object.keys(ifFilter)) {
		const condition = ifFilter[key];

		if (condition instanceof Raw) {
			expected[key] = condition.data;
			continue;
		}

		if (condition.operator) {
			expected[key] = {
				ComparisonOperator: condition.operator,
				AttributeValueList: condition.value !== undefined ? [stringify(condition.value)] : undefined,
			};
		}
	}

	return expected;
}

/**
 * Split a dotted expression name into parts (respecting array notation).
 * @param {string} name
 * @returns {string[]}
 */
export function expressionNameSplit(name) {
	return name.split('.');
}

/**
 * Convert a DynamoDB item to a SQL-like JSON string.
 * @param {object} item
 * @returns {string}
 */
export function toSQLJSON(item) {
	return JSON.stringify(normalizeItem(item));
}
