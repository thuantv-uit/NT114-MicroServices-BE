const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  authMiddleware,
  allUserGetBoard
} = require('../controllers/boardController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { createBoardSchema, updateBoardSchema } = require('../validation/boardValidation');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(authMiddleware);

router.post('/', validate(createBoardSchema), createBoard);
router.get('/list', getBoards);
router.get('/:id', getBoardById);
router.get('/all/:id', allUserGetBoard);
router.put('/:id', validate(updateBoardSchema), upload.single('backgroundImage'), updateBoard);
router.delete('/:id', deleteBoard);

router.use(errorHandler);

module.exports = router;