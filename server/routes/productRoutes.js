import {Router} from 'express';
import * as products from '../controllers/productController.js';
import {protect,verifiedEmail} from '../middleware/authMiddleware.js';

const router=Router();
router.get('/',products.getAllProducts);
router.get('/search',products.getAllProducts);
router.get('/facets',products.getCatalogFacets);
router.get('/top',products.getTopProducts);
router.get('/featured',products.getFeaturedProducts);
router.get('/categories',products.getCategories);
router.get('/brands',products.getBrands);
router.get('/category/:category',products.getAllProducts);
router.get('/:id/related',products.getRelatedProducts);
router.get('/:id/reviews',products.getProductReviews);
router.post('/:id/reviews',protect,verifiedEmail,products.createProductReview);
router.get('/:id',products.getProduct);
export default router;
