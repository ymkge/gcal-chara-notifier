const path = require('path');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.resolve(process.cwd(), 'src', 'db', 'dev.sqlite3'),
    },
    migrations: {
      directory: path.resolve(process.cwd(), 'src', 'db', 'migrations'),
      extension: 'ts',
    },
    useNullAsDefault: true,
  },

  production: {
    client: 'postgresql', // Example for production
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(process.cwd(), 'src', 'db', 'migrations'),
    },
    pool: {
      min: 2,
      max: 10,
    },
    useNullAsDefault: true,
  },
};
