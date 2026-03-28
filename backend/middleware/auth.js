const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
};

const requireGoogle = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (!req.user.googleId) {
    return res.status(403).json({ error: 'Google account not connected. Please sign in with Google.' });
  }
  next();
};

const requireSpotify = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (!req.user.spotifyId || !req.user.spotifyAccessToken) {
    return res.status(403).json({ error: 'Spotify account not connected. Please link your Spotify account.' });
  }
  next();
};

module.exports = { requireAuth, requireGoogle, requireSpotify };