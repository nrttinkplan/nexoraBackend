const { pool } = require('../config/db');


exports.kullaniciFavorileriniGetir = async (req, res) => {
    
    const { uyeID } = req.params; 

    if (!uyeID) {
        return res.status(400).json({ error: 'Üye ID gereklidir.' });
    }

    try {
        const query = `
            SELECT
                f.favoriID,
                f.urunID,
                f.eklenmeTarihi,
                u.urunAdi,
                u.birimFiyat,
                u.gorselURL,
                u.stokAdedi
            FROM Favoriler f
            JOIN Urunler u ON f.urunID = u.urunID
            WHERE f.uyeID = $1
            ORDER BY f.eklenmeTarihi DESC;
        `;
        const result = await pool.query(query, [uyeID]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(`Kullanıcı (ID: ${uyeID}) favorilerini getirirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.favoriyeEkle = async (req, res) => {
    
    const { uyeID } = req.params; 
    const { urunID } = req.body;

    if (!uyeID || !urunID) {
        return res.status(400).json({ error: 'uyeID ve urunID gereklidir.' });
    }

    try {
        const query = `
            INSERT INTO Favoriler (uyeID, urunID)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const result = await pool.query(query, [uyeID, urunID]);
        res.status(201).json({ message: 'Ürün favorilere eklendi.', favori: result.rows[0] });
    } catch (err) {
        console.error('Favoriye eklerken hata:', err.stack);
        if (err.code === '23505') { 
             return res.status(409).json({ error: 'Bu ürün zaten favorilerinizde.' }); 
        }
        if (err.code === '23503') { 
             return res.status(404).json({ error: 'Geçersiz üye veya ürün ID.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.favoridenCikar = async (req, res) => {
    
    const { uyeID, urunID } = req.params; 

    if (!uyeID || !urunID) {
        return res.status(400).json({ error: 'uyeID ve urunID gereklidir.' });
    }

    try {
        const query = `
            DELETE FROM Favoriler
            WHERE uyeID = $1 AND urunID = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [uyeID, urunID]);

        if (result.rowCount === 0) {
            
            return res.status(404).json({ error: 'Favorilerinizde bu ürün bulunamadı veya size ait değil.' });
        }

        res.status(200).json({ message: 'Ürün favorilerden kaldırıldı.', kaldirilanFavori: result.rows[0] });
    } catch (err) {
        console.error('Favoriden çıkarırken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};