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
      console.log("AI provider configuration schema is already present.");
    } else {
      await connection.query(`
        CREATE TABLE \`ai_provider_configs\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`configKey\` varchar(32) NOT NULL,
          \`providerName\` varchar(100) NOT NULL,
          \`baseUrl\` varchar(500) NOT NULL,
          \`model\` varchar(160) NOT NULL,
          \`encryptedApiKey\` text NOT NULL,
          \`updatedBy\` int NOT NULL,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`ai_provider_configs_configKey_unique\` (\`configKey\`),
          KEY \`ai_provider_configs_updatedBy_idx\` (\`updatedBy\`),
          CONSTRAINT \`ai_provider_configs_updatedBy_users_id_fk\` FOREIGN KEY (\`updatedBy\`) REFERENCES \`users\` (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log("Created ai_provider_configs table and indexes without modifying existing data.");
    }
  } finally {
    await connection.end();
  }
}
