const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// ── Bước 1: Redirect sang trang đăng nhập Google ──
router.get('/',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// ── Bước 2: Google callback sau khi user đồng ý ──
router.get('/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user;

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Redirect về React kèm token (React sẽ lưu vào localStorage)
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
  }
);

module.exports = router;