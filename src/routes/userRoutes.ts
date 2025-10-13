import express from 'express';
import * as userController from '../controllers/userController';
import { getAllChatsForUserById } from '../controllers/chatController';
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

router.post(
  '/me/avatar',
  authenticateToken,
  asyncHandler(userController.uploadMyAvatar),
);

router.get(
  '/me/avatar',
  authenticateToken,
  asyncHandler(userController.getMyAvatar),
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

router.get(
  'me/chats/',
  authenticateToken,
  asyncHandler(getAllChatsForUserById),
);

export default router;
