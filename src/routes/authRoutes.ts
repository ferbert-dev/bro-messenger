import express from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { userRegisterSchema, userLoginSchema } from '../schemas/userSchema';
import { validateSchema } from '../middleware/validateSchema';
import * as authController from '../controllers/authController';
import { authLimiter } from '../security';
const router = express.Router();

router.post(
  '/login',
  authLimiter,
  validateSchema(userLoginSchema), // validate full body
  asyncHandler(authController.loginUser),
);

router.post(
  '/register',
  validateSchema(userRegisterSchema), // validate full body
  asyncHandler(authController.registerUser),
);

export default router;
