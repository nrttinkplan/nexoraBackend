
const express = require('express');
const router = express.Router();
const urunController = require('../controllers/urunController');



router.get('/', urunController.tumUrunleriGetir);

router.get('/:id', urunController.urunGetirById);


router.post('/', urunController.urunEkle);


router.put('/:id', urunController.urunGuncelle);


router.delete('/:id', urunController.urunSil);

module.exports = router;