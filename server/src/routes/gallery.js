const router = require('express').Router();
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { uploadSingleImage } = require('../middleware/upload');
const {
  getGallery,
  getAllGallery,
  createPhoto,
  updatePhoto,
  deletePhoto,
  uploadImage,
} = require('../controllers/galleryController');

router.get('/', getGallery);
router.get('/all', auth, getAllGallery);
router.post('/upload', auth, uploadSingleImage, uploadImage);
router.post('/', auth, createPhoto);
router.put('/:id', auth, validateId, updatePhoto);
router.delete('/:id', auth, validateId, deletePhoto);

module.exports = router;
