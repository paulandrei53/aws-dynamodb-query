import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Request } from './request.js';
import * as util from './util.js';
import { SS, BS, N, S, NS, L, add, del } from './types.js';

/**
 * @typedef {object} DynamoDBClientConfig
 * @property {string} [region] - AWS region.
 * @property {string} [accessKeyId] - AWS access key.
 * @property {string} [secretAccessKey] - AWS secret key.
 * @property {boolean} [debug=false] - Enable debug logging.
 */

/**
 * Main DynamoDB client. Provides a fluent API for interacting with DynamoDB.
 *
 * @example
 * ```js
 * import DynamoDB from 'aws-dynamodb-query';
 *
 * const db = new DynamoDB({ region: 'us-east-1' });
 *
 * // Get an item
 * const item = await db.table('users').where('id').eq('123').get();
 *
 * // Query with index
 * const items = await db.table('orders')
 *   .index('index-customer_id')
 *   .where('customer_id').eq('cus_123')
 *   .query();
 *
 * // Insert
 * await db.table('users').insert({ id: '123', name: 'Alice' });
 *
 * // Update
 * await db.table('users').where('id').eq('123').update({ name: 'Bob' });
 *
 * // Delete
 * await db.table('users').where('id').eq('123').delete();
 * ```
 */
export class DynamoDB {
	/**
	 * @param {DynamoDBClientConfig | import('@aws-sdk/client-dynamodb').DynamoDBClient} [clientOrConfig]
	 */
	constructor(clientOrConfig) {
		this.events = {
			error: () => {},
			beforeRequest: () => {},
		};
		this.describeTables = {};
		this.returnExplain = false;
		this.debug = false;

		// Accept an existing DynamoDBClient instance
		if (clientOrConfig?.config?.hasOwnProperty('dynamoDbCrc32')) {
			this.client = clientOrConfig;
			return;
		}

		const config = clientOrConfig || {};

		if (config.debug) {
			console.log('[aws-dynamodb-query] Debug mode enabled');
			this.debug = true;
		}

		let rawClient;

		if (config.accessKeyId) {
			if (this.debug) console.log('[aws-dynamodb-query] Creating client with credentials');

			rawClient = new DynamoDBClient({
				credentials: {
					accessKeyId: config.accessKeyId,
					secretAccessKey: config.secretAccessKey || '',
				},
				region: config.region,
			});
		} else {
			if (this.debug) console.log('[aws-dynamodb-query] No credentials provided, using AWS default credential chain');
			rawClient = new DynamoDBClient(config.region ? { region: config.region } : {});
		}

		this.client = DynamoDBDocumentClient.from(rawClient);
	}

	// ---------------------------------------------------------------------------
	// Type helpers (instance methods for backward compatibility)
	// ---------------------------------------------------------------------------

	/** Create a String Set attribute. */
	SS(data) {
		return SS(data);
	}
	stringSet(data) {
		return SS(data);
	}

	/** Create a Binary Set attribute. */
	BS(data) {
		return BS(data);
	}
	binarySet(data) {
		return BS(data);
	}

	/** Create a Number attribute. */
	N(data) {
		return N(data);
	}
	number(data) {
		return N(data);
	}

	/** Create a String attribute. */
	S(data) {
		return S(data);
	}
	string(data) {
		return S(data);
	}

	/** Create a Number Set attribute. */
	NS(data) {
		return NS(data);
	}
	numberSet(data) {
		return NS(data);
	}

	/** Create a List attribute. */
	L(data) {
		return L(data);
	}
	list(data) {
		return L(data);
	}

	/** Create an ADD update action. */
	add(data, datatype) {
		return add(data, datatype);
	}

	/** Create a DELETE update action. */
	del(data, datatype) {
		return del(data, datatype);
	}

	// ---------------------------------------------------------------------------
	// Schema management
	// ---------------------------------------------------------------------------

	/**
	 * Pre-register table schemas to avoid describeTable calls.
	 * @param {object|object[]} schemas
	 * @returns {this}
	 */
	schema(schemas) {
		const schemaList = Array.isArray(schemas) ? schemas : [schemas];

		for (const schema of schemaList) {
			if (!schema?.TableName) throw new Error('Invalid schema: missing TableName');
			if (!schema?.KeySchema) throw new Error('Invalid schema: missing KeySchema');
			this.describeTables[schema.TableName] = schema;
		}

		return this;
	}

	// ---------------------------------------------------------------------------
	// Query entry points
	// ---------------------------------------------------------------------------

	/**
	 * Enable explain mode for the next query (returns params instead of executing).
	 * @returns {this}
	 */
	explain() {
		this.returnExplain = true;
		return this;
	}

	/**
	 * Start a new request chain for a table.
	 * @param {string} tableName
	 * @returns {Request}
	 */
	table(tableName) {
		const explain = this.returnExplain;
		this.returnExplain = false;

		return new Request(this.client, {
			events: this.events,
			describeTables: this.describeTables,
			returnExplain: explain,
			debug: this.debug,
		}).table(tableName);
	}

	// ---------------------------------------------------------------------------
	// Utility
	// ---------------------------------------------------------------------------

	/**
	 * Get the underlying DynamoDB Document Client.
	 * @returns {import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient}
	 */
	getClient() {
		return this.client;
	}

	/**
	 * Register global event handlers.
	 * @param {'error'|'beforeRequest'} event
	 * @param {Function} handler
	 */
	on(event, handler) {
		this.events[event] = handler;
	}
}

// ---------------------------------------------------------------------------
// Select constants
// ---------------------------------------------------------------------------

const CONSTANTS = {
	ALL: 1,
	ALL_ATTRIBUTES: 1,
	PROJECTED: 2,
	ALL_PROJECTED_ATTRIBUTES: 2,
	COUNT: 3,
	NONE: 'NONE',
	ALL_OLD: 'ALL_OLD',
	UPDATED_OLD: 'UPDATED_OLD',
	ALL_NEW: 'ALL_NEW',
	UPDATED_NEW: 'UPDATED_NEW',
	TOTAL: 'TOTAL',
	INDEXES: 'INDEXES',
};

for (const [key, value] of Object.entries(CONSTANTS)) {
	DynamoDB[key] = value;
	DynamoDB.prototype[key] = value;
}

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

/**
 * Configure global parsing behavior.
 * @param {object} options
 * @param {*} [options.empty_string_replace_as]
 * @param {boolean} [options.stringset_parse_as_set]
 * @param {boolean} [options.numberset_parse_as_set]
 * @param {boolean} [options.binaryset_parse_as_set]
 */
DynamoDB.config = function (options) {
	if (options.hasOwnProperty('empty_string_replace_as')) {
		util.config.empty_string_replace_as = options.empty_string_replace_as;
	}
	if (options.hasOwnProperty('stringset_parse_as_set')) {
		util.config.stringset_parse_as_set = options.stringset_parse_as_set;
	}
	if (options.hasOwnProperty('numberset_parse_as_set')) {
		util.config.numberset_parse_as_set = options.numberset_parse_as_set;
	}
	if (options.hasOwnProperty('binaryset_parse_as_set')) {
		util.config.binaryset_parse_as_set = options.binaryset_parse_as_set;
	}
};

/** Utility functions */
DynamoDB.util = util;
