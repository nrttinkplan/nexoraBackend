const express = require('express');
const router = express.Router();
const sepetController = require('../controllers/sepetController');
const { authenticateToken } = require('../middleware/authMiddleware'); 


router.get('/', authenticateToken, sepetController.sepetiGetir);


router.post('/ekle', authenticateToken, sepetController.sepeteUrunEkle);


router.put('/urun/:sepetUrunID', authenticateToken, sepetController.sepettekiUrunAdediniGuncelle);


router.delete('/urun/:sepetUrunID', authenticateToken, sepetController.sepettenUrunKaldir);


router.delete('/bosalt', authenticateToken, sepetController.sepetiBosalt);

module.exports = router;