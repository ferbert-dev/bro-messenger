import express from 'express';
import * as userController from '../controllers/userController';
import { asyncHandler } from '../utils/asyncHandler';
import { validateObjectId } from '../middleware/validateObjectId';
import {
  authenticateAdminToken,
  authenticateToken,
} from '../middleware/authMiddleware';
const router = express.Router();

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

router.get(
  '/me/chats',
  authenticateToken,
  asyncHandler(userController.getMyChats),
);

router.get(
  '/me/chats/:chatId',
  authenticateToken,
  asyncHandler(userController.getChatById),
);

router.post(
  '/me/chats/:chatId/participants',
  authenticateToken,
  asyncHandler(userController.addPartticipantsToChatById),
);

router.delete(
  '/me/chats/:chatId/participants/:userId',
  authenticateToken,
  asyncHandler(userController.removeParticipantsFromChatById),
);

router.get(
  '/me/chats/:chatId',
  authenticateToken,
  asyncHandler(userController.getChatById),
);



router.post(
  '/me/chats',
  authenticateToken,
  //validateSchema(userRegisterSchema), // validate full body
  asyncHandler(userController.createChat),
);

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

export default router;
