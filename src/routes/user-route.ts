import express from 'express';
import { getMe, updateMe, deleteMe } from '../controllers/user-controller.js';

const router = express.Router();

router.route('/me').get(getMe).patch(updateMe).delete(deleteMe);

export {
  router as userRouter
}
