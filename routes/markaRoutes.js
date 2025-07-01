
const express = require('express');
const router = express.Router();
const markaController = require('../controllers/markaController');

router.get('/', markaController.tumMarkalariGetir);
router.post('/', markaController.markaEkle);
router.get('/:id', markaController.markaGetirById);
router.put('/:id', markaController.markaGuncelle);
router.delete('/:id', markaController.markaSil);

module.exports = router;