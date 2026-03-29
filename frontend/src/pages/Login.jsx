import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import api from '../api';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      const credential = result._tokenResponse;
      const accessToken = credential?.oauthAccessToken;

      await api.post('/auth/firebase', {
        idToken,
        accessToken,
      });

      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Firebase auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <header className="text-center mb-8">
          <div className="text-5xl sm:text-6xl mb-4" role="img" aria-label="Music note">🎵</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Playlist<span className="text-spotify-green">Bridge</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            Migrate your Spotify playlists — seamlessly
          </p>
        </header>

        {/* Features Card */}
        <section className="bg-gray-800 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">Features</h2>
          <ul className="space-y-3 sm:space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-spotify-green text-lg sm:text-xl mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
              <div>
                <p className="text-white font-medium text-sm sm:text-base">Free YouTube search</p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Uses cached results — no API quota wasted on searching
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-spotify-green text-lg sm:text-xl mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
              <div>
                <p className="text-white font-medium text-sm sm:text-base">Real-time progress</p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Track every song as it migrates from Spotify to YouTube
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-spotify-green text-lg sm:text-xl mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
              <div>
                <p className="text-white font-medium text-sm sm:text-base">Export anytime</p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Download playlist data as JSON or CSV — keep control of your music
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-spotify-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-3 text-base sm:text-lg"
          aria-label={loading ? 'Signing in with Google' : 'Sign in with Google'}
        >
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p className="text-gray-500 text-xs sm:text-sm mt-4 text-center">
          Google login also grants YouTube access for playlist creation
        </p>
      </div>
    </main>
  );
}