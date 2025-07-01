
const express = require('express');
const router = express.Router();
const vitrinController = require('../controllers/vitrinController');



router.get('/', vitrinController.getVitrinUrunleri);


router.post('/', vitrinController.vitrineEkle);


router.delete('/:urunID', vitrinController.vitrindenCikar);


router.put('/:urunID/sira', vitrinController.vitrinSiraGuncelle);

module.exports = router;