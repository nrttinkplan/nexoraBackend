
const express = require('express');
const router = express.Router();
const adresController = require('../controllers/adresController');

router.get('/:adresID', adresController.adresGetirById); 


router.put('/:adresID', adresController.adresGuncelle); 


router.delete('/:adresID', adresController.adresSil); 

module.exports = router;