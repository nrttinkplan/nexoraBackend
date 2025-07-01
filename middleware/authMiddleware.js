
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db'); 

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        return res.status(401).json({ error: 'Erişim yetkiniz yok (Token bulunamadı).' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        
        const userQuery = await pool.query('SELECT uyeid, kullaniciadi, eposta, ad, soyad FROM uyeler WHERE uyeid = $1', [decoded.uye.id]);
        if (userQuery.rows.length === 0) {
            return res.status(403).json({ error: 'Geçersiz kullanıcı (Token doğrulandı ama kullanıcı bulunamadı).' });
        }
        req.user = userQuery.rows[0]; 
        next();
    } catch (err) {
        console.error("Token doğrulama hatası:", err);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' });
        }
        return res.status(403).json({ error: 'Geçersiz token.' });
    }
};


const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.rol) { 
            return res.status(403).json({ error: 'Rol bilgisi bulunamadı.' });
        }
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ error: 'Bu işlemi yapmaya yetkiniz yok.' });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRole
};