const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email  = profile.emails[0].value;
    const avatar = profile.photos[0].value;
    const displayName = profile.displayName; // "Trần Thuận"

    // ── 1. Đã từng login Google → trả về luôn ──
    let user = await User.findOne({ googleId: profile.id });
    if (user) return done(null, user);

    // ── 2. Email đã đăng ký local → liên kết googleId ──
    user = await User.findOne({ email });
    if (user) {
      user.googleId = profile.id;
      user.authType = 'google';
      if (!user.avatar) user.avatar = avatar;
      await user.save();
      return done(null, user);
    }

    // ── 3. User mới hoàn toàn → tạo mới ──
    // Generate username từ phần đầu email (vd: "22521448@gm.uit.edu.vn" → "22521448")
    let username = email.split('@')[0];

    // Tránh trùng username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      username = `${username}_${Date.now()}`;
    }

    user = await User.create({
      googleId: profile.id,
      username,
      email,
      avatar,
      active:   true,   // Google user không cần verify OTP
      authType: 'google',
    });

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

module.exports = passport;