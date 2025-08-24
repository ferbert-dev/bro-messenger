import express from 'express';
import * as userController from '../controllers/userController';
import chatRoutes from '../routes/chatRoutes';
import { asyncHandler } from '../utils/asyncHandler';
import { validateObjectId } from '../middleware/validateObjectId';
import {
  authenticateAdminToken,
  authenticateToken,
} from '../middleware/authMiddleware';
const router = express.Router({ mergeParams: true });

router.get('/', authenticateToken, asyncHandler(userController.getUsers));

router.get(
  //admin need
  '/me',
  authenticateToken,
  asyncHandler(userController.getMyProfile),
); // validate only the ID

router.put(
  '/me',
  authenticateToken,
  asyncHandler(userController.updateUserById),
);
router.bind;
//admin endpoints
router.delete(
  '/:id',
  authenticateAdminToken,
  validateObjectId('id'),
  asyncHandler(userController.deleteUserById),
);

router.get(
  '/:id',
  authenticateAdminToken,
  validateObjectId('id'),
  asyncHandler(userController.getUserById),
); // validate only the ID

router.use('/me/chats/', chatRoutes);

export default router;
