import { Raw, stringify } from './util.js';

/**
 * Create a String Set attribute.
 * @param {string[]} data
 * @returns {Raw}
 */
export function SS(data) {
	if (!Array.isArray(data)) throw new Error('SS: argument should be an array');
	return new Raw({ SS: data });
}

/**
 * Create a Binary Set attribute.
 * @param {Array} data
 * @returns {Raw}
 */
export function BS(data) {
	if (!Array.isArray(data)) throw new Error('BS: argument should be an array');
	return new Raw({ BS: data });
}

/**
 * Create a Number attribute.
 * @param {number|string} data
 * @returns {Raw}
 */
export function N(data) {
	if (typeof data !== 'number' && typeof data !== 'string') {
		throw new Error('N: argument should be a number or string');
	}
	return new Raw({ N: data.toString() });
}

/**
 * Create a String attribute.
 * @param {string} data
 * @returns {Raw}
 */
export function S(data) {
	if (typeof data !== 'string') throw new Error('S: argument should be a string');
	return new Raw({ S: data });
}

/**
 * Create a Number Set attribute.
 * @param {number[]} data
 * @returns {Raw}
 */
export function NS(data) {
	if (!Array.isArray(data)) throw new Error('NS: argument should be an array');
	return new Raw({ NS: data.map((el) => el.toString()) });
}

/**
 * Create a List attribute.
 * @param {Array} data
 * @returns {Raw}
 */
export function L(data) {
	if (!Array.isArray(data)) throw new Error('L: argument should be an array');
	return new Raw({ L: data.map((item) => stringify(item)) });
}

/**
 * @typedef {object} RawAction
 * @property {string} Action
 * @property {object} [Value]
 */

class RawAction {
	constructor(data) {
		this.data = data;
	}
	getRawData() {
		return this.data;
	}
}

/**
 * Create an ADD update action.
 * @param {*} data - Value to add. Defaults to incrementing by 1.
 * @param {string} [datatype] - Force a specific DynamoDB type.
 * @returns {RawAction}
 */
export function add(data, datatype) {
	if (typeof datatype === 'string') {
		const forced = { N, NS, SS, L };
		const unsupported = ['B', 'BOOL', 'NULL', 'S', 'BS', 'M'];

		if (unsupported.includes(datatype)) {
			throw new Error(`ADD action is not supported for type: ${datatype}`);
		}

		if (forced[datatype]) {
			return add(forced[datatype](data));
		}

		throw new Error(`ADD action is not supported for type: ${datatype}`);
	}

	if (data instanceof Raw) {
		return new RawAction({ Action: 'ADD', Value: data.data });
	}

	if (typeof data === 'number' || typeof data === 'undefined') {
		return add(N(data || 1));
	}

	if (Array.isArray(data)) {
		return add(L(data));
	}

	throw new Error(`ADD action is not supported for type: ${typeof data}`);
}

/**
 * Create a DELETE update action.
 * @param {*} [data] - Value to delete from a set. Omit to remove the attribute.
 * @param {string} [datatype] - Force a specific DynamoDB type.
 * @returns {RawAction}
 */
export function del(data, datatype) {
	if (typeof datatype === 'string') {
		if (datatype === 'NS') return del(NS(data));
		if (datatype === 'SS') return del(SS(data));

		throw new Error(`DELETE action is not supported for type: ${datatype}`);
	}

	if (data instanceof Raw) {
		return new RawAction({ Action: 'DELETE', Value: data.data });
	}

	if (arguments.length === 0) {
		return new RawAction({ Action: 'DELETE' });
	}

	throw new Error(`DELETE action is not supported for type: ${typeof data}`);
}
