const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// ── Bước 1: Redirect sang trang đăng nhập GitHub ──
router.get('/',
  passport.authenticate('github', { scope: ['user:email'] })
);

// ── Bước 2: GitHub callback sau khi user đồng ý ──
router.get('/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user;

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Redirect về React kèm token
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
  }
);

module.exports = router;