
const express = require('express');
const router = express.Router();
const yorumController = require('../controllers/yorumController');





router.get('/urunler/:urunID/yorumlar', yorumController.urunYorumlariniGetir);


router.post('/urunler/:urunID/yorumlar', yorumController.yorumEkle); 


router.put('/:yorumID', yorumController.yorumGuncelle); 


router.delete('/:yorumID', yorumController.yorumSil); 


router.get('/uyeler/:uyeID/yorumlar', yorumController.kullaniciYorumlariniGetir); 


module.exports = router;