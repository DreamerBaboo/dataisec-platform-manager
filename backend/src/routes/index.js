import express from 'express';
import imagesRouter from './images';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.use('/images', authMiddleware, imagesRouter);

export default router; 



