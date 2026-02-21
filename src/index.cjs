// CommonJS wrapper for backward compatibility
// Usage: const DynamoDB = require('@awspilot/dynamodb')

async function loadModule() {
	const mod = await import('./index.js');
	return mod;
}

let _cached = null;

function DynamodbFactory($config) {
	// Lazy-load the ESM module
	if (!_cached) {
		// For synchronous require(), we need to use a different approach
		// The actual DynamoDB class is loaded on first use
		throw new Error(
			'@awspilot/dynamodb v3 uses ESM. Use `import DynamoDB from "@awspilot/dynamodb"` ' +
			'or use dynamic import: `const { default: DynamoDB } = await import("@awspilot/dynamodb")`'
		);
	}

	return new _cached.DynamoDB($config);
}

// Pre-load for environments that support top-level await
loadModule().then((mod) => {
	_cached = mod;

	// Copy static properties
	Object.assign(DynamodbFactory, {
		config: mod.DynamoDB.config,
		util: mod.util,
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
	});
}).catch(() => {
	// Silent catch - error will surface when user tries to instantiate
});

module.exports = DynamodbFactory;
