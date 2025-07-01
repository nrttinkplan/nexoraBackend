
require('dotenv').config(); 
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || "5432", 10),
});

pool.on('connect', () => {
    console.log('PostgreSQL veritabanına başarıyla bağlanıldı!');
});

pool.on('error', (err) => {
    console.error('PostgreSQL bağlantı hatası:', err.stack);
   
});



module.exports = {
    pool, 
};