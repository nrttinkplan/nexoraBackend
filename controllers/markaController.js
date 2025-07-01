
const { pool } = require('../config/db');


exports.tumMarkalariGetir = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Markalar ORDER BY markaAdi ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Markaları getirirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.markaEkle = async (req, res) => {
    const { markaAdi } = req.body;
    if (!markaAdi) {
        return res.status(400).json({ error: 'markaAdi gereklidir.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO Markalar (markaAdi) VALUES ($1) RETURNING *',
            [markaAdi]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Marka eklerken hata:', err.stack);
        if (err.code === '23505') { 
            return res.status(409).json({ error: 'Bu marka adı zaten mevcut.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.markaGetirById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM Markalar WHERE markaID = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Marka bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Marka (ID: ${id}) getirilirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.markaGuncelle = async (req, res) => {
    const { id } = req.params;
    const { markaAdi } = req.body;

    if (!markaAdi) {
        return res.status(400).json({ error: 'markaAdi gereklidir.' });
    }

    try {
        const result = await pool.query(
            'UPDATE Markalar SET markaAdi = $1 WHERE markaID = $2 RETURNING *',
            [markaAdi, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek marka bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Marka (ID: ${id}) güncellenirken hata:`, err.stack);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Bu marka adı zaten mevcut.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.markaSil = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM Markalar WHERE markaID = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Silinecek marka bulunamadı.' });
        }
        res.status(200).json({ message: 'Marka başarıyla silindi.', silinenMarka: result.rows[0] });
    } catch (err) {
        console.error(`Marka (ID: ${id}) silinirken hata:`, err.stack);
         if (err.code === '23503') { 
            return res.status(409).json({ error: 'Bu marka ürünlerle ilişkili olduğu için silinemez.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};