import { GetItemCommand, DeleteItemCommand, PutItemCommand, UpdateItemCommand, DescribeTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import * as util from './util.js';
import { Raw } from './util.js';
import { ExpressionBuilder } from './expression-builder.js';

/**
 * A chainable request builder for DynamoDB operations.
 */
export class Request {
	/**
	 * @param {import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient} client
	 * @param {object} options
	 * @param {object} options.events
	 * @param {object} options.describeTables
	 * @param {boolean} options.returnExplain
	 * @param {boolean} options.debug
	 */
	constructor(client, { events = {}, describeTables = {}, returnExplain = false, debug = false } = {}) {
		this.client = client;
		this.events = events;
		this.describeTables = describeTables;
		this.returnExplain = returnExplain;
		this.debug = debug;
		this.localEvents = {};
		this.tableName = null;

		this._reset();
	}

	// ---------------------------------------------------------------------------
	// Internal helpers
	// ---------------------------------------------------------------------------

	/** @private */
	_reset() {
		this.Select = null;
		this.AttributesToGet = [];
		this.ProjectionExpression = undefined;
		this.FilterExpression = undefined;

		this.pendingKey = null;
		this.pendingFilter = null;
		this.pendingIf = null;

		this.whereKey = {};
		this.KeyConditionExpression = undefined;
		this.whereOther = {};
		this.whereFilter = {};
		this.whereFilterExpression = [];

		this.ifFilter = {};
		this.ifConditionExpression = [];
		this.ConditionExpression = undefined;

		this.limitValue = null;
		this.IndexName = null;
		this.ScanIndexForward = true;
		this.LastEvaluatedKey = null;
		this.ExclusiveStartKey = null;
		this.ConsistentRead = false;
		this.ReturnConsumedCapacity = 'TOTAL';
		this.ReturnValues = 'NONE';
		this.ConsumedCapacity = null;

		this.expressionBuilder = new ExpressionBuilder();
	}

	/**
	 * Route a DynamoDB command through the client.
	 * @private
	 */
	async _send(method, params, shouldReset = true) {
		this.events.beforeRequest?.call(this, method, params);

		if (this.debug) console.info(`[aws-dynamodb-query][${method}]`, JSON.stringify(params, null, 2));

		const command = this._buildCommand(method, params);

		if (this.returnExplain) {
			if (shouldReset) this._reset();
			return { _explain: true, method, params };
		}

		try {
			const data = await this.client.send(command);

			if (this.debug) console.log(`[aws-dynamodb-query][${method}] Response:`, data);

			if (data?.ConsumedCapacity) {
				this.ConsumedCapacity = data.ConsumedCapacity;
			}

			if (shouldReset) this._reset();
			return data;
		} catch (err) {
			if (this.debug) {
				console.error(`[aws-dynamodb-query][${method}] Error:`, err.message, params);
			}
			this.events.error?.call(this, method, err, params);
			throw err;
		}
	}

	/**
	 * Map a method name to the appropriate AWS SDK command.
	 * @private
	 */
	_buildCommand(method, params) {
		const commands = {
			put: PutItemCommand,
			update: UpdateItemCommand,
			delete: DeleteItemCommand,
			get: GetItemCommand,
			query: QueryCommand,
			scan: ScanCommand,
			listTables: ListTablesCommand,
			describeTable: DescribeTableCommand,
		};

		const CommandClass = commands[method];
		if (!CommandClass) throw new Error(`Unknown method: ${method}`);

		return new CommandClass(params);
	}

	/**
	 * Describe a table, using cache if available.
	 * @private
	 */
	async _describeTable(table) {
		if (this.describeTables[table]) {
			return { Table: this.describeTables[table] };
		}

		if (this.debug) {
			console.warn(`[aws-dynamodb-query] missing schema for table "${table}", calling DescribeTable API`);
		}

		const result = await this._send('describeTable', { TableName: table }, false);

		// Cache the result to avoid repeated API calls for the same table
		if (result?.Table) {
			this.describeTables[table] = result.Table;
		}

		return result;
	}

	/**
	 * Build expressions before executing a query/scan.
	 * @private
	 */
	_buildExpressions() {
		if (!this.KeyConditionExpression) {
			this.KeyConditionExpression = this.expressionBuilder.buildKeyCondition(this.whereKey, this.whereOther);
		}

		if (!this.ProjectionExpression && this.AttributesToGet.length) {
			this.ProjectionExpression = this.expressionBuilder.buildProjection(this.AttributesToGet);
		}

		if (!this.FilterExpression && this.whereFilterExpression.length) {
			this.FilterExpression = this.expressionBuilder.buildFilter(this.whereFilterExpression);
		}
	}

	// ---------------------------------------------------------------------------
	// Chainable configuration methods
	// ---------------------------------------------------------------------------

	/**
	 * Set the target table.
	 * @param {string} name
	 * @returns {this}
	 */
	table(name) {
		this.tableName = name;
		return this;
	}

	/**
	 * Register a local event handler.
	 * @param {string} eventName
	 * @param {Function} callback
	 * @returns {this}
	 */
	on(eventName, callback) {
		this.localEvents[eventName] = callback;
		return this;
	}

	/**
	 * Select specific attributes to return.
	 * @param {string[]|number} attributes - Array of attribute names, or a select constant.
	 * @returns {this}
	 */
	select(attributes) {
		if (attributes === 1) {
			this.Select = 'ALL_ATTRIBUTES';
			return this;
		}
		if (attributes === 2) {
			this.Select = 'ALL_PROJECTED_ATTRIBUTES';
			return this;
		}
		if (attributes === 3) {
			this.Select = 'COUNT';
			return this;
		}

		if (Array.isArray(attributes)) {
			this.AttributesToGet = attributes;
		} else {
			this.AttributesToGet = Array.from(arguments);
		}

		return this;
	}

	/**
	 * Set ReturnValues for write operations.
	 * @param {string} returnValues
	 * @returns {this}
	 */
	return(returnValues) {
		this.ReturnValues = returnValues;
		return this;
	}

	/**
	 * Enable consistent reads.
	 * @param {boolean} [value=true]
	 * @returns {this}
	 */
	consistentRead(value = true) {
		this.ConsistentRead = Boolean(value);
		return this;
	}

	/** Alias for consistentRead */
	consistent_read(value) {
		return this.consistentRead(value);
	}

	/**
	 * Set return consumed capacity.
	 * @param {string} value
	 * @returns {this}
	 */
	return_consumed_capacity(value) {
		this.ReturnConsumedCapacity = value;
		return this;
	}

	/**
	 * Set descending sort order.
	 * @returns {this}
	 */
	descending() {
		this.ScanIndexForward = false;
		return this;
	}

	/** Alias for descending */
	desc() {
		return this.descending();
	}

	/**
	 * Use a specific index.
	 * @param {string} indexName
	 * @returns {this}
	 */
	index(indexName) {
		this.IndexName = indexName;
		return this;
	}

	/** Alias for index */
	order_by(indexName) {
		return this.index(indexName);
	}

	/**
	 * Set the result limit.
	 * @param {number} limit
	 * @returns {this}
	 */
	limit(limit) {
		this.limitValue = limit;
		return this;
	}

	/**
	 * Resume a paginated query/scan from a last evaluated key.
	 * @param {object|null} from
	 * @returns {this}
	 */
	resume(from) {
		this.ExclusiveStartKey = from;
		return this;
	}

	// ---------------------------------------------------------------------------
	// Where / Filter / If conditions
	// ---------------------------------------------------------------------------

	/**
	 * Set a key condition for query operations.
	 * @param {string} key
	 * @param {*} [value1]
	 * @param {*} [value2]
	 * @returns {this}
	 */
	where(key, value1, value2) {
		if (value1 === undefined) {
			this.pendingKey = key;
			return this;
		}

		if (value2 === undefined) {
			this.whereKey[key] = typeof value1 === 'number' ? { N: value1.toString() } : { S: value1 };
		} else {
			this.whereOther[key] = {
				type: 'S',
				value: value2,
				operator: value1,
			};
		}

		return this;
	}

	/**
	 * Set a filter condition (applied after query/scan).
	 * @param {string} key
	 * @returns {this}
	 */
	filter(key) {
		this.pendingFilter = key;
		return this;
	}

	/**
	 * Set a conditional expression for write operations.
	 * @param {string} key
	 * @returns {this}
	 */
	if(key) {
		this.pendingIf = key;
		return this;
	}

	/**
	 * Apply a comparison operator to the pending key/filter/if.
	 * @private
	 * @param {string} comparison
	 * @param {*} value
	 * @param {*} [value2]
	 * @returns {this}
	 */
	_compare(comparison, value, value2) {
		if (this.pendingFilter !== null) {
			const entry = {
				attribute: this.pendingFilter,
				operator: comparison,
				type: util.anormalizeType(value),
				value,
				value2,
			};
			this.whereFilter[this.pendingFilter] = entry;
			this.whereFilterExpression.push(entry);
			this.pendingFilter = null;
			return this;
		}

		if (this.pendingIf !== null) {
			if (comparison === 'EQ') {
				this.ifFilter[this.pendingIf] = new Raw({ Exists: true, Value: util.stringify(value) });
			} else {
				this.ifFilter[this.pendingIf] = {
					operator: comparison,
					type: util.anormalizeType(value),
					value,
					value2,
				};
			}

			this.ifConditionExpression.push({
				attribute: this.pendingIf,
				operator: comparison,
				type: util.anormalizeType(value),
				value,
				value2,
			});

			this.pendingIf = null;
			return this;
		}

		this.whereOther[this.pendingKey] = {
			operator: comparison,
			type: util.anormalizeType(value),
			value,
			value2,
		};
		this.pendingKey = null;
		return this;
	}

	// Comparison methods
	eq(value) {
		if (this.pendingFilter !== null) return this._compare('EQ', value);
		if (this.pendingIf !== null) return this._compare('EQ', value);

		this.whereKey[this.pendingKey] = util.stringify(value);
		this.pendingKey = null;
		return this;
	}

	ne(value) {
		return this._compare('NE', value);
	}
	le(value) {
		return this._compare('LE', value);
	}
	lt(value) {
		return this._compare('LT', value);
	}
	ge(value) {
		return this._compare('GE', value);
	}
	gt(value) {
		return this._compare('GT', value);
	}
	begins_with(value) {
		return this._compare('BEGINS_WITH', value);
	}
	between(value1, value2) {
		return this._compare('BETWEEN', value1, value2);
	}
	contains(value) {
		return this._compare('CONTAINS', value);
	}
	not_contains(value) {
		return this._compare('NOT_CONTAINS', value);
	}
	in(value) {
		return this._compare('IN', value);
	}

	not_null() {
		return this._compare('NOT_NULL');
	}
	defined() {
		return this.not_null();
	}
	null() {
		return this._compare('NULL');
	}
	undefined() {
		return this.null();
	}

	exists() {
		if (this.pendingIf !== null) {
			this.ifFilter[this.pendingIf] = new Raw({ Exists: true });
			this.pendingIf = null;
		}
		return this;
	}

	not_exists() {
		if (this.pendingIf !== null) {
			this.ifFilter[this.pendingIf] = new Raw({ Exists: false });
			this.pendingIf = null;
		}
		return this;
	}

	// ---------------------------------------------------------------------------
	// CRUD operations (all return Promises, with optional callback support)
	// ---------------------------------------------------------------------------

	/**
	 * Get a single item by key.
	 * @param {Function} [callback] - `function(err, item, rawResponse)`
	 * @returns {Promise<object>}
	 */
	get(callback) {
		if (this.AttributesToGet.length) {
			this.ProjectionExpression = this.expressionBuilder.buildProjection(this.AttributesToGet);
		}

		const params = {
			TableName: this.tableName,
			Key: this.whereKey,
			ConsistentRead: this.ConsistentRead,
			ReturnConsumedCapacity: this.ReturnConsumedCapacity,
			ProjectionExpression: this.ProjectionExpression,
			ExpressionAttributeNames: this.expressionBuilder.names,
		};

		if (typeof callback !== 'function') {
			return this._send('get', params).then((data) => {
				return util.parse({ M: data.Item || {} });
			});
		}

		this._send('get', params)
			.then((data) => {
				callback.call(this, null, util.parse({ M: data.Item || {} }), data);
			})
			.catch((err) => {
				callback.call(this, err, null);
			});
	}

	/**
	 * Query items using key conditions.
	 *
	 * **Promise mode** (no callback): Returns `{ items, lastKey, count, scannedCount, consumedCapacity }`
	 *
	 * **Callback mode**: Calls `callback(err, items, raw)` with `this.LastEvaluatedKey` available.
	 *
	 * @param {Function} [callback] - `function(err, items, rawResponse)`
	 * @returns {Promise<{items: object[], lastKey: object|null, count: number, scannedCount: number, consumedCapacity: object}>|this}
	 *
	 * @example
	 * // Promise pagination
	 * let lastKey = null;
	 * do {
	 *   const result = await db.table('orders')
	 *     .where('customer_id').eq('cus_123')
	 *     .resume(lastKey)
	 *     .limit(100)
	 *     .query();
	 *   console.log(result.items);
	 *   lastKey = result.lastKey;
	 * } while (lastKey);
	 */
	query(callback) {
		this._buildExpressions();

		const params = {
			TableName: this.tableName,
			KeyConditionExpression: this.KeyConditionExpression,
			ConsistentRead: this.ConsistentRead,
			ReturnConsumedCapacity: this.ReturnConsumedCapacity,
			Select: this.Select || undefined,
			ProjectionExpression: this.ProjectionExpression,
			ExpressionAttributeNames: this.expressionBuilder.names,
			FilterExpression: this.FilterExpression,
			ExpressionAttributeValues: this.expressionBuilder.values,
		};

		if (this.limitValue !== null) params.Limit = this.limitValue;
		if (!this.ScanIndexForward) params.ScanIndexForward = false;
		if (this.IndexName) params.IndexName = this.IndexName;
		if (this.ExclusiveStartKey) params.ExclusiveStartKey = this.ExclusiveStartKey;

		this.localEvents.beforeRequest?.('query', params);

		if (typeof callback !== 'function') {
			return this._send('query', params).then((data) => {
				this.LastEvaluatedKey = data.LastEvaluatedKey ?? null;
				return {
					items: data.Items || [],
					lastKey: data.LastEvaluatedKey || null,
					count: data.Count ?? 0,
					scannedCount: data.ScannedCount ?? 0,
					consumedCapacity: data.ConsumedCapacity || null,
				};
			});
		}

		this._send('query', params)
			.then((data) => {
				this.LastEvaluatedKey = data.LastEvaluatedKey ?? null;
				callback.call(this, null, data.Items, data);
			})
			.catch((err) => {
				callback.call(this, err, null);
			});

		return this;
	}

	/**
	 * Scan the entire table or index.
	 *
	 * **Promise mode** (no callback): Returns `{ items, lastKey, count, scannedCount, consumedCapacity }`
	 *
	 * **Callback mode**: Calls `callback(err, items, raw)` with `this.LastEvaluatedKey` available.
	 *
	 * @param {Function} [callback] - `function(err, items, rawResponse)`
	 * @returns {Promise<{items: object[], lastKey: object|null, count: number, scannedCount: number, consumedCapacity: object}>|this}
	 *
	 * @example
	 * // Promise pagination
	 * let lastKey = null;
	 * do {
	 *   const result = await db.table('users')
	 *     .resume(lastKey)
	 *     .limit(100)
	 *     .scan();
	 *   console.log(result.items);
	 *   lastKey = result.lastKey;
	 * } while (lastKey);
	 */
	scan(callback) {
		if (this.AttributesToGet.length) {
			this.ProjectionExpression = this.expressionBuilder.buildProjection(this.AttributesToGet);
		}

		if (this.whereFilterExpression.length) {
			this.FilterExpression = this.expressionBuilder.buildFilter(this.whereFilterExpression);
		}

		const params = {
			TableName: this.tableName,
			Select: this.Select || undefined,
			ProjectionExpression: this.ProjectionExpression,
			ExpressionAttributeNames: this.expressionBuilder.names,
			FilterExpression: this.FilterExpression,
			ExpressionAttributeValues: this.expressionBuilder.values,
			ReturnConsumedCapacity: this.ReturnConsumedCapacity,
		};

		if (this.limitValue !== null) params.Limit = this.limitValue;
		if (this.ExclusiveStartKey) params.ExclusiveStartKey = this.ExclusiveStartKey;
		if (this.IndexName) params.IndexName = this.IndexName;

		if (typeof callback !== 'function') {
			return this._send('scan', params).then((data) => {
				this.LastEvaluatedKey = data.LastEvaluatedKey ?? null;
				return {
					items: data.Items || [],
					lastKey: data.LastEvaluatedKey || null,
					count: data.Count ?? 0,
					scannedCount: data.ScannedCount ?? 0,
					consumedCapacity: data.ConsumedCapacity || null,
				};
			});
		}

		this._send('scan', params)
			.then((data) => {
				this.LastEvaluatedKey = data.LastEvaluatedKey ?? null;
				callback.call(this, null, data.Items, data);
			})
			.catch((err) => {
				callback.call(this, err, null);
			});

		return this;
	}

	/**
	 * Insert a new item. Fails if the primary key already exists.
	 * @param {object} item
	 * @param {Function} [callback] - `function(err, attributes, rawResponse)`
	 * @returns {Promise<object>}
	 */
	insert(item, callback) {
		const doInsert = async () => {
			const tableInfo = await this._describeTable(this.tableName);

			for (const schema of tableInfo.Table.KeySchema) {
				this.if(schema.AttributeName).not_exists();
			}

			const params = {
				TableName: this.tableName,
				Item: util.anormalizeItem(item),
				Expected: util.buildExpected(this.ifFilter),
				ReturnConsumedCapacity: this.ReturnConsumedCapacity,
				ReturnValues: this.ReturnValues,
			};

			this.localEvents.beforeRequest?.('put', params);

			const data = await this._send('put', params);
			return { result: util.normalizeItem(data.Attributes || {}), raw: data };
		};

		if (typeof callback !== 'function') {
			return doInsert().then(({ result, raw }) => ({
				attributes: result,
				consumedCapacity: raw?.ConsumedCapacity || null,
			}));
		}

		doInsert()
			.then(({ result, raw }) => callback.call(this, null, result, raw))
			.catch((err) => callback.call(this, err, null));
	}

	/**
	 * Replace an existing item. Fails if the primary key does not exist.
	 * @param {object} item
	 * @param {Function} [callback]
	 * @returns {Promise<object>}
	 */
	replace(item, callback) {
		const doReplace = async () => {
			const tableInfo = await this._describeTable(this.tableName);

			for (const schema of tableInfo.Table.KeySchema) {
				this.if(schema.AttributeName).eq(item[schema.AttributeName]);
			}

			const params = {
				TableName: this.tableName,
				Item: util.anormalizeItem(item),
				Expected: util.buildExpected(this.ifFilter),
				ReturnConsumedCapacity: this.ReturnConsumedCapacity,
				ReturnValues: this.ReturnValues,
			};

			const data = await this._send('put', params);
			return { result: util.normalizeItem(data.Attributes || {}), raw: data };
		};

		if (typeof callback !== 'function') {
			return doReplace().then(({ result, raw }) => ({
				attributes: result,
				consumedCapacity: raw?.ConsumedCapacity || null,
			}));
		}

		doReplace()
			.then(({ result, raw }) => callback.call(this, null, result, raw))
			.catch((err) => callback.call(this, err, null));
	}

	/**
	 * Update specific attributes on an existing item.
	 * @param {object} attrs - Key-value pairs to update. `undefined` values delete the attribute.
	 * @param {Function} [callback]
	 * @returns {Promise<object>}
	 */
	update(attrs, callback) {
		const doUpdate = async () => {
			const tableInfo = await this._describeTable(this.tableName);

			for (const schema of tableInfo.Table.KeySchema) {
				if (!this.whereKey[schema.AttributeName]) {
					throw { message: `ValidationException: Missing value for "${schema.AttributeName}" in .where()` };
				}
				this.if(schema.AttributeName).eq(util.normalizeItem({ key: this.whereKey[schema.AttributeName] }).key);
			}

			const attributeUpdates = {};
			for (const [key, value] of Object.entries(attrs)) {
				if (value === undefined) {
					attributeUpdates[key] = { Action: 'DELETE' };
				} else if (value?.getRawData) {
					attributeUpdates[key] = value.getRawData();
				} else {
					attributeUpdates[key] = { Action: 'PUT', Value: util.stringify(value) };
				}
			}

			const params = {
				TableName: this.tableName,
				Key: this.whereKey,
				Expected: util.buildExpected(this.ifFilter),
				AttributeUpdates: attributeUpdates,
				ReturnConsumedCapacity: this.ReturnConsumedCapacity,
				ReturnValues: this.ReturnValues,
			};

			this.localEvents.beforeRequest?.('update', params);

			const data = await this._send('update', params);
			return { result: util.normalizeItem(data.Attributes || {}), raw: data };
		};

		if (typeof callback !== 'function') {
			return doUpdate().then(({ result, raw }) => ({
				attributes: result,
				consumedCapacity: raw?.ConsumedCapacity || null,
			}));
		}

		doUpdate()
			.then(({ result, raw }) => callback.call(this, null, result, raw))
			.catch((err) => callback.call(this, err, null));
	}

	/**
	 * Insert or update an item (upsert).
	 * @param {object} itemParams - Full item including keys.
	 * @param {Function} [callback]
	 * @returns {Promise<object>}
	 */
	insert_or_update(itemParams, callback) {
		const doUpsert = async () => {
			const attrs = util.clone(itemParams);
			const tableInfo = await this._describeTable(this.tableName);

			for (const schema of tableInfo.Table.KeySchema) {
				this.where(schema.AttributeName).eq(attrs[schema.AttributeName]);
				delete attrs[schema.AttributeName];
			}

			const attributeUpdates = {};
			for (const [key, value] of Object.entries(attrs)) {
				if (value === undefined) {
					attributeUpdates[key] = { Action: 'DELETE' };
				} else if (value?.getRawData) {
					attributeUpdates[key] = value.getRawData();
				} else {
					attributeUpdates[key] = { Action: 'PUT', Value: util.stringify(value) };
				}
			}

			const queryParams = {
				TableName: this.tableName,
				Key: this.whereKey,
				AttributeUpdates: attributeUpdates,
				ReturnConsumedCapacity: this.ReturnConsumedCapacity,
				ReturnValues: this.ReturnValues,
			};

			const data = await this._send('update', queryParams);
			return { result: util.normalizeItem(data.Attributes || {}), raw: data };
		};

		if (typeof callback !== 'function') {
			return doUpsert().then(({ result, raw }) => ({
				attributes: result,
				consumedCapacity: raw?.ConsumedCapacity || null,
			}));
		}

		doUpsert()
			.then(({ result, raw }) => callback.call(this, null, result, raw))
			.catch((err) => callback.call(this, err, null));
	}

	/**
	 * Insert or replace an item (overwrite regardless of existence).
	 * @param {object} item
	 * @param {Function} [callback]
	 * @returns {Promise<object>}
	 */
	insert_or_replace(item, callback) {
		const params = {
			TableName: this.tableName,
			Item: util.anormalizeItem(item),
			ReturnConsumedCapacity: this.ReturnConsumedCapacity,
			ReturnValues: this.ReturnValues,
		};

		this.localEvents.beforeRequest?.('put', params);

		if (typeof callback !== 'function') {
			return this._send('put', params).then((data) => ({
				attributes: util.normalizeItem(data.Attributes || {}),
				consumedCapacity: data?.ConsumedCapacity || null,
			}));
		}

		this._send('put', params)
			.then((data) => callback.call(this, null, util.normalizeItem(data.Attributes || {}), data))
			.catch((err) => callback.call(this, err, null));
	}

	/**
	 * Delete an item or specific attributes.
	 * @param {string[]|Function} [attrsOrCallback] - Array of attribute names to delete, or callback.
	 * @param {Function} [callback]
	 * @returns {Promise<object>}
	 */
	delete(attrsOrCallback, callback) {
		// delete()  — promise, delete entire item
		if (arguments.length === 0) {
			const params = {
				TableName: this.tableName,
				Key: this.whereKey,
				ReturnConsumedCapacity: this.ReturnConsumedCapacity,
				ReturnValues: this.ReturnValues,
			};
			return this._send('delete', params).then((data) => ({
				attributes: util.normalizeItem(data.Attributes || {}),
				consumedCapacity: data?.ConsumedCapacity || null,
			}));
		}

		// delete(callback) — callback, delete entire item
		if (typeof attrsOrCallback === 'function') {
			const params = {
				TableName: this.tableName,
				Key: this.whereKey,
				ReturnConsumedCapacity: this.ReturnConsumedCapacity,
				ReturnValues: this.ReturnValues,
			};

			this._send('delete', params)
				.then((data) => attrsOrCallback.call(this, null, util.normalizeItem(data.Attributes || {}), data))
				.catch((err) => attrsOrCallback.call(this, err, null));
			return;
		}

		// delete(['attr1', 'attr2'], callback) — delete specific attributes
		const attributeUpdates = {};
		for (const attr of attrsOrCallback) {
			attributeUpdates[attr] = { Action: 'DELETE' };
		}

		const params = {
			TableName: this.tableName,
			Key: this.whereKey,
			AttributeUpdates: attributeUpdates,
			ReturnConsumedCapacity: this.ReturnConsumedCapacity,
			ReturnValues: this.ReturnValues,
		};

		if (typeof callback !== 'function') {
			return this._send('delete', params).then((data) => ({
				attributes: util.normalizeItem(data.Attributes || {}),
				consumedCapacity: data?.ConsumedCapacity || null,
			}));
		}

		this._send('delete', params)
			.then((data) => callback.call(this, null, util.normalizeItem(data.Attributes || {}), data))
			.catch((err) => callback.call(this, err, null));
	}

	/**
	 * Describe the current table.
	 *
	 * **Promise mode**: Returns `{ table, consumedCapacity }`
	 *
	 * **Callback mode**: Calls `callback(err, table, raw)`
	 *
	 * @param {Function} [callback]
	 * @returns {Promise<{table: object, consumedCapacity: object|null}>}
	 */
	describe(callback) {
		const doDescribe = async () => {
			const raw = await this._send('describeTable', { TableName: this.tableName }, true);

			if (!raw?.Table) {
				throw new Error('Invalid response: no Table property in describeTable response');
			}

			const info = { ...raw.Table };

			const removeKeys = ['TableStatus', 'TableArn', 'TableSizeBytes', 'ItemCount', 'CreationDateTime', 'TableId'];
			removeKeys.forEach((k) => delete info[k]);

			if (info.ProvisionedThroughput) {
				delete info.ProvisionedThroughput.NumberOfDecreasesToday;
				delete info.ProvisionedThroughput.LastIncreaseDateTime;
				delete info.ProvisionedThroughput.LastDecreaseDateTime;
			}

			if (info.BillingModeSummary) {
				info.BillingMode = info.BillingModeSummary.BillingMode;
				delete info.BillingModeSummary;
			}

			if (info.GlobalSecondaryIndexes) {
				for (const gsi of info.GlobalSecondaryIndexes) {
					delete gsi.IndexSizeBytes;
					delete gsi.IndexStatus;
					delete gsi.ItemCount;
					delete gsi.IndexArn;
					if (gsi.ProvisionedThroughput) {
						delete gsi.ProvisionedThroughput.NumberOfDecreasesToday;
					}
				}
			}

			if (info.LocalSecondaryIndexes) {
				for (const lsi of info.LocalSecondaryIndexes) {
					delete lsi.IndexSizeBytes;
					delete lsi.ItemCount;
					delete lsi.IndexArn;
				}
			}

			if (info.BillingMode === 'PAY_PER_REQUEST') {
				delete info.ProvisionedThroughput;
				if (info.GlobalSecondaryIndexes) {
					for (const gsi of info.GlobalSecondaryIndexes) {
						delete gsi.ProvisionedThroughput;
					}
				}
			}

			return { info, raw };
		};

		if (typeof callback !== 'function') {
			return doDescribe().then(({ info, raw }) => ({
				table: info,
				consumedCapacity: raw?.ConsumedCapacity || null,
			}));
		}

		doDescribe()
			.then(({ info, raw }) => callback.call(this, null, info, raw))
			.catch((err) => callback.call(this, err, null));
	}
}
