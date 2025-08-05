import express from 'express';
import * as userController from '../controllers/userController';
import { asyncHandler } from '../utils/asyncHandler';
import { validateObjectId } from '../middleware/validateObjectId';
import { userSchema } from '../schemas/userSchema';
import { validateSchema } from '../middleware/validateSchema';
const router = express.Router();

router.get('/', asyncHandler(userController.getUsers));
router.post(
  '/',
  validateSchema(userSchema),
  asyncHandler(userController.createUser),
); // validate full body
router.get(
  '/:id',
  validateObjectId('id'),
  asyncHandler(userController.getUserById),
); // validate only the ID
router.put(
  '/:id',
  validateObjectId('id'),
  asyncHandler(userController.updateUserById),
);
router.delete(
  '/:id',
  validateObjectId('id'),
  asyncHandler(userController.deleteUserById),
);

export default router;
