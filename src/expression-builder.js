import * as util from './util.js';

/**
 * Filter operators mapped to DynamoDB expression operators.
 */
const FILTER_OPERATORS = {
	EQ: '=',
	NE: '<>',
	LT: '<',
	LE: '<=',
	GT: '>',
	GE: '>=',
	BETWEEN: 'BETWEEN',
	IN: 'IN',
	NOT_NULL: 'attribute_exists',
	NULL: 'attribute_not_exists',
	BEGINS_WITH: 'begins_with',
	CONTAINS: 'contains',
	NOT_CONTAINS: 'not_contains',
};

/**
 * Manages expression attribute names and values for DynamoDB queries.
 */
export class ExpressionBuilder {
	constructor() {
		/** @type {Record<string, string> | undefined} */
		this.names = undefined;
		/** @type {Record<string, *> | undefined} */
		this.values = undefined;
	}

	/**
	 * Register an expression attribute name placeholder.
	 * @param {string} item - The attribute name.
	 * @param {boolean} [allowDot=false] - If true, treat dots as literal (no nesting).
	 * @returns {string} The placeholder string.
	 */
	registerName(item, allowDot = false) {
		if (!this.names) this.names = {};

		if (!allowDot) {
			return util
				.expressionNameSplit(item)
				.map((originalName) => {
					const safeName = originalName.replace(/-/g, '_minus_').replace(/\./g, '_dot_');
					const placeholder = `#${safeName}`;

					if (safeName.includes('[')) {
						return safeName
							.split('[')
							.map((part) => {
								if (part.endsWith(']')) return part;
								this.names[`#${part}`] = part;
								return `#${part}`;
							})
							.join('[');
					}

					this.names[placeholder] = originalName;
					return placeholder;
				})
				.join('.');
		}

		const safeName = item.replace(/-/g, '_minus_').replace(/\./g, '_dot_');
		const placeholder = `#${safeName}`;

		if (safeName.includes('[')) {
			return safeName
				.split('[')
				.map((part) => {
					if (part.endsWith(']')) return part;
					this.names[`#${part}`] = part;
					return `#${part}`;
				})
				.join('[');
		}

		this.names[placeholder] = item;
		return placeholder;
	}

	/**
	 * Register an expression attribute value placeholder.
	 * @param {string} originalName - The attribute name (used to derive the placeholder).
	 * @param {*} value - The value.
	 * @returns {string} The placeholder string.
	 */
	registerValue(originalName, value) {
		if (!this.values) this.values = {};

		const safeName = originalName.replace(/-/g, '_minus_').replace(/"/g, '_quote_');
		const basePlaceholder = `:${safeName.replace(/\./g, '_').replace(/\[/g, '_idx_').replace(/]/g, '')}`;

		let version = 1;
		while (this.values[`${basePlaceholder}_v${version}`]) version++;

		const placeholder = `${basePlaceholder}_v${version}`;
		this.values[placeholder] = value;
		return placeholder;
	}

	/**
	 * Build a ProjectionExpression from an array of attribute names.
	 * @param {string[]} attributes
	 * @returns {string | undefined}
	 */
	buildProjection(attributes) {
		if (!attributes || !attributes.length) return undefined;
		return attributes.map((attr) => this.registerName(attr)).join(', ');
	}

	/**
	 * Build a KeyConditionExpression from where keys and range conditions.
	 * @param {object} whereKey - Hash/range key conditions.
	 * @param {object} whereOther - Additional key conditions (range comparisons).
	 * @returns {string}
	 */
	buildKeyCondition(whereKey, whereOther) {
		const keyParts = Object.keys(whereKey).map((key) => {
			const name = this.registerName(key, true);
			const value = this.registerValue(key, util.normalizeItem({ value: whereKey[key] }).value, true);
			return `( ${name} = ${value} )`;
		});

		const otherParts = Object.keys(whereOther).map((key) => {
			const condition = whereOther[key];
			return `( ${this._buildConditionClause(key, condition, true)} )`;
		});

		return [...keyParts, ...otherParts].join(' AND \n');
	}

	/**
	 * Build a FilterExpression from an array of filter conditions.
	 * @param {object[]} filters
	 * @returns {string | undefined}
	 */
	buildFilter(filters) {
		if (!filters || !filters.length) return undefined;

		return filters
			.map((filter) => `( ${this._buildConditionClause(filter.attribute, filter)} )`)
			.join(' AND \n');
	}

	/**
	 * Build a single condition clause for a given attribute and condition.
	 * @private
	 * @param {string} key - Attribute name.
	 * @param {object} condition - Condition object with operator, value, value2.
	 * @param {boolean} [allowDot=false]
	 * @returns {string}
	 */
	_buildConditionClause(key, condition, allowDot = false) {
		const op = FILTER_OPERATORS[condition.operator];
		const name = this.registerName(key, allowDot);

		switch (op) {
			case '=':
			case '<>':
			case '<':
			case '<=':
			case '>':
			case '>=': {
				const value = this.registerValue(key, condition.value);
				return `${name} ${op} ${value}`;
			}

			case 'BETWEEN': {
				const v1 = this.registerValue(`${key}_1`, condition.value);
				const v2 = this.registerValue(`${key}_2`, condition.value2);
				return `${name} BETWEEN ${v1} AND ${v2}`;
			}

			case 'IN': {
				const placeholders = condition.value.map((v, i) => this.registerValue(`${key}_${i}`, v));
				return `${name} IN (${placeholders.join(',')})`;
			}

			case 'attribute_exists':
				return `attribute_exists(${name})`;

			case 'attribute_not_exists':
				return `attribute_not_exists(${name})`;

			case 'begins_with': {
				const value = this.registerValue(key, condition.value);
				return `begins_with(${name}, ${value})`;
			}

			case 'contains': {
				const value = this.registerValue(key, condition.value);
				return `contains(${name}, ${value})`;
			}

			case 'not_contains': {
				const value = this.registerValue(key, condition.value);
				return `NOT contains(${name}, ${value})`;
			}

			default:
				throw new Error(`Unsupported operator: ${condition.operator}`);
		}
	}
}
