
const { pool } = require('../config/db');


exports.urunYorumlariniGetir = async (req, res) => {
    const { urunID } = req.params;

    try {
        const query = `
            SELECT
                y.yorumID, y.urunID, y.uyeID, y.yorumMetni, y.puan, y.yorumTarihi,
                u.kullaniciAdi -- Yorumu yapan kullanıcının adını da alalım
            FROM Yorumlar y
            JOIN Uyeler u ON y.uyeID = u.uyeID
            WHERE y.urunID = $1
            -- ORDER BY y.onayDurumu DESC, y.yorumTarihi DESC -- Onay durumu olmadığı için sadece tarihe göre
            ORDER BY y.yorumTarihi DESC;
        `;
        const result = await pool.query(query, [urunID]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(`Ürün (ID: ${urunID}) yorumlarını getirirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.yorumEkle = async (req, res) => {
    const { urunID } = req.params; 
    
    const { uyeID, yorumMetni, puan, siparisID } = req.body; 

    if (!uyeID || !yorumMetni || puan === undefined) {
        return res.status(400).json({ error: 'uyeID, yorumMetni ve puan gereklidir.' });
    }
    if (typeof puan !== 'number' || puan < 1 || puan > 5) {
        return res.status(400).json({ error: 'Puan 1 ile 5 arasında bir sayı olmalıdır.' });
    }

  

    try {
        const query = `
            INSERT INTO Yorumlar (urunID, uyeID, yorumMetni, puan, siparisID, onayDurumu)
            VALUES ($1, $2, $3, $4, $5, $6) -- onayDurumu TRUE varsayılacak
            RETURNING *;
        `;
        
        const result = await pool.query(query, [urunID, uyeID, yorumMetni, puan, siparisID || null, true]);

       
        const yeniYorum = result.rows[0];
        const userResult = await pool.query('SELECT kullaniciAdi FROM Uyeler WHERE uyeID = $1', [yeniYorum.uyeid]);
        yeniYorum.kullaniciadi = userResult.rows[0]?.kullaniciadi || 'Bilinmeyen Kullanıcı';

        res.status(201).json(yeniYorum);
    } catch (err) {
        console.error('Yorum eklerken hata:', err.stack);
        if (err.code === '23503') { 
             return res.status(404).json({ error: 'Geçersiz ürün, üye veya sipariş ID.' });
        }
        if (err.code === '23514') { 
             return res.status(400).json({ error: 'Puan 1 ile 5 arasında olmalıdır.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.yorumGuncelle = async (req, res) => {
    const { yorumID } = req.params;
    
    const { uyeID, yorumMetni, puan } = req.body; 

    if (!uyeID || (yorumMetni === undefined && puan === undefined)) {
        return res.status(400).json({ error: 'uyeID ve güncellenecek en az bir alan (yorumMetni veya puan) gereklidir.' });
    }
    if (puan !== undefined && (typeof puan !== 'number' || puan < 1 || puan > 5)) {
        return res.status(400).json({ error: 'Puan 1 ile 5 arasında bir sayı olmalıdır.' });
    }

    try {
        
        const mevcutYorumResult = await pool.query('SELECT uyeID FROM Yorumlar WHERE yorumID = $1', [yorumID]);
        if (mevcutYorumResult.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek yorum bulunamadı.' });
        }
        if (mevcutYorumResult.rows[0].uyeid !== parseInt(uyeID)) { 
             return res.status(403).json({ error: 'Bu yorumu güncellemeye yetkiniz yok.' });
        }

        
        const fields = [];
        const values = [];
        let queryParamIndex = 1;

        if (yorumMetni !== undefined) {
            fields.push(`yorumMetni = $${queryParamIndex++}`);
            values.push(yorumMetni);
        }
        if (puan !== undefined) {
            fields.push(`puan = $${queryParamIndex++}`);
            values.push(puan);
        }

        values.push(yorumID); 
        const setClause = fields.join(', ');
        const queryString = `UPDATE Yorumlar SET ${setClause} WHERE yorumID = $${queryParamIndex} RETURNING *`;

        const result = await pool.query(queryString, values);
         
        const guncellenenYorum = result.rows[0];
        const userResult = await pool.query('SELECT kullaniciAdi FROM Uyeler WHERE uyeID = $1', [guncellenenYorum.uyeid]);
        guncellenenYorum.kullaniciadi = userResult.rows[0]?.kullaniciadi || 'Bilinmeyen Kullanıcı';

        res.status(200).json(guncellenenYorum);

    } catch (err) {
        console.error(`Yorum (ID: ${yorumID}) güncellenirken hata:`, err.stack);
         if (err.code === '23514') { 
             return res.status(400).json({ error: 'Puan 1 ile 5 arasında olmalıdır.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};



exports.yorumSil = async (req, res) => {
    const { yorumID } = req.params;
    
    const { uyeID } = req.body; 

    if (!uyeID) {
         return res.status(400).json({ error: 'Silme işlemi için kullanıcı kimliği (uyeID) gereklidir.' });
    }

    try {
        
        const result = await pool.query(
            'DELETE FROM Yorumlar WHERE yorumID = $1 AND uyeID = $2 RETURNING *',
            [yorumID, uyeID]
        );

        if (result.rowCount === 0) {

            const checkYorum = await pool.query('SELECT uyeID FROM Yorumlar WHERE yorumID = $1', [yorumID]);
            if (checkYorum.rows.length === 0) {
                return res.status(404).json({ error: 'Silinecek yorum bulunamadı.' });
            } else {
                return res.status(403).json({ error: 'Bu yorumu silmeye yetkiniz yok.' });
            }
        }

        res.status(200).json({ message: 'Yorum başarıyla silindi.', silinenYorum: result.rows[0] });
    } catch (err) {
        console.error(`Yorum (ID: ${yorumID}) silinirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.kullaniciYorumlariniGetir = async (req, res) => {

    const { uyeID } = req.params; 

    if (!uyeID) {
        return res.status(400).json({ error: 'Üye ID gereklidir.' });
    }

    try {
         const query = `
            SELECT
                y.yorumID, y.urunID, y.yorumMetni, y.puan, y.yorumTarihi,
                u.urunAdi -- Yorum yapılan ürünün adını da alalım
            FROM Yorumlar y
            JOIN Urunler u ON y.urunID = u.urunID
            WHERE y.uyeID = $1
            ORDER BY y.yorumTarihi DESC;
        `;
         const result = await pool.query(query, [uyeID]);
         res.status(200).json(result.rows);
    } catch (err) {
        console.error(`Kullanıcı (ID: ${uyeID}) yorumlarını getirirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};