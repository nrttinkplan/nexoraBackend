
const express = require('express');
const router = express.Router();
const kargoController = require('../controllers/kargoController');



router.get('/', kargoController.getAllKargolar);


router.get('/:id', kargoController.getKargoById);


router.post('/', kargoController.createKargo);


router.put('/:id', kargoController.updateKargo);

router.delete('/:id', kargoController.deleteKargo);

module.exports = router;