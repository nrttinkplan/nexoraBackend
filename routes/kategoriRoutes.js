
const express = require('express');
const router = express.Router();
const kategoriController = require('../controllers/kategoriController');


router.get('/', kategoriController.tumKategorileriGetir);


router.post('/', kategoriController.kategoriEkle);



module.exports = router;