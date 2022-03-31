const { lookup } = require('mime-types');
const db = require('../core/db');
const debug = require('debug')('server-connect:db');

module.exports = {

    connect: function(options, name) {
        if (!name) throw new Error('dbconnector.connect has no name.');
        this.setDbConnection(name, options);
    },

    select: async function(options) {
        const connection = this.parseRequired(options.connection, 'string', 'dbconnector.select: connection is required.');
        const sql = this.parseSQL(options.sql);
        const db = this.getDbConnection(connection);

        if (!db) throw new Error(`Connection "${connection}" doesn't exist.`);
        if (!sql) throw new Error('dbconnector.select: sql is required.');
        if (!sql.table) throw new Error('dbconnector.select: sql.table is required.');
        if (typeof sql.sort != 'string') sql.sort = this.parseOptional('{{ $_GET.sort }}', 'string', null);
        if (typeof sql.dir != 'string') sql.dir = this.parseOptional('{{ $_GET.dir }}', 'string', 'asc');

        if (sql.sort && sql.columns) {
            if (!sql.orders) sql.orders = [];

            for (let column of sql.columns) {
                if (column.column == sql.sort || column.alias == sql.sort) {
                    let order = {
                        column: column.alias || column.column,
                        direction: sql.dir.toLowerCase() == 'desc' ? 'desc' : 'asc'
                    };

                    if (column.table) order.table = column.table;

                    sql.orders.unshift(order);

                    break;
                }
            }
        }

        sql.type = 'select';

        if (options.test) {
            return {
                options: options,
                query: sql.toString()
            };
        }

        if (sql.sub) {
            let hasKey = true;

            if (Array.isArray(sql.columns) && sql.columns.length) {
                hasKey = sql.columns.some(column => (column.column || column) == sql.primary);
                
                if (!hasKey) {
                    sql.columns.push(sql.primary);
                }
            }

            const results = await db.fromJSON(sql);

            if (results.length) {
                await _processSubQueries.call(this, db, results, sql.primary, sql.sub, !hasKey);
            }

            return results;
        }

        return db.fromJSON(sql);
    },

    count: async function(options) {
        const connection = this.parseRequired(options.connection, 'string', 'dbconnector.count: connection is required.');
        const sql = this.parseSQL(options.sql);
        const db = this.getDbConnection(connection);

        if (!db) throw new Error(`Connection "${connection}" doesn't exist.`);
        if (!sql) throw new Error('dbconnector.count: sql is required.');
        if (!sql.table) throw new Error('dbconnector.count: sql.table is required.');

        sql.type = 'count';

        if (options.test) {
            return {
                options: options,
                query: sql.toString()
            };
        }

        return (await db.fromJSON(sql)).Total;
    },

    single: async function(options) {
        const connection = this.parseRequired(options.connection, 'string', 'dbconnector.single: connection is required.');
        const sql = this.parseSQL(options.sql);
        const db = this.getDbConnection(connection);

        if (!db) throw new Error(`Connection "${connection}" doesn't exist.`);
        if (!sql) throw new Error('dbconnector.single: sql is required.');
        if (!sql.table) throw new Error('dbconnector.single: sql.table is required.');
        if (typeof sql.sort != 'string') sql.sort = this.parseOptional('{{ $_GET.sort }}', 'string', null);
        if (typeof sql.dir != 'string') sql.dir = this.parseOptional('{{ $_GET.dir }}', 'string', 'asc');

        sql.type = 'first';

        if (options.test) {
            return {
                options: options,
                query: sql.toString()
            };
        }

        if (sql.sub) {
            let hasKey = true;

            if (Array.isArray(sql.columns) && sql.columns.length) {
                hasKey = sql.columns.some(column => (column.column || column) == sql.primary);
                
                if (!hasKey) {
                    sql.columns.push(sql.primary);
                }
            }

            const result = await db.fromJSON(sql);

            if (!result) return null;

            await _processSubQueries.call(this, db, [result], sql.primary, sql.sub, !hasKey);

            return result;
        }

        return db.fromJSON(sql) || null;
    },

    paged: async function(options) {
        const connection = this.parseRequired(options.connection, 'string', 'dbconnector.paged: connection is required.');
        const sql = this.parseSQL(options.sql);
        const db = this.getDbConnection(connection);

        if (!db) throw new Error(`Connection "${connection}" doesn't exist.`);
        if (!sql) throw new Error('dbconnector.paged: sql is required.');
        if (!sql.table) throw new Error('dbconnector.paged: sql.table is required.');
        if (typeof sql.offset != 'number') sql.offset = Number(this.parseOptional('{{ $_GET.offset }}', '*', 0));
        if (typeof sql.limit != 'number') sql.limit = Number(this.parseOptional('{{ $_GET.limit }}', '*', 25));
        if (typeof sql.sort != 'string') sql.sort = this.parseOptional('{{ $_GET.sort }}', 'string', null);
        if (typeof sql.dir != 'string') sql.dir = this.parseOptional('{{ $_GET.dir }}', 'string', 'asc');

        if (sql.sort && sql.columns) {
            if (!sql.orders) sql.orders = [];

            for (let column of sql.columns) {
                if (column.column == sql.sort || column.alias == sql.sort) {
                    let order = {
                        column: column.alias || column.column,
                        direction: sql.dir.toLowerCase() == 'desc' ? 'desc' : 'asc'
                    };

                    if (column.table) order.table = column.table;

                    sql.orders.unshift(order);
                    
                    break;
                }
            }
        }

        sql.type = 'count';
        let total = +(await db.fromJSON(sql))['Total'];

        sql.type = 'select';
        let data = [];

        if (options.test) {
            return {
                options: options,
                query: sql.toString()
            };
        }

        if (sql.sub) {
            let hasKey = true;

            if (Array.isArray(sql.columns) && sql.columns.length) {
                hasKey = sql.columns.some(column => (column.column || column) == sql.primary);
                
                if (!hasKey) {
                    sql.columns.push(sql.primary);
                }
            }

            const results = await db.fromJSON(sql);
            
            if (results.length) {
                await _processSubQueries.call(this, db, results, sql.primary, sql.sub, !hasKey);
            }

            data = results;
        } else {
            data = await db.fromJSON(sql);
        }

        return {
            offset: sql.offset,
            limit: sql.limit,
            total,
            page: {
                offset: {
                    first: 0,
                    prev: sql.offset - sql.limit > 0 ? sql.offset - sql.limit : 0,
                    next: sql.offset + sql.limit < total ? sql.offset + sql.limit : sql.offset,
                    last: (Math.ceil(total / sql.limit) - 1) * sql.limit
                },
                current: Math.floor(sql.offset / sql.limit) + 1,
                total: Math.ceil(total / sql.limit)
            },
            data
        }
    },

};

async function _processSubQueries(db, results, primary, sub, clearKey) {
    const lookup = new Map();
    const keys = new Set();

    // get keys from results and create lookup table
    // add initial sub field to results (empty array)
    for (const result of results) {
        const key = result[primary];
        
        lookup.set(key, result);
        keys.add(key);

        if (clearKey) {
            delete result[primary];
        }

        for (const field in sub) {
            result[field] = [];
        }
    }

    for (const field in sub) {
        const sql = this.parseSQL(sub[field]);
        let hasKey = true;

        sql.type = 'select';

        if (Array.isArray(sql.columns) && sql.columns.length) {
            hasKey = sql.columns.some(col => (col.column || col) == sql.key);
            
            if (!hasKey) {
                sql.columns.push(sql.key);
            }
        }

        // get all subresults with a single query
        const subResults = await db.fromJSON(sql).whereIn(sql.key, Array.from(keys));

        if (sql.sub && subResults.length) {
            await _processSubQueries.call(this, db, subResults, sql.primary, sql.sub);
        }

        // map the sub results to the parent recordset
        for (const subResult of subResults) {
            const result = lookup.get(subResult[sql.key]);

            if (result) {
                if (!hasKey) {
                    delete subResult[sql.key];
                }

                result[field].push(subResult);
            } else {
                // should never come here, key not in parent results
                // we skip when result was not found using lookup
                console.warn(`Relation for ${field} was not found (${sub.key}=${subResult[sub.key]}).`);
            }
        }
    }

    // we don't need to return anything since all is updated by reference
}
