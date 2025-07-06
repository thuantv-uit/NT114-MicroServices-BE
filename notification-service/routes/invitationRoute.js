const express = require('express');
const router = express.Router();
const {
  authMiddleware,
  inviteToBoard,
  inviteToColumn,
  acceptInvitation,
  rejectInvitation,
  getBoardInvitations,
  getColumnInvitations,
  getAllColumnsInvited,
  getPendingBoardInvitations,
  getPendingColumnInvitations,
} = require('../controllers/invitationController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { inviteToBoardSchema, inviteToColumnSchema } = require('../utils/invitationValidation');

router.use(authMiddleware);

router.post('/board', validate(inviteToBoardSchema), inviteToBoard);
router.post('/column', validate(inviteToColumnSchema), inviteToColumn);
router.put('/accept/:invitationId', acceptInvitation);
router.put('/reject/:invitationId', rejectInvitation);
router.get('/board/:boardId/user/:userId', getBoardInvitations);
router.get('/board/user/:userId', getBoardInvitations);
router.get('/column/:columnId/user/:userId', getColumnInvitations);
router.get('/column/board/:boardId/user/:userId', getColumnInvitations);
router.get('/columns/user/:userId', getAllColumnsInvited);
router.get('/pending/board/:userId', getPendingBoardInvitations);
router.get('/pending/column/:userId', getPendingColumnInvitations);

router.use(errorHandler);

module.exports = router;