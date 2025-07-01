
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db'); 

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; 


app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


app.get('/', (req, res) => {
    res.send('E-ticaret API Ana Sayfasına Hoş Geldiniz!');
});


app.get('/db-test', async (req, res) => {
    try {
        const client = await pool.connect(); 
        const result = await client.query('SELECT NOW()'); 
        client.release(); 
        res.json({ message: 'Veritabanı bağlantısı başarılı!', time: result.rows[0].now });
    } catch (err) {
        console.error('Veritabanı test hatası:', err.stack);
        res.status(500).json({ error: 'Veritabanı bağlantı hatası', details: err.message });
    }
});

const kategoriRoutes = require('./routes/kategoriRoutes');
app.use('/api/kategoriler', kategoriRoutes); 


const urunRoutes = require('./routes/urunRoutes'); 
app.use('/api/urunler', urunRoutes); 

const markaRoutes = require('./routes/markaRoutes'); 
app.use('/api/markalar', markaRoutes); 

const uyeRoutes = require('./routes/uyeRoutes'); 
app.use('/api/uyeler', uyeRoutes); 


const adresRoutes = require('./routes/adresRoutes'); 
app.use('/api/adresler', adresRoutes);  

const siparisRoutes = require('./routes/siparisRoutes'); 
app.use('/api/siparisler', siparisRoutes);

const sepetRoutes = require('./routes/sepetRoutes'); 
app.use('/api/sepet', sepetRoutes);  

const yorumRoutes = require('./routes/yorumRoutes'); 

app.use('/api', yorumRoutes); 


const favoriRoutes = require('./routes/favoriRoutes'); 
app.use('/api/uyeler', favoriRoutes); 

const vitrinRoutes = require('./routes/vitrinRoutes'); 
app.use('/api/vitrin', vitrinRoutes);


const kargoRoutes = require('./routes/kargoRoutes'); 
app.use('/api/kargolar', kargoRoutes);               



app.listen(PORT,HOST, () => {
    console.log(`Sunucu http://${HOST}:${PORT} adresinde çalışıyor.`);
});