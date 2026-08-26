import "dotenv/config";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Create .env from LOCAL_ENV_TEMPLATE.txt first.");
  process.exitCode = 1;
} else {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [scansTable] = await connection.query("SHOW TABLES LIKE 'wifi_scans'");
    if (scansTable.length === 0) {
      throw new Error("The wifi_scans table does not exist. Run pnpm.cmd auth:repair before repairing WiFi observations.");
    }

    const [networksTable] = await connection.query("SHOW TABLES LIKE 'wifi_networks'");
    if (networksTable.length === 0) {
      await connection.query(`
        CREATE TABLE \`wifi_networks\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`scanId\` int NOT NULL,
          \`ssid\` varchar(255) DEFAULT NULL,
          \`bssid\` varchar(24) DEFAULT NULL,
          \`canal\` int NOT NULL,
          \`rssi\` int NOT NULL,
          \`encriptacion\` varchar(80) DEFAULT NULL,
          \`oculto\` tinyint(1) NOT NULL DEFAULT '0',
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`wifi_networks_scanId_idx\` (\`scanId\`),
          KEY \`wifi_networks_canal_idx\` (\`canal\`),
          CONSTRAINT \`wifi_networks_scanId_wifi_scans_id_fk\` FOREIGN KEY (\`scanId\`) REFERENCES \`wifi_scans\` (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log("Created wifi_networks to persist observations from the ESP32.");
    } else {
      console.log("WiFi observation schema is already present.");
    }

    await connection.query("ALTER TABLE `wifi_scans` MODIFY COLUMN `ocupacionEspectral` decimal(5,2) NULL");
    await connection.query("ALTER TABLE `wifi_scans` MODIFY COLUMN `perdidaPaquetes` decimal(5,2) NULL");
    await connection.query("ALTER TABLE `wifi_channels` MODIFY COLUMN `ocupacionEspectral` decimal(5,2) NULL");
    console.log("Calibrated optional WiFi metrics so unmeasured values remain N/D.");
  } finally {
    connection.destroy();
  }
}
