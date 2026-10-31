import {Router} from 'express';
import * as orders from '../controllers/orderController.js';
import {protect,verifiedEmail} from '../middleware/authMiddleware.js';
const router=Router();router.use(protect,verifiedEmail);
router.post('/',orders.createOrder);router.get('/',orders.getMyOrders);
router.post('/cancel/:id',orders.cancelOrder);router.post('/request-return/:id',orders.requestReturn);
router.get('/:id/payment-status',orders.getPaymentStatus);router.get('/:id',orders.getOrderById);
router.put('/:id/cancel',orders.cancelOrder);router.post('/:id/return',orders.requestReturn);
export default router;
