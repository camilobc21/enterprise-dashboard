import "dotenv/config";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Create .env from LOCAL_ENV_TEMPLATE.txt first.");
  process.exitCode = 1;
} else {
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const [usersTable] = await connection.query("SHOW TABLES LIKE 'users'");
    if (usersTable.length === 0) {
      throw new Error("The users table does not exist. Run pnpm.cmd db:push before repairing the AI configuration schema.");
    }

    const [providerTable] = await connection.query("SHOW TABLES LIKE 'ai_provider_configs'");
    if (providerTable.length > 0) {
      console.log("AI provider configuration schema is already present. No changes were required.");
    } else {
      await connection.query(`
        CREATE TABLE \`ai_provider_configs\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`configKey\` varchar(32) NOT NULL,
          \`providerName\` varchar(100) NOT NULL,
          \`baseUrl\` varchar(500) NOT NULL,
          \`model\` varchar(160) NOT NULL,
          \`encryptedApiKey\` text NOT NULL,
          \`isActive\` tinyint(1) NOT NULL DEFAULT '0',
          \`updatedBy\` int NOT NULL,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`ai_provider_configs_configKey_unique\` (\`configKey\`),
          KEY \`ai_provider_configs_isActive_idx\` (\`isActive\`),
          KEY \`ai_provider_configs_updatedBy_idx\` (\`updatedBy\`),
          CONSTRAINT \`ai_provider_configs_updatedBy_users_id_fk\` FOREIGN KEY (\`updatedBy\`) REFERENCES \`users\` (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log("Created ai_provider_configs table and indexes without modifying existing data.");
    }

    const [columnRows] = await connection.query("SHOW COLUMNS FROM `ai_provider_configs`");
    const columns = new Set(columnRows.map((column) => column.Field));
    if (!columns.has("isActive")) {
      await connection.query("ALTER TABLE `ai_provider_configs` ADD COLUMN `isActive` tinyint(1) NOT NULL DEFAULT '0'");
      console.log("Added isActive to the AI provider configuration schema.");
    }

    const [indexRows] = await connection.query("SHOW INDEX FROM `ai_provider_configs`");
    if (!indexRows.some((index) => index.Key_name === "ai_provider_configs_isActive_idx")) {
      await connection.query("CREATE INDEX `ai_provider_configs_isActive_idx` ON `ai_provider_configs` (`isActive`)");
      console.log("Added active-provider index.");
    }

    const [activeRows] = await connection.query("SELECT COUNT(*) AS total FROM `ai_provider_configs` WHERE `isActive` = 1");
    if (Number(activeRows[0]?.total ?? 0) === 0) {
      await connection.query("UPDATE `ai_provider_configs` SET `isActive` = 1 WHERE `configKey` = 'global'");
    }
  } finally {
    connection.destroy();
  }
}
