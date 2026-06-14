const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'jugarxbox',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const seed = fs.readFileSync(path.join(__dirname, 'rellenoBD.sql'), 'utf8');
    await connection.query(`${schema}\n${seed}`);
    const [rows] = await connection.query(
      'SELECT COUNT(*) AS programas FROM cooperacion_desarrollo.programas'
    );
    console.log(`Base creada correctamente: ${rows[0].programas} programas.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Error preparando MySQL:', error.message);
  process.exit(1);
});
