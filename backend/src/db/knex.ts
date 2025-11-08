import knex from 'knex';
import config = require('../knexfile');

type Environment = 'development' | 'production';

const environment: Environment = (process.env.NODE_ENV as Environment) || 'development';

// Cast to any to bypass the type error
const dbConfig = (config as any)[environment];
if (!dbConfig) {
  throw new Error(`Database configuration for environment '${environment}' not found.`);
}

const db = knex(dbConfig);

export default db;
