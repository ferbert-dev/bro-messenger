import express from 'express';
import * as chatController from '../controllers/chatController';
import { asyncHandler } from '../utils/asyncHandler';
import {
  authenticateToken,
} from '../middleware/authMiddleware';

const router = express.Router();

router.get(
  '',
  authenticateToken,
  asyncHandler(chatController.getAllChatsForUserById),
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
