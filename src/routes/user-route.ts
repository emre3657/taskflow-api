import express from 'express';
import { getMe, updateMe, updatePassword, deleteMe } from '../controllers/user-controller.js';

const router = express.Router();

router.route('/me').get(getMe).patch(updateMe).delete(deleteMe);
router.route('/me/password').patch(updatePassword);

export {
  router as userRouter
}
