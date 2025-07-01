
const { pool } = require('../config/db');


exports.tumUrunleriGetir = async (req, res) => {
    try {
        const { kategoriID, search } = req.query; 
        let queryString = 'SELECT * FROM Urunler';
        const queryParams = [];
        const conditions = [];

        if (kategoriID) {
            queryParams.push(kategoriID);
            conditions.push(`kategoriID = $${queryParams.length}`);
        }

        if (search) {
            const searchTerm = search.trim();
            if (searchTerm) {
                queryParams.push(`%${searchTerm}%`); 
                conditions.push(`urunAdi ILIKE $${queryParams.length}`); 
            }
        }

        if (conditions.length > 0) {
            queryString += ' WHERE ' + conditions.join(' AND ');
        }

        queryString += ' ORDER BY eklenmeTarihi DESC';
        
        const result = await pool.query(queryString, queryParams);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Ürünleri getirirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.urunGetirById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM Urunler WHERE urunID = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Ürün (ID: ${id}) getirilirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.urunEkle = async (req, res) => {
    const {
        urunAdi,
        aciklama,
        kategoriID,
        markaID,
        teknikOzellikler, 
        gorselURL,
        stokAdedi,
        birimFiyat
    } = req.body;

    
    if (!urunAdi || stokAdedi === undefined || birimFiyat === undefined || !kategoriID || !markaID) {
        return res.status(400).json({ error: 'urunAdi, stokAdedi, birimFiyat, kategoriID ve markaID alanları gereklidir.' });
    }
    if (typeof stokAdedi !== 'number' || stokAdedi < 0) {
        return res.status(400).json({ error: 'stokAdedi geçerli bir sayı olmalı ve 0\'dan büyük veya eşit olmalıdır.' });
    }
    if (typeof birimFiyat !== 'number' || birimFiyat < 0) {
        return res.status(400).json({ error: 'birimFiyat geçerli bir sayı olmalı ve 0\'dan büyük veya eşit olmalıdır.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO Urunler (urunAdi, aciklama, kategoriID, markaID, teknikOzellikler, gorselURL, stokAdedi, birimFiyat)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [urunAdi, aciklama, kategoriID, markaID, teknikOzellikler || null, gorselURL, stokAdedi, birimFiyat]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Ürün eklerken hata:', err.stack);
        
        if (err.code === '23503') { 
            return res.status(400).json({ error: 'Geçersiz kategoriID veya markaID.' });
        }
        
        if (err.code === '23514') { 
            return res.status(400).json({ error: 'Stok adedi veya birim fiyat için geçersiz değer.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};

exports.urunGuncelle = async (req, res) => {
    const { id } = req.params;
    const updates = req.body; 

    const fields = [];
    const values = [];
    let queryParamIndex = 1;

    
    const allowedUpdates = ['urunAdi', 'aciklama', 'kategoriID', 'markaID', 'teknikOzellikler', 'gorselURL', 'stokAdedi', 'birimFiyat'];

    for (const key in updates) {
        if (allowedUpdates.includes(key)) {
            
            if ((key === 'stokAdedi' || key === 'birimFiyat') && (typeof updates[key] !== 'number' || updates[key] < 0)) {
                return res.status(400).json({ error: `${key} geçerli bir sayı olmalı ve 0'dan büyük veya eşit olmalıdır.` });
            }
            fields.push(`${key} = $${queryParamIndex++}`);
            values.push(updates[key]);
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'Güncellenecek en az bir geçerli alan gönderilmelidir.' });
    }

    values.push(id); 

    const setClause = fields.join(', ');
    const queryString = `UPDATE Urunler SET ${setClause} WHERE urunID = $${queryParamIndex} RETURNING *`;

    try {
        const result = await pool.query(queryString, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek ürün bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Ürün (ID: ${id}) güncellenirken hata:`, err.stack);
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Geçersiz kategoriID veya markaID.' });
        }
        if (err.code === '23514') {
            return res.status(400).json({ error: 'Stok adedi veya birim fiyat için geçersiz değer.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.urunSil = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM Urunler WHERE urunID = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Silinecek ürün bulunamadı.' });
        }
        res.status(200).json({ message: 'Ürün başarıyla silindi.', silinenUrun: result.rows[0] });
        
        
    } catch (err) {
        console.error(`Ürün (ID: ${id}) silinirken hata:`, err.stack);

        if (err.code === '23503') { 
            return res.status(409).json({ error: 'Bu ürün başka kayıtlarla ilişkili olduğu için silinemez (örn: siparişler, favoriler, sepetler).' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};