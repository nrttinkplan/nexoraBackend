const express = require('express');
const router = express.Router();
const uyeController = require('../controllers/uyeController');
const adresController = require('../controllers/adresController'); 
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware'); 


router.post('/kayit', uyeController.uyeKayit); 
router.post('/giris', uyeController.uyeGiris); 


router.get('/profil', authenticateToken, uyeController.getUyeProfili);
router.put('/profil', authenticateToken, uyeController.updateUyeProfili);


router.get('/profil/adresler', authenticateToken, adresController.getProfilAdresleri);
router.post('/profil/adresler', authenticateToken, adresController.addProfilAdresi);
router.put('/profil/adresler/:adresID', authenticateToken, adresController.updateProfilAdresi);
router.delete('/profil/adresler/:adresID', authenticateToken, adresController.deleteProfilAdresi);




router.get('/', uyeController.tumUyeleriGetir); 


router.get('/:id', uyeController.uyeGetirById); 
router.put('/:id', uyeController.uyeGuncelle); 


router.delete('/:id', uyeController.uyeSil); 

module.exports = router;