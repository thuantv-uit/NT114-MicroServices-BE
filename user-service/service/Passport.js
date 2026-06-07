const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/userModel');

// ─────────────────────────────────────────────
// GOOGLE STRATEGY
// ─────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  `${process.env.BASE_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email  = profile.emails[0].value;
    const avatar = profile.photos[0].value;

    // 1. Đã từng login Google → trả về luôn
    let user = await User.findOne({ googleId: profile.id });
    if (user) return done(null, user);

    // 2. Email đã đăng ký local → liên kết googleId
    user = await User.findOne({ email });
    if (user) {
      user.googleId = profile.id;
      user.authType = 'google';
      if (!user.avatar) user.avatar = avatar;
      await user.save();
      return done(null, user);
    }

    // 3. User mới → tạo mới
    let username = email.split('@')[0];
    const existingUsername = await User.findOne({ username });
    if (existingUsername) username = `${username}_${Date.now()}`;

    user = await User.create({
      googleId: profile.id,
      username,
      email,
      avatar,
      active:   true,
      authType: 'google',
    });

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// ─────────────────────────────────────────────
// GITHUB STRATEGY
// ─────────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  `${process.env.BASE_URL}/auth/github/callback`,
  scope:        ['user:email'] // cần scope này để lấy email
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // GitHub email đôi khi trả về null nếu user để private
    const email  = profile.emails?.[0]?.value || null;
    const avatar = profile.photos?.[0]?.value || '';
    const displayName = profile.displayName || profile.username;

    // 1. Đã từng login GitHub → trả về luôn
    let user = await User.findOne({ githubId: profile.id });
    if (user) return done(null, user);

    // 2. Email đã đăng ký local → liên kết githubId
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        user.githubId = profile.id;
        user.authType = 'github';
        if (!user.avatar) user.avatar = avatar;
        await user.save();
        return done(null, user);
      }
    }

    // 3. User mới → tạo mới
    // GitHub có sẵn username (profile.username)
    let username = profile.username;
    const existingUsername = await User.findOne({ username });
    if (existingUsername) username = `${username}_${Date.now()}`;

    user = await User.create({
      githubId: profile.id,
      username,
      email,    // có thể null nếu GitHub user để email private
      avatar,
      active:   true,
      authType: 'github',
    });

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

module.exports = passport;