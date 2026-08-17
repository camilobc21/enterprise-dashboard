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
      throw new Error("The users table does not exist. Run pnpm.cmd db:push before repairing the network inventory.");
    }

    const [networkTable] = await connection.query("SHOW TABLES LIKE 'network_devices'");
    if (networkTable.length > 0) {
      console.log("Network device schema is already present.");
    } else {
      await connection.query(`
        CREATE TABLE \`network_devices\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`ownerId\` int NOT NULL,
          \`displayName\` varchar(160) NOT NULL,
          \`ipAddress\` varchar(45) DEFAULT NULL,
          \`macAddress\` varchar(32) NOT NULL,
          \`vendor\` varchar(160) DEFAULT NULL,
          \`deviceType\` enum('unknown','computer','phone','tablet','iot','printer','router','camera','server') NOT NULL DEFAULT 'unknown',
          \`status\` enum('online','offline','unknown') NOT NULL DEFAULT 'unknown',
          \`isTrusted\` tinyint(1) NOT NULL DEFAULT '0',
          \`source\` enum('manual','router_dhcp','router_arp','esp32') NOT NULL DEFAULT 'manual',
          \`firstSeen\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`lastSeen\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`network_devices_owner_mac_unique\` (\`ownerId\`, \`macAddress\`),
          KEY \`network_devices_ownerId_idx\` (\`ownerId\`),
          KEY \`network_devices_lastSeen_idx\` (\`lastSeen\`),
          CONSTRAINT \`network_devices_ownerId_users_id_fk\` FOREIGN KEY (\`ownerId\`) REFERENCES \`users\` (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log("Created network_devices table and indexes without modifying existing data.");
    }
  } finally {
    await connection.end();
  }
}
