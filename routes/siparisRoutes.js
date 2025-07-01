
const express = require('express');
const router = express.Router();
const siparisController = require('../controllers/siparisController');
const { authenticateToken } = require('../middleware/authMiddleware'); 


router.post('/', authenticateToken, siparisController.siparisOlustur);


router.get('/kullanici', authenticateToken, siparisController.uyeSiparisleriniGetir); 


router.get('/:siparisID', authenticateToken, siparisController.siparisDetayGetir);


router.put('/:siparisID/durum', siparisController.siparisDurumGuncelle);



router.get('/', siparisController.tumSiparisleriGetir);


module.exports = router;