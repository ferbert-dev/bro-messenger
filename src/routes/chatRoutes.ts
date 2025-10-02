import express from 'express';
import * as chatController from '../controllers/chatController';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('', authenticateToken, asyncHandler(chatController.getAllChats));

router.get(
  '/:chatId/messages',
  authenticateToken,
  asyncHandler(chatController.getChatMessagesById),
);

router.get(
  '/:chatId/avatar',
  authenticateToken,
  asyncHandler(chatController.getChatAvatar),
);

router.post(
  '/:chatId/avatar',
  authenticateToken,
  asyncHandler(chatController.uploadChatAvatar),
);

router.get(
  '/:chatId',
  authenticateToken,
  asyncHandler(chatController.getChatById),
);
router.post(
  '/:chatId/members',
  authenticateToken,
  asyncHandler(chatController.addMemberByIdToTheChat),
);

router.delete(
  '/:chatId/members/:userId',
  authenticateToken,
  asyncHandler(chatController.removeMemberByIdFromTheChat),
);

router.post(
  '',
  authenticateToken,
  //validateSchema(userRegisterSchema), // validate full body
  asyncHandler(chatController.createChat),
);

export default router;
