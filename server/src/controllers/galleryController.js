const prisma = require('../db');
const { audit } = require('../utils/audit');

const CATEGORIES = ['unhas', 'sobrancelhas'];

// Público — portfólio exibido no site
exports.getGallery = async (req, res) => {
  try {
    const photos = await prisma.galleryPhoto.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { id: 'desc' }],
    });
    res.json(photos);
  } catch (e) {
    console.error('[getGallery]', e);
    res.status(500).json({ error: 'Erro ao buscar portfólio' });
  }
};

// Painel — inclui fotos ocultas
exports.getAllGallery = async (req, res) => {
  try {
    const photos = await prisma.galleryPhoto.findMany({
      orderBy: [{ position: 'asc' }, { id: 'desc' }],
    });
    res.json(photos);
  } catch (e) {
    console.error('[getAllGallery]', e);
    res.status(500).json({ error: 'Erro ao buscar portfólio' });
  }
};

exports.createPhoto = async (req, res) => {
  const { image, caption, category, position } = req.body;
  if (!image) return res.status(400).json({ error: 'Imagem é obrigatória' });
  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Categoria inválida' });
  }
  try {
    const photo = await prisma.galleryPhoto.create({
      data: {
        image,
        caption: caption || '',
        category: category || 'unhas',
        position: position != null ? parseInt(position) : 0,
      },
    });
    audit(req, 'gallery.create', { id: photo.id });
    res.status(201).json(photo);
  } catch (e) {
    console.error('[createPhoto]', e);
    res.status(500).json({ error: 'Erro ao adicionar foto' });
  }
};

exports.updatePhoto = async (req, res) => {
  const { image, caption, category, position, active } = req.body;
  if (category != null && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Categoria inválida' });
  }
  try {
    const data = {};
    if (image != null) data.image = image;
    if (caption != null) data.caption = caption;
    if (category != null) data.category = category;
    if (position != null) data.position = parseInt(position);
    if (active != null) data.active = active;

    const photo = await prisma.galleryPhoto.update({ where: { id: parseInt(req.params.id) }, data });
    audit(req, 'gallery.update', { id: photo.id });
    res.json(photo);
  } catch (e) {
    console.error('[updatePhoto]', e);
    res.status(500).json({ error: 'Erro ao atualizar foto' });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    await prisma.galleryPhoto.delete({ where: { id: parseInt(req.params.id) } });
    audit(req, 'gallery.delete', { id: parseInt(req.params.id) });
    res.status(204).send();
  } catch (e) {
    console.error('[deletePhoto]', e);
    res.status(500).json({ error: 'Erro ao excluir foto' });
  }
};

exports.uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  audit(req, 'gallery.uploadImage', { file: req.file.filename, size: req.file.size });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
};
