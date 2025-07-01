const { pool } = require('../config/db');


exports.siparisOlustur = async (req, res) => {
   
    const uyeID = req.user.uyeid; 
    const { adresID, sepetUrunleri, toplamTutar } = req.body;

    if (!uyeID) {
        return res.status(401).json({ error: 'Sipariş oluşturmak için kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.' });
    }

    if (!adresID || !sepetUrunleri || sepetUrunleri.length === 0 || toplamTutar === undefined) {
        return res.status(400).json({ error: 'Eksik bilgi: adresID, sepetUrunleri ve toplamTutar gereklidir.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        
const siparisEkleQuery = `
    INSERT INTO Siparisler (uyeID, adresID, siparisTarihi, toplamTutar, siparisDurumu)
    VALUES ($1, $2, NOW(), $3, $4)
    RETURNING siparisID, siparisTarihi;
`;
       
        const siparisResult = await client.query(siparisEkleQuery, [uyeID, adresID, toplamTutar, 'Alındı']);
        const yeniSiparis = siparisResult.rows[0];
        const siparisID = yeniSiparis.siparisid;

        
        for (const urun of sepetUrunleri) {
            if (!urun.urunID || urun.adet === undefined || urun.birimFiyatAlinan === undefined) {
                throw new Error('Sepet ürünlerinde eksik bilgi var: urunID, adet, birimFiyatAlinan gereklidir.');
            }
            
            const siparisDetayEkleQuery = `
                INSERT INTO Siparis_Detaylari (siparisID, urunID, adet, birimFiyatAlinan, toplamFiyatSatir)
                VALUES ($1, $2, $3, $4, $5);
            `;
            
            const toplamFiyatSatir = urun.adet * urun.birimFiyatAlinan;
            await client.query(siparisDetayEkleQuery, [siparisID, urun.urunID, urun.adet, urun.birimFiyatAlinan, toplamFiyatSatir]);

            
            const stokGuncelleQuery = `
                UPDATE Urunler
                SET stokAdedi = stokAdedi - $1
                WHERE urunID = $2 AND stokAdedi >= $1; 
            `;
            
            const stokResult = await client.query(stokGuncelleQuery, [urun.adet, urun.urunID]);
            if (stokResult.rowCount === 0) {

                throw new Error(`Stok yetersiz: ${urun.urunID} ID'li ürün için yeterli stok bulunmamaktadır veya ürün mevcut değil.`);
            }
        }


        const sepetTemizleQuery = `DELETE FROM Sepet_Urunleri WHERE sepetID IN (SELECT sepetID FROM Sepetler WHERE uyeID = $1)`;
        await client.query(sepetTemizleQuery, [uyeID]);


        await client.query('COMMIT');
        res.status(201).json({ 
            message: 'Siparişiniz başarıyla oluşturuldu!', 
            siparis: {
                siparisID: siparisID,
                siparisTarihi: yeniSiparis.siparistarihi,
                toplamTutar: toplamTutar,
                siparisDurumu: 'Alındı' 
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sipariş oluşturulurken hata:', err.stack);
        
        if (err.message.startsWith('Stok yetersiz')) {
            return res.status(409).json({ error: err.message });
        }
        res.status(500).json({ error: 'Sunucu hatası: Sipariş oluşturulamadı.', details: err.message });
    } finally {
        client.release();
    }
};


exports.uyeSiparisleriniGetir = async (req, res) => {

    const uyeID = req.user.uyeid; 

    try {
        const result = await pool.query(
            `SELECT s.siparisID, s.siparisTarihi, s.toplamTutar, s.siparisDurumu,
                    a.adresBasligi, a.adresSatiri, a.il, a.ilce
             FROM Siparisler s
             JOIN Adresler a ON s.adresID = a.adresID
             WHERE s.uyeID = $1
             ORDER BY s.siparisTarihi DESC`,
            [uyeID]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(`Üye (ID: ${uyeID}) siparişlerini getirirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};



exports.siparisDetayGetir = async (req, res) => {
    const { siparisID } = req.params;
    const authenticatedUyeId = req.user.uyeid; 


    try {
       
        const siparisAnaBilgiQuery = `
            SELECT s.siparisID, s.uyeID, s.siparisTarihi, s.toplamTutar, s.siparisDurumu,
                   a.adresBasligi, a.adresSatiri, a.il, a.ilce, a.postaKodu
            FROM Siparisler s
            JOIN Adresler a ON s.adresID = a.adresID
            WHERE s.siparisID = $1;
        `;
        const siparisAnaBilgiResult = await pool.query(siparisAnaBilgiQuery, [siparisID]);

        if (siparisAnaBilgiResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sipariş bulunamadı.' });
        }
        const siparis = siparisAnaBilgiResult.rows[0];


        if (parseInt(siparis.uyeid) !== parseInt(authenticatedUyeId)) {
            return res.status(403).json({ error: 'Bu sipariş detayını görüntülemeye yetkiniz yok.' });
        }

        
        const siparisDetayQuery = `
            SELECT sd.siparisDetayID, sd.urunID, sd.adet, sd.birimFiyatAlinan, sd.toplamFiyatSatir,
                   u.urunAdi, u.gorselURL
            FROM Siparis_Detaylari sd
            JOIN Urunler u ON sd.urunID = u.urunID
            WHERE sd.siparisID = $1;
        `;
        const siparisDetayResult = await pool.query(siparisDetayQuery, [siparisID]);

        siparis.detaylar = siparisDetayResult.rows;

        res.status(200).json(siparis);

    } catch (err) {
        console.error(`Sipariş (ID: ${siparisID}) detayları getirilirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};



exports.siparisDurumGuncelle = async (req, res) => {
    const { siparisID } = req.params;
    const { siparisDurumu } = req.body; 

    
    const gecerliDurumlar = ['Hazırlanıyor', 'Ödeme Bekleniyor', 'Onaylandı', 'Kargoya Verildi', 'Teslim Edildi', 'İptal Edildi', 'İade Edildi'];
    if (!gecerliDurumlar.includes(siparisDurumu)) {
        return res.status(400).json({ error: 'Geçersiz sipariş durumu.' });
    }



    try {
        const result = await pool.query(
            'UPDATE Siparisler SET siparisDurumu = $1 WHERE siparisID = $2 RETURNING *',
            [siparisDurumu, siparisID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek sipariş bulunamadı.' });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Sipariş (ID: ${siparisID}) durumu güncellenirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.tumSiparisleriGetir = async (req, res) => {

    try {
        const result = await pool.query(
            `SELECT s.siparisID, s.siparisTarihi, s.toplamTutar, s.siparisDurumu,
                    u.kullaniciAdi as uyeKullaniciAdi, u.eposta as uyeEposta,
                    a.adresBasligi
             FROM Siparisler s
             JOIN Uyeler u ON s.uyeID = u.uyeID
             JOIN Adresler a ON s.adresID = a.adresID
             ORDER BY s.siparisTarihi DESC`
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Tüm siparişleri getirirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};