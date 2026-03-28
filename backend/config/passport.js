const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Spotify OAuth Strategy
passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      callbackURL: process.env.SPOTIFY_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, expires_in, profile, done) => {
      try {
        const spotifyTokenExpiry = Date.now() + expires_in * 1000;

        // If user is already logged in, attach Spotify to existing user
        if (req.user) {
          const user = await User.findById(req.user._id);
          if (user) {
            user.spotifyId = profile.id;
            user.spotifyAccessToken = accessToken;
            user.spotifyRefreshToken = refreshToken || user.spotifyRefreshToken;
            user.spotifyTokenExpiry = spotifyTokenExpiry;
            user.displayName = user.displayName || profile.displayName;
            await user.save();
            return done(null, user);
          }
        }

        // Check if a user already exists with this spotifyId
        let user = await User.findOne({ spotifyId: profile.id });
        if (user) {
          user.spotifyAccessToken = accessToken;
          user.spotifyRefreshToken = refreshToken || user.spotifyRefreshToken;
          user.spotifyTokenExpiry = spotifyTokenExpiry;
          await user.save();
          return done(null, user);
        }

        // Create new user with Spotify only (they'll need to link Google via Firebase later)
        user = await User.create({
          spotifyId: profile.id,
          displayName: profile.displayName,
          spotifyAccessToken: accessToken,
          spotifyRefreshToken: refreshToken,
          spotifyTokenExpiry: spotifyTokenExpiry,
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;