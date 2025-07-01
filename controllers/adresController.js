
const { pool } = require('../config/db');


exports.uyeAdresleriniGetir = async (req, res) => {
    const { uyeID } = req.params;
    try {
        const result = await pool.query('SELECT * FROM Adresler WHERE uyeID = $1 ORDER BY adresBasligi ASC', [uyeID]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(`Üye (ID: ${uyeID}) adreslerini getirirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.adresEkle = async (req, res) => {
    const { uyeID } = req.params;
    const { adresBasligi, adresSatiri, il, ilce, postaKodu } = req.body; 

    if (!adresBasligi || !adresSatiri) {
        return res.status(400).json({ error: 'adresBasligi ve adresSatiri alanları gereklidir.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO Adresler (uyeID, adresBasligi, adresSatiri, il, ilce, postaKodu)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, 
            [uyeID, adresBasligi, adresSatiri, il || null, ilce || null, postaKodu || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Adres eklerken hata:', err.stack);
        if (err.code === '23503') {
             return res.status(404).json({ error: 'Adres eklenmek istenen üye bulunamadı.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.adresGetirById = async (req, res) => {
    const { adresID } = req.params;
    try {
        const result = await pool.query('SELECT * FROM Adresler WHERE adresID = $1', [adresID]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Adres bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Adres (ID: ${adresID}) getirilirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};



exports.adresGuncelle = async (req, res) => {
    const { adresID } = req.params;
    const updates = req.body;

    try {
        const existingAdres = await pool.query('SELECT uyeID FROM Adresler WHERE adresID = $1', [adresID]);
        if (existingAdres.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek adres bulunamadı.' });
        }

        const fields = [];
        const values = [];
        let queryParamIndex = 1;
       
        const allowedUpdates = ['adresBasligi', 'adresSatiri', 'il', 'ilce', 'postaKodu']; 

        for (const key in updates) {
            if (allowedUpdates.includes(key) && updates[key] !== undefined) { 
                fields.push(`${key} = $${queryParamIndex++}`);
                values.push(updates[key]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'Güncellenecek en az bir geçerli alan gönderilmelidir.' });
        }

        values.push(adresID);
        const setClause = fields.join(', ');
        const queryString = `UPDATE Adresler SET ${setClause} WHERE adresID = $${queryParamIndex} RETURNING *`;

        const result = await pool.query(queryString, values);
        res.status(200).json(result.rows[0]);

    } catch (err) {
        console.error(`Adres (ID: ${adresID}) güncellenirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.updateProfilAdresi = async (req, res) => {
    const uyeID = req.user.uyeid;
    const { adresID } = req.params;
    const { adresBasligi, adresSatiri, il, ilce, postaKodu } = req.body; 

    if (!adresBasligi || !adresSatiri || !il || !ilce) {
        return res.status(400).json({ error: 'adresBasligi, adresSatiri, il ve ilce alanları gereklidir.' });
    }

    try {
        const checkAdres = await pool.query('SELECT uyeID FROM Adresler WHERE adresID = $1', [adresID]);
        if (checkAdres.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek adres bulunamadı.' });
        }
        if (checkAdres.rows[0].uyeid !== uyeID) {
            return res.status(403).json({ error: 'Bu adresi güncellemeye yetkiniz yok.' });
        }

        const result = await pool.query(
            `UPDATE Adresler 
             SET adresBasligi = $1, adresSatiri = $2, il = $3, ilce = $4, postaKodu = $5 
             WHERE adresID = $6 AND uyeID = $7 RETURNING *`, 
            [adresBasligi, adresSatiri, il, ilce, postaKodu || null, adresID, uyeID]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Adres güncellenemedi veya bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Kullanıcı (ID: ${uyeID}) için profil adresi (ID: ${adresID}) güncellenirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.adresSil = async (req, res) => {
    const { adresID } = req.params;
    try {
        const existingAdres = await pool.query('SELECT uyeID FROM Adresler WHERE adresID = $1', [adresID]);
        if (existingAdres.rows.length === 0) {
            return res.status(404).json({ error: 'Silinecek adres bulunamadı.' });
        }
        const result = await pool.query('DELETE FROM Adresler WHERE adresID = $1 RETURNING *', [adresID]);
        res.status(200).json({ message: 'Adres başarıyla silindi.', silinenAdres: result.rows[0] });
    } catch (err) {
        console.error(`Adres (ID: ${adresID}) silinirken hata:`, err.stack);
        if (err.code === '23503') {
            return res.status(409).json({ error: 'Bu adres aktif bir siparişle ilişkili olduğu için silinemez.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.getProfilAdresleri = async (req, res) => {
    const uyeID = req.user.uyeid;
    try {
        const result = await pool.query(
            'SELECT * FROM Adresler WHERE uyeID = $1 ORDER BY adresBasligi ASC, adresID ASC',
            [uyeID]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(`Kullanıcı (ID: ${uyeID}) adreslerini profil için getirirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.addProfilAdresi = async (req, res) => {
    const uyeID = req.user.uyeid;
    const { adresBasligi, adresSatiri, il, ilce, postaKodu } = req.body; 

    if (!adresBasligi || !adresSatiri || !il || !ilce ) {
        return res.status(400).json({ error: 'adresBasligi, adresSatiri, il ve ilce alanları gereklidir.' });
    }


    try {
        const result = await pool.query(
            `INSERT INTO Adresler (uyeID, adresBasligi, adresSatiri, il, ilce, postaKodu)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, 
            [uyeID, adresBasligi, adresSatiri, il, ilce, postaKodu || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(`Kullanıcı (ID: ${uyeID}) için profil adresi eklerken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.deleteProfilAdresi = async (req, res) => {
    const uyeID = req.user.uyeid;
    const { adresID } = req.params;

    try {
        const checkAdres = await pool.query('SELECT uyeID FROM Adresler WHERE adresID = $1', [adresID]);
        if (checkAdres.rows.length === 0) {
            return res.status(404).json({ error: 'Silinecek adres bulunamadı.' });
        }
        if (checkAdres.rows[0].uyeid !== uyeID) {
            return res.status(403).json({ error: 'Bu adresi silmeye yetkiniz yok.' });
        }

        const siparisKontrol = await pool.query('SELECT 1 FROM Siparisler WHERE adresID = $1 LIMIT 1', [adresID]);
        if (siparisKontrol.rows.length > 0) {
            return res.status(409).json({ error: 'Bu adres aktif bir siparişle ilişkili olduğu için silinemez. Adresi pasife almayı veya düzenlemeyi düşünebilirsiniz.' });
        }

        const result = await pool.query(
            'DELETE FROM Adresler WHERE adresID = $1 AND uyeID = $2 RETURNING *',
            [adresID, uyeID]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Adres silinemedi veya bulunamadı.' });
        }
        res.status(200).json({ message: 'Adres başarıyla silindi.', silinenAdres: result.rows[0] });
    } catch (err) {
        console.error(`Kullanıcı (ID: ${uyeID}) için profil adresi (ID: ${adresID}) silinirken hata:`, err.stack);
         if (err.code === '23503') {
            return res.status(409).json({ error: 'Bu adres aktif bir siparişle ilişkili olduğu için silinemez.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};