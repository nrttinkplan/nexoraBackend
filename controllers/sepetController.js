const { pool } = require('../config/db');


exports.sepetiGetir = async (req, res) => {
  const uyeID = req.user.uyeid; 

    if (!uyeID) { 
        return res.status(401).json({ error: "Üye ID gereklidir ve doğrulanamadı." });
    }

    let sepet;
    try {
        const sepetResult = await pool.query('SELECT sepetID FROM Sepetler WHERE uyeID = $1', [uyeID]);
        if (sepetResult.rows.length > 0) {
            sepet = sepetResult.rows[0];
        } else {
            const yeniSepetResult = await pool.query(
                'INSERT INTO Sepetler (uyeID) VALUES ($1) RETURNING sepetID',
                [uyeID]
            );
            sepet = yeniSepetResult.rows[0];
        }

        const sepetUrunleriQuery = `
            SELECT
                su.sepetUrunID,
                su.urunID,
                su.adet,
                u.urunAdi,
                u.birimFiyat,
                u.gorselURL,
                u.stokAdedi,
                CAST((COALESCE(su.adet, 0) * COALESCE(u.birimFiyat, 0)) AS DOUBLE PRECISION) AS toplamFiyatSatir
            FROM Sepet_Urunleri su
            JOIN Urunler u ON su.urunID = u.urunID
            WHERE su.sepetID = $1
            ORDER BY su.eklenmeTarihi DESC;
        `;
        const sepetUrunleriResult = await pool.query(sepetUrunleriQuery, [sepet.sepetid]);


const genelToplam = sepetUrunleriResult.rows.reduce((sum, item) => {
    const adet = parseInt(item.adet) || 0;
    const birimFiyat = parseFloat(item.birimfiyat) || 0;
    return sum + (adet * birimFiyat);
}, 0);


res.status(200).json({
    sepetID: sepet.sepetid,
    uyeID: parseInt(uyeID),
    urunler: sepetUrunleriResult.rows.map(item => ({
        ...item,
        birimfiyat: parseFloat(item.birimfiyat) || 0,
        toplamfiyatsatir: parseFloat(item.toplamfiyatsatir) || 0
    })),
    genelToplam: genelToplam,
    geneltoplam: genelToplam 
});

    } catch (err) {
        console.error(`Sepet getirilirken hata (Üye ID: ${uyeID}):`, err.stack);
        if (err.code === '23503' && err.constraint === 'fk_uye_sepet') { 
            return res.status(404).json({ error: 'Belirtilen üye bulunamadı.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};



exports.sepeteUrunEkle = async (req, res) => {
    const uyeID = req.user.uyeid; 

    if (!uyeID) {
        return res.status(401).json({ error: "Kullanıcı kimliği doğrulanamadı." });
    }
    const { urunID, adet = 1 } = req.body; 

    if (!urunID) {
        return res.status(400).json({ error: 'urunID gereklidir.' });
    }
    if (typeof adet !== 'number' || adet <= 0) {
        return res.status(400).json({ error: 'Adet pozitif bir sayı olmalıdır.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        
        let sepetID;
        const sepetResult = await client.query('SELECT sepetID FROM Sepetler WHERE uyeID = $1', [uyeID]);
        if (sepetResult.rows.length > 0) {
            sepetID = sepetResult.rows[0].sepetid;
        } else {
            const yeniSepetResult = await client.query(
                'INSERT INTO Sepetler (uyeID) VALUES ($1) RETURNING sepetID',
                [uyeID]
            );
            sepetID = yeniSepetResult.rows[0].sepetid;
        }

       
        const urunStokResult = await client.query('SELECT stokAdedi FROM Urunler WHERE urunID = $1', [urunID]);
        if (urunStokResult.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: 'Eklenecek ürün bulunamadı.' });
        }
        const mevcutStok = urunStokResult.rows[0].stokadedi;


        
        const mevcutSepetUrunuResult = await client.query(
            'SELECT sepetUrunID, adet FROM Sepet_Urunleri WHERE sepetID = $1 AND urunID = $2',
            [sepetID, urunID]
        );

        let yeniAdetSepette = adet;
        if (mevcutSepetUrunuResult.rows.length > 0) {
           
            yeniAdetSepette = mevcutSepetUrunuResult.rows[0].adet + adet;
        }

        
        if (mevcutStok < yeniAdetSepette) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({ error: `Yetersiz stok. Ürün ID: ${urunID}. Mevcut Stok: ${mevcutStok}, İstenen Toplam: ${yeniAdetSepette}` });
        }

        let sepetUrunu;
        if (mevcutSepetUrunuResult.rows.length > 0) {
            
            const guncellenecekAdet = mevcutSepetUrunuResult.rows[0].adet + adet;
            const updateResult = await client.query(
                'UPDATE Sepet_Urunleri SET adet = $1 WHERE sepetUrunID = $2 RETURNING *',
                [guncellenecekAdet, mevcutSepetUrunuResult.rows[0].sepeturunid]
            );
            sepetUrunu = updateResult.rows[0];
        } else {
            
            const insertResult = await client.query(
                'INSERT INTO Sepet_Urunleri (sepetID, urunID, adet) VALUES ($1, $2, $3) RETURNING *',
                [sepetID, urunID, adet]
            );
            sepetUrunu = insertResult.rows[0];
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Ürün sepete eklendi/güncellendi.', eklenenUrun: sepetUrunu });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sepete ürün eklerken hata:', err.stack);
        if (err.code === '23503') { 
             return res.status(404).json({ error: 'Geçersiz üye veya ürün ID.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    } finally {
        client.release();
    }
};


exports.sepettekiUrunAdediniGuncelle = async (req, res) => {
    const uyeID = req.user.uyeid; 
    if (!uyeID) {
        return res.status(401).json({ error: "Kullanıcı kimliği doğrulanamadı." });
    }
    const { sepetUrunID } = req.params; 
    const { yeniAdet } = req.body;

    if (sepetUrunID === undefined || yeniAdet === undefined) {
        return res.status(400).json({ error: 'sepetUrunID ve yeniAdet gereklidir.' });
    }
    if (typeof yeniAdet !== 'number' || yeniAdet < 0) { 
        return res.status(400).json({ error: 'Yeni adet 0 veya pozitif bir sayı olmalıdır.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        
        const sepetUrunKontrol = await client.query(
            `SELECT su.urunID, s.sepetID
             FROM Sepet_Urunleri su
             JOIN Sepetler s ON su.sepetID = s.sepetID
             WHERE s.uyeID = $1 AND su.sepetUrunID = $2`,
            [uyeID, sepetUrunID]
        );

        if (sepetUrunKontrol.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: 'Sepetinizde böyle bir ürün bulunamadı veya size ait değil.' });
        }
        const { urunid: urunID, sepetid: sepetID } = sepetUrunKontrol.rows[0];


        
        const urunStokResult = await client.query('SELECT stokAdedi FROM Urunler WHERE urunID = $1', [urunID]);
        if (urunStokResult.rows.length === 0) { 
            await client.query('ROLLBACK'); client.release();
            return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }
        const mevcutStok = urunStokResult.rows[0].stokadedi;

        if (yeniAdet > 0 && mevcutStok < yeniAdet) {
            await client.query('ROLLBACK'); client.release();
            return res.status(400).json({ error: `Yetersiz stok. Mevcut Stok: ${mevcutStok}, İstenen Adet: ${yeniAdet}` });
        }


        
        if (yeniAdet === 0) {
            await client.query('DELETE FROM Sepet_Urunleri WHERE sepetUrunID = $1 AND sepetID = $2', [sepetUrunID, sepetID]);
            await client.query('COMMIT');
            return res.status(200).json({ message: 'Ürün sepetten kaldırıldı.' });
        } else {
            const result = await client.query(
                'UPDATE Sepet_Urunleri SET adet = $1 WHERE sepetUrunID = $2 AND sepetID = $3 RETURNING *',
                [yeniAdet, sepetUrunID, sepetID]
            );
            await client.query('COMMIT');
            return res.status(200).json({ message: 'Sepetteki ürün adedi güncellendi.', guncellenenUrun: result.rows[0] });
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sepetteki ürün adedi güncellenirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    } finally {
        client.release();
    }
};



exports.sepettenUrunKaldir = async (req, res) => {
    const uyeID = req.user.uyeid; 
    if (!uyeID) {
        return res.status(401).json({ error: "Kullanıcı kimliği doğrulanamadı." });
    }
    const { sepetUrunID } = req.params; 

    if (!sepetUrunID) { 
        return res.status(400).json({ error: 'sepetUrunID gereklidir.' });
    }

    try {
        
        const kontrolQuery = `
            DELETE FROM Sepet_Urunleri su
            USING Sepetler s
            WHERE su.sepetID = s.sepetID AND s.uyeID = $1 AND su.sepetUrunID = $2
            RETURNING su.*;
        `;
        const result = await pool.query(kontrolQuery, [uyeID, sepetUrunID]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Sepetinizde böyle bir ürün bulunamadı veya size ait değil.' });
        }
        res.status(200).json({ message: 'Ürün sepetten başarıyla kaldırıldı.', kaldirilanUrun: result.rows[0] });
    } catch (err) {
        console.error('Sepetten ürün kaldırılırken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.sepetiBosalt = async (req, res) => {
    const uyeID = req.user.uyeid; 
    if (!uyeID) {
        return res.status(401).json({ error: "Kullanıcı kimliği doğrulanamadı." });
    }
    
    try {
        const sepetResult = await pool.query('SELECT sepetID FROM Sepetler WHERE uyeID = $1', [uyeID]);
        if (sepetResult.rows.length === 0) {
            return res.status(200).json({ message: 'Kullanıcının zaten boş bir sepeti var veya sepeti yok.' });
        }
        const sepetID = sepetResult.rows[0].sepetid;

        await pool.query('DELETE FROM Sepet_Urunleri WHERE sepetID = $1', [sepetID]);
        res.status(200).json({ message: 'Sepet başarıyla boşaltıldı.' });
    } catch (err) {
        console.error('Sepet boşaltılırken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};