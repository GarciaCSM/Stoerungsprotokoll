const odbc = require('odbc');
require('dotenv').config();

const connectionString = process.env.ODBC_CONNECTION_STRING;

console.log('Testing ODBC connection...');
console.log('Connection String:', connectionString);
console.log('---');

async function testConnection() {
  let connection;
  
  try {
    console.log('Attempting to connect...');
    connection = await odbc.connect(connectionString);
    console.log('✓ Connection successful!');
    console.log('---');

    // Test query: get a few records from FAKoepfe
    console.log('Testing query on dbo.FAKoepfe...');
    const sql = `
      SELECT TOP 5 
        FANr, 
        ArtikelNr, 
        Artikelbezeichnung, 
        Verarbeitungsstatus
      FROM dbo.FAKoepfe
      WHERE Verarbeitungsstatus IN (30, 35, 36)
      ORDER BY FANr DESC
    `;
    
    const result = await connection.query(sql);
    console.log(`✓ Query successful! Found ${result.length} records:`);
    console.log('---');
    
    result.forEach((row, index) => {
      console.log(`${index + 1}. FANr: ${row.FANr}`);
      console.log(`   ArtikelNr: ${row.ArtikelNr}`);
      console.log(`   Artikelbezeichnung: ${row.Artikelbezeichnung}`);
      console.log(`   Status: ${row.Verarbeitungsstatus}`);
      console.log('');
    });
    
    console.log('✓ Database test completed successfully!');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('---');
    console.error('Mögliche Ursachen:');
    console.error('1. ODBC DSN "metaARGON" ist nicht konfiguriert (odbcad32.exe)');
    console.error('2. Benutzername oder Passwort falsch');
    console.error('3. Netzwerkverbindung zur Datenbank nicht erreichbar');
    console.error('4. Tabelle dbo.FAKoepfe existiert nicht oder keine Rechte');
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Connection closed.');
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
}

testConnection();
