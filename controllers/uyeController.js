
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 


exports.uyeKayit = async (req, res) => {
    const { kullaniciAdi, sifre, eposta, ad, soyad, telefonNo } = req.body;

    if (!kullaniciAdi || !sifre || !eposta) {
        return res.status(400).json({ error: 'kullaniciAdi, sifre ve eposta alanları gereklidir.' });
    }
    if (sifre.length < 6) { 
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    try {
        const existingUser = await pool.query(
            'SELECT * FROM Uyeler WHERE kullaniciAdi = $1 OR eposta = $2',
            [kullaniciAdi, eposta]
        );

        if (existingUser.rows.length > 0) {
            const takenField = existingUser.rows[0].kullaniciadi === kullaniciAdi ? 'Kullanıcı adı' : 'E-posta';
            return res.status(409).json({ error: `${takenField} zaten kullanımda.` });
        }

        const salt = await bcrypt.genSalt(10);
        const sifreHash = await bcrypt.hash(sifre, salt);

        const result = await pool.query(
            `INSERT INTO Uyeler (kullaniciAdi, sifreHash, eposta, ad, soyad, telefonNo)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING uyeID, kullaniciAdi, eposta, ad, soyad, telefonNo, kayitTarihi`,
            [kullaniciAdi, sifreHash, eposta, ad || null, soyad || null, telefonNo || null]
        );
        res.status(201).json({ message: 'Üye başarıyla kaydedildi.', uye: result.rows[0] });
    } catch (err) {
        console.error('Üye kaydı sırasında hata:', err.stack);
        if (err.code === '23505') {
            let message = 'Kullanıcı adı, e-posta veya telefon numarası zaten kullanımda.';
            if (err.constraint && err.constraint.includes('kullaniciadi')) message = 'Bu kullanıcı adı zaten alınmış.';
            else if (err.constraint && err.constraint.includes('eposta')) message = 'Bu e-posta adresi zaten kayıtlı.';
            else if (err.constraint && err.constraint.includes('telefonno')) message = 'Bu telefon numarası zaten kayıtlı.';
            return res.status(409).json({ error: message });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};




exports.uyeGiris = async (req, res) => {
    const { kullaniciAdiVeyaEposta, sifre } = req.body;

    if (!kullaniciAdiVeyaEposta || !sifre) {
        return res.status(400).json({ error: 'Kullanıcı adı/e-posta ve şifre alanları gereklidir.' });
    }

    try {
        const result = await pool.query(
            'SELECT uyeID, kullaniciAdi, eposta, sifreHash, ad, soyad FROM Uyeler WHERE kullaniciAdi = $1 OR eposta = $1',
            [kullaniciAdiVeyaEposta]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Geçersiz kullanıcı adı/e-posta veya şifre.' });
        }

        const uye = result.rows[0];
        const isMatch = await bcrypt.compare(sifre, uye.sifrehash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Geçersiz kullanıcı adı/e-posta veya şifre.' });
        }

        
        const payload = {
            uye: {
                id: uye.uyeid,
                kullaniciAdi: uye.kullaniciadi,
                
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, 
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    uye: { 
                        uyeID: uye.uyeid,
                        kullaniciAdi: uye.kullaniciadi,
                        eposta: uye.eposta,
                        ad: uye.ad,
                        soyad: uye.soyad
                    }
                });
            }
        );

    } catch (err) {
        console.error('Giriş sırasında hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};







exports.tumUyeleriGetir = async (req, res) => {
    
    try {
        const result = await pool.query('SELECT uyeID, kullaniciAdi, eposta, ad, soyad, telefonNo, kayitTarihi FROM Uyeler ORDER BY kayitTarihi DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Üyeleri getirirken hata:', err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.uyeGetirById = async (req, res) => {
    
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT uyeID, kullaniciAdi, eposta, ad, soyad, telefonNo, kayitTarihi FROM Uyeler WHERE uyeID = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Üye bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Üye (ID: ${id}) getirilirken hata:`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.uyeGuncelle = async (req, res) => {
    
    const { id } = req.params;
    const { ad, soyad, telefonNo, eposta } = req.body; 

    
    if (eposta) {
        try {
            const emailCheck = await pool.query('SELECT uyeID FROM Uyeler WHERE eposta = $1 AND uyeID != $2', [eposta, id]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Bu e-posta adresi zaten başka bir kullanıcı tarafından kullanılıyor.' });
            }
        } catch (checkErr) {
            console.error('E-posta kontrol hatası:', checkErr.stack);
            return res.status(500).json({ error: 'Sunucu hatası e-posta kontrolünde.' });
        }
    }
   
    if (telefonNo) {
         try {
            const phoneCheck = await pool.query('SELECT uyeID FROM Uyeler WHERE telefonNo = $1 AND uyeID != $2', [telefonNo, id]);
            if (phoneCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Bu telefon numarası zaten başka bir kullanıcı tarafından kullanılıyor.' });
            }
        } catch (checkErr) {
            console.error('Telefon kontrol hatası:', checkErr.stack);
            return res.status(500).json({ error: 'Sunucu hatası telefon kontrolünde.' });
        }
    }


    const fields = [];
    const values = [];
    let queryParamIndex = 1;

    if (ad !== undefined) { fields.push(`ad = $${queryParamIndex++}`); values.push(ad); }
    if (soyad !== undefined) { fields.push(`soyad = $${queryParamIndex++}`); values.push(soyad); }
    if (telefonNo !== undefined) { fields.push(`telefonNo = $${queryParamIndex++}`); values.push(telefonNo); }
    if (eposta !== undefined) { fields.push(`eposta = $${queryParamIndex++}`); values.push(eposta); }


    if (fields.length === 0) {
        return res.status(400).json({ error: 'Güncellenecek en az bir geçerli alan gönderilmelidir (ad, soyad, telefonNo, eposta).' });
    }

    values.push(id);
    const setClause = fields.join(', ');
    const queryString = `UPDATE Uyeler SET ${setClause} WHERE uyeID = $${queryParamIndex} RETURNING uyeID, kullaniciAdi, eposta, ad, soyad, telefonNo, kayitTarihi`;

    try {
        const result = await pool.query(queryString, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek üye bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Üye (ID: ${id}) güncellenirken hata:`, err.stack);
        if (err.code === '23505') { 
            let message = 'E-posta veya telefon numarası zaten kullanımda.';
            if (err.constraint && err.constraint.includes('eposta')) message = 'Bu e-posta adresi zaten kayıtlı.';
            else if (err.constraint && err.constraint.includes('telefonno')) message = 'Bu telefon numarası zaten kayıtlı.';
            return res.status(409).json({ error: message });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};


exports.uyeSil = async (req, res) => {

    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM Uyeler WHERE uyeID = $1 RETURNING uyeID, kullaniciAdi, eposta', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Silinecek üye bulunamadı.' });
        }
        res.status(200).json({ message: 'Üye başarıyla silindi.', silinenUye: result.rows[0] });
    } catch (err) {
        console.error(`Üye (ID: ${id}) silinirken hata:`, err.stack);
        if (err.code === '23503') { 
            return res.status(409).json({ error: 'Bu üye başka kayıtlarla (örn: siparişler, adresler) ilişkili olduğu için silinemez. Hesabı pasife almayı düşünebilirsiniz.' });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};









exports.getUyeProfili = async (req, res) => {
    const uyeID = req.user.uyeid; 

    try {
        const result = await pool.query(
            'SELECT uyeID, kullaniciAdi, eposta, ad, soyad, telefonNo, kayitTarihi FROM Uyeler WHERE uyeID = $1',
            [uyeID]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı profili bulunamadı.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Profil getirilirken hata (Üye ID: ${uyeID}):`, err.stack);
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};




exports.updateUyeProfili = async (req, res) => {
    const uyeID = req.user.uyeid; 
    const { ad, soyad, telefonNo, eposta } = req.body;

    if (eposta !== undefined && eposta !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) {
        return res.status(400).json({ error: 'Geçersiz e-posta formatı.' });
    }

    const fieldsToUpdate = {};
    if (ad !== undefined) fieldsToUpdate.ad = ad;
    if (soyad !== undefined) fieldsToUpdate.soyad = soyad;
    if (telefonNo !== undefined) fieldsToUpdate.telefonNo = telefonNo;
    if (eposta !== undefined) fieldsToUpdate.eposta = eposta;
    
    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ error: 'Güncellenecek en az bir geçerli alan gönderilmelidir (ad, soyad, telefonNo, eposta).' });
    }

    
    if (fieldsToUpdate.eposta) {
        try {
            const emailCheck = await pool.query('SELECT uyeID FROM Uyeler WHERE eposta = $1 AND uyeID != $2', [fieldsToUpdate.eposta, uyeID]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Bu e-posta adresi zaten başka bir kullanıcı tarafından kullanılıyor.' });
            }
        } catch (checkErr) {
            console.error('Profil güncellerken e-posta kontrol hatası:', checkErr.stack);
            return res.status(500).json({ error: 'Sunucu hatası e-posta kontrolünde.' });
        }
    }
    if (fieldsToUpdate.telefonNo && fieldsToUpdate.telefonNo !== null && fieldsToUpdate.telefonNo !== '') {
         try {
            const phoneCheck = await pool.query('SELECT uyeID FROM Uyeler WHERE telefonNo = $1 AND uyeID != $2', [fieldsToUpdate.telefonNo, uyeID]);
            if (phoneCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Bu telefon numarası zaten başka bir kullanıcı tarafından kullanılıyor.' });
            }
        } catch (checkErr) {
            console.error('Profil güncellerken telefon kontrol hatası:', checkErr.stack);
            return res.status(500).json({ error: 'Sunucu hatası telefon kontrolünde.' });
        }
    }

    const fields = [];
    const values = [];
    let queryParamIndex = 1;

    for (const key in fieldsToUpdate) {
        fields.push(`${key.toLowerCase()} = $${queryParamIndex++}`); 
        values.push(fieldsToUpdate[key] === '' ? null : fieldsToUpdate[key]); 
    }
    
    values.push(uyeID);
    const setClause = fields.join(', ');
    const queryString = `UPDATE Uyeler SET ${setClause} WHERE uyeID = $${queryParamIndex} RETURNING uyeID, kullaniciAdi, eposta, ad, soyad, telefonNo, kayitTarihi`;

    try {
        const result = await pool.query(queryString, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Güncellenecek kullanıcı profili bulunamadı.' });
        }
        const updatedUser = result.rows[0];
        res.status(200).json({ message: 'Profil başarıyla güncellendi.', uye: updatedUser });
    } catch (err) {
        console.error(`Profil güncellenirken hata (Üye ID: ${uyeID}):`, err.stack);
        if (err.code === '23505') { 
            let message = 'E-posta veya telefon numarası zaten kullanımda.';
            if (err.constraint && err.constraint.includes('eposta')) message = 'Bu e-posta adresi zaten kayıtlı.';
            else if (err.constraint && err.constraint.includes('telefonno')) message = 'Bu telefon numarası zaten kayıtlı.';
            return res.status(409).json({ error: message });
        }
        res.status(500).json({ error: 'Sunucu hatası', details: err.message });
    }
};