const { pool } = require('../config/db');


exports.getVitrinUrunleri = async (req, res) => {
    try {
        const query = `
            SELECT
                v.vitrinID,
                v.urunID,
                v.sira, -- Sıralama için
                v.eklenmeTarihi,
                u.urunAdi,
                u.birimFiyat,
                u.gorselURL,
                u.stokAdedi,
                u.aciklama -- Ürünle ilgili diğer gerekli bilgiler
            FROM Vitrin v
            JOIN Urunler u ON v.urunID = u.urunID
            ORDER BY v.sira ASC, v.eklenmeTarihi DESC; -- Önce sıra, sonra eklenme tarihine göre
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Vitrin ürünleri getirilirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.vitrineEkle = async (req, res) => {
    const { urunID, sira = 0 } = req.body; 

    if (urunID === undefined) {
        return res.status(400).json({ error: 'urunID gereklidir.' });
    }

    

    try {
        const query = `
            INSERT INTO Vitrin (urunID, sira)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const result = await pool.query(query, [urunID, sira]);
        res.status(201).json({ message: 'Ürün vitrine eklendi.', vitrinKaydi: result.rows[0] });
    } catch (err) {
        console.error('Vitrine ürün eklerken hata:', err.stack);
        if (err.code === '23505') { 
             return res.status(409).json({ error: 'Bu ürün zaten vitrinde.' });
        }
        if (err.code === '23503') { 
             return res.status(404).json({ error: 'Vitrine eklenmek istenen ürün bulunamadı.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.vitrindenCikar = async (req, res) => {
    const { urunID } = req.params; 

    if (!urunID) {
        return res.status(400).json({ error: 'urunID gereklidir.' });
    }

    

    try {
        const query = `
            DELETE FROM Vitrin
            WHERE urunID = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [urunID]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Vitrinden çıkarılacak ürün bulunamadı (zaten vitrinde olmayabilir).' });
        }

        res.status(200).json({ message: 'Ürün vitrinden kaldırıldı.', kaldirilanKayit: result.rows[0] });
    } catch (err) {
        console.error('Vitrinden ürün çıkarılırken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.vitrinSiraGuncelle = async (req, res) => {
    const { urunID } = req.params;
    const { yeniSira } = req.body;

    if (!urunID || yeniSira === undefined || typeof yeniSira !== 'number') {
         return res.status(400).json({ error: 'urunID ve geçerli bir sayı olan yeniSira gereklidir.' });
    }

   
    try {
        const query = `
            UPDATE Vitrin SET sira = $1
            WHERE urunID = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [yeniSira, urunID]);
         if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Sırası güncellenecek ürün vitrinde bulunamadı.' });
        }
         res.status(200).json({ message: 'Ürün sırası güncellendi.', guncellenenKayit: result.rows[0] });
    } catch (err) {
         console.error('Vitrin ürün sırası güncellenirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
}