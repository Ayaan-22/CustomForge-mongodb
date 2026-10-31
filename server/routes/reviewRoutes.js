import {Router} from 'express';
import {protect,verifiedEmail} from '../middleware/authMiddleware.js';
import {getOwnReview,updateReview,deleteReview} from '../controllers/productController.js';
const router=Router();
router.use(protect,verifiedEmail);
router.get('/products/:productId/mine',getOwnReview);
router.patch('/:id',updateReview);
router.delete('/:id',deleteReview);
export default router;
