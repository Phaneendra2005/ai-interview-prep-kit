import { Router } from 'express';
import { createKit, getKits, getKit, getKitStatus, updateKit, regenerateKit } from '../controllers/kit.controller';

const router = Router();

// Ensure all routes are protected
router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

router.post('/', createKit);
router.get('/', getKits);
router.get('/:id', getKit);
router.get('/:id/status', getKitStatus);
router.put('/:id', updateKit);
router.post('/:id/regenerate', regenerateKit);

export default router;
