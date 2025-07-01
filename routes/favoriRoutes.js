

express = require('express');
const router = express.Router();
const favoriController = require('../controllers/favoriController'); 

router.get('/:uyeID/favoriler', favoriController.kullaniciFavorileriniGetir); 


router.post('/:uyeID/favoriler', favoriController.favoriyeEkle); 


router.delete('/:uyeID/favoriler/:urunID', favoriController.favoridenCikar); 


module.exports = router; 