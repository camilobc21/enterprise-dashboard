import "dotenv/config";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Create .env from LOCAL_ENV_TEMPLATE.txt first.");
  process.exitCode = 1;
} else {
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      throw new Error("The users table does not exist. Run pnpm.cmd db:push to create a new database schema.");
    }

    const [columnRows] = await connection.query("SHOW COLUMNS FROM `users`");
    const columns = new Set(columnRows.map((column) => column.Field));
    const changes = [];

    async function addColumn(name, definition) {
      if (columns.has(name)) return;
      await connection.query(`ALTER TABLE \`users\` ADD COLUMN \`${name}\` ${definition}`);
      columns.add(name);
      changes.push(`added ${name}`);
    }

    await addColumn("name", "text NULL");
    await addColumn("email", "varchar(320) NULL");
    await addColumn("passwordHash", "varchar(255) NULL");
    await addColumn("loginMethod", "varchar(64) NULL");
    await addColumn("role", "enum('user', 'admin') NOT NULL DEFAULT 'user'");
    await addColumn("createdAt", "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP");
    await addColumn("updatedAt", "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    await addColumn("lastSignedIn", "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP");

    if (!columns.has("openId")) {
      await connection.query("ALTER TABLE `users` ADD COLUMN `openId` varchar(64) NULL");
      await connection.query("UPDATE `users` SET `openId` = CONCAT('legacy-', `id`) WHERE `openId` IS NULL OR `openId` = ''");
      await connection.query("ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NOT NULL");
      columns.add("openId");
      changes.push("added openId and assigned legacy identifiers");
    }

    const [indexRows] = await connection.query("SHOW INDEX FROM `users`");
    const indexedColumns = new Set(indexRows.map((index) => index.Column_name));

    async function addUniqueIndex(column, indexName) {
      if (indexedColumns.has(column)) return;
      const [duplicates] = await connection.query(
        `SELECT \`${column}\`, COUNT(*) AS total FROM \`users\` WHERE \`${column}\` IS NOT NULL GROUP BY \`${column}\` HAVING COUNT(*) > 1 LIMIT 1`,
      );

      if (duplicates.length > 0) {
        throw new Error(
          `Cannot create ${indexName}: duplicated ${column} values need manual review. No rows were deleted or merged.`,
        );
      }

      await connection.query(`CREATE UNIQUE INDEX \`${indexName}\` ON \`users\` (\`${column}\`)`);
      indexedColumns.add(column);
      changes.push(`added unique index ${indexName}`);
    }

    await addUniqueIndex("openId", "users_openId_unique");
    await addUniqueIndex("email", "users_email_unique");

    if (changes.length === 0) {
      console.log("Authentication schema is already compatible.");
    } else {
      console.log(`Authentication schema repaired: ${changes.join(", ")}.`);
    }
  } finally {
    await connection.end();
  }
}
