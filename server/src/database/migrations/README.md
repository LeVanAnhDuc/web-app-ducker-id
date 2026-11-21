# Database migrations

Data and index changes that existing databases need when the code changes shape. Seed data for dev and test lives in `../seeders/`, not here.

Run by [migrate-mongo](https://github.com/seppevs/migrate-mongo), configured in `server/migrate-mongo-config.js`, which reads `DB_URL` / `DB_NAME` from `server/.env`.

```
<yyyymmddhhmmss>-<name>.ts   one migration: up + down
sample-migration.ts          the template `create` copies (never run)
transforms/                  pure data transforms used by migrations, with specs
```

What ran is recorded in the `changelog` collection. `changelog_lock` holds a lock while a run is in progress; a run that crashed frees it after 30 minutes.

## Commands

Run from `server/`. Check `DB_NAME` first: migrations use whatever database `server/.env` points at.

| Command                      | What it does                                    |
| ---------------------------- | ----------------------------------------------- |
| `pnpm migrate status`        | Every migration, and when it ran or `PENDING`   |
| `pnpm migrate up`            | Run every pending migration, oldest first       |
| `pnpm migrate down`          | Revert the most recent migration                |
| `pnpm migrate create <name>` | Write `<timestamp>-<name>.ts` from the template |

To try a migration without touching real data, point it at a new database: `DB_NAME=ducker-id-scratch pnpm migrate up`.

## Rules

1. **Never edit or rename a migration after it has run anywhere.** The changelog records the file name. To change something, write a new migration.
2. **`up` must be idempotent.** Touch only documents still in the old shape. A run that died halfway can then simply run again.
3. **Check before you write.** Anything that would make `up` fail halfway, such as a unique index that existing data would violate, is checked at the top of `up` and throws before the first write.
4. **Name collections and indexes literally.** Do not import models or call `syncIndexes()`: a migration must mean the same thing after the models change. Write through `db`, the native driver. Mongoose strict mode would silently drop `$unset` on fields the schema no longer declares.
5. **`down` must work on half-migrated data, or throw.** If the change deletes data, `down` throws `"<name> cannot be reverted — restore from backup"`. Never leave it empty: an empty `down` would mark the migration as reverted.
6. **Put non-trivial transforms in `transforms/`** as pure functions with a spec.

## Deploying

1. Back up: `mongodump --uri "$DB_URL" --db "$DB_NAME" --out backup-$(date +%F)`. MongoDB has no transactional DDL, so the backup is the safety net.
2. `pnpm migrate up`, before the new release takes traffic.
3. Start the new release.

If a migration fails partway, the ones before it stay applied and it does not. Either fix the cause and run `up` again, or restore the backup. If the release is bad after a successful `up`, run `pnpm migrate down` once per migration to undo, then redeploy the previous release. An irreversible migration means restoring the backup.
