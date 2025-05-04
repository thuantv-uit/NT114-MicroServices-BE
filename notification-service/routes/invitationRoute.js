const express = require('express');
const router = express.Router();
const {
  authMiddleware,
  inviteToBoard,
  inviteToColumn,
  assignToCard,
  acceptInvitation,
  rejectInvitation,
  getBoardInvitations,
  getColumnInvitations,
  getCardInvitations,
  getAllColumnsInvited,
  getCardsInvitedInColumn,
  getPendingBoardInvitations,
  getPendingColumnInvitations,
  getPendingCardInvitations
} = require('../controllers/invitationController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { inviteToBoardSchema, inviteToColumnSchema, assignToCardSchema } = require('../utils/invitationValidation');

router.use(authMiddleware);

router.post('/board', validate(inviteToBoardSchema), inviteToBoard);
router.post('/column', validate(inviteToColumnSchema), inviteToColumn);
router.post('/card', validate(assignToCardSchema), assignToCard);
router.put('/accept/:invitationId', acceptInvitation);
router.put('/reject/:invitationId', rejectInvitation);
router.get('/board/:boardId/user/:userId', getBoardInvitations);
router.get('/board/user/:userId', getBoardInvitations);
router.get('/column/:columnId/user/:userId', getColumnInvitations);
router.get('/column/board/:boardId/user/:userId', getColumnInvitations);
router.get('/card/:cardId/user/:userId', getCardInvitations);
router.get('/card/user/:userId', getCardInvitations);
router.get('/columns/user/:userId', getAllColumnsInvited);
router.get('/cards/column/:columnId/user/:userId', getCardsInvitedInColumn);
router.get('/pending/board/:userId', getPendingBoardInvitations);
router.get('/pending/column/:userId', getPendingColumnInvitations);
router.get('/pending/card/:userId', getPendingCardInvitations);

router.use(errorHandler);

module.exports = router;