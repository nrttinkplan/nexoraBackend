const { pool } = require('../config/db');


exports.getAllKargolar = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Kargolar ORDER BY firmaAdi ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Kargo firmaları getirilirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.getKargoById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM Kargolar WHERE kargoFirmasiID = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Kargo firması bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Kargo firması (ID: ${id}) getirilirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.createKargo = async (req, res) => {
    const { firmaAdi } = req.body;

    if (!firmaAdi) {
        return res.status(400).json({ error: 'firmaAdi gereklidir.' });
    }

    

    try {
        const query = `
            INSERT INTO Kargolar (firmaAdi)
            VALUES ($1)
            RETURNING *;
        `;
        const result = await pool.query(query, [firmaAdi]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Kargo firması eklerken hata:', err.stack);
        if (err.code === '23505') { 
             return res.status(409).json({ error: 'Bu firma adı zaten kayıtlı.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.updateKargo = async (req, res) => {
    const { id } = req.params;
    const { firmaAdi } = req.body;

    if (!firmaAdi) {
        return res.status(400).json({ error: 'firmaAdi gereklidir.' });
    }

   

    try {
        const query = `
            UPDATE Kargolar SET firmaAdi = $1
            WHERE kargoFirmasiID = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [firmaAdi, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Güncellenecek kargo firması bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Kargo firması (ID: ${id}) güncellenirken hata:`, err.stack);
         if (err.code === '23505') { 
             return res.status(409).json({ error: 'Bu firma adı zaten başka bir firmaya ait.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.deleteKargo = async (req, res) => {
    const { id } = req.params;

    

    try {

        const query = `
            DELETE FROM Kargolar
            WHERE kargoFirmasiID = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Silinecek kargo firması bulunamadı.' });
        }

        res.status(200).json({ message: 'Kargo firması başarıyla silindi.', silinenFirma: result.rows[0] });
    } catch (err) {
        console.error(`Kargo firması (ID: ${id}) silinirken hata:`, err.stack);
        
        if (err.code === '23503') {
             return res.status(409).json({ error: 'Bu kargo firması siparişlerle ilişkili olduğu için silinemez.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};