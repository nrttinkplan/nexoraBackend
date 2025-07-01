
const { pool } = require('../config/db');


exports.tumKategorileriGetir = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Kategoriler ORDER BY kategoriAdi ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Kategorileri getirirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.kategoriEkle = async (req, res) => {
    const { kategoriAdi, ustKategoriID, aciklama } = req.body;
    if (!kategoriAdi) {
        return res.status(400).json({ error: 'kategoriAdi gereklidir.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO Kategoriler (kategoriAdi, ustKategoriID, aciklama) VALUES ($1, $2, $3) RETURNING *',
            [kategoriAdi, ustKategoriID || null, aciklama || null] 
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Kategori eklerken hata:', err.stack);
       
        if (err.code === '23505') { 
             return res.status(409).json({ error: 'Bu kategori adı zaten mevcut.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};