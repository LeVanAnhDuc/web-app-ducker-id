// Read by migrate-mongo, which `pnpm migrate` starts under ts-node, so the
// app's own env config — and the DB_URL / DB_NAME in .env — can be reused.
const { default: config } = require("./src/constants/env");

module.exports = {
  mongodb: {
    url: config.db.url,
    databaseName: config.db.name,
    options: {
      serverSelectionTimeoutMS: config.db.timeout.serverSelectionMs
    }
  },
  migrationsDir: "src/database/migrations",
  migrationFileExtension: ".ts",
  changelogCollectionName: "changelog",
  lockCollectionName: "changelog_lock",
  // A run that crashed frees the lock after 30 minutes instead of never
  lockTtl: 30 * 60,
  // Off: an executed migration is immutable — fix forward with a new one
  useFileHash: false,
  moduleSystem: "commonjs"
};
