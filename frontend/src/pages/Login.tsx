import React from 'react';

const Login: React.FC = () => {
  const clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_STRAVA_REDIRECT_URI;
  const scope = 'activity:read_all,profile:read_all';

  const handleLogin = () => {
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = stravaAuthUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center mb-6">AI Coach Dashboard</h2>
        <p className="text-gray-600 text-center mb-8">
          Connect your Strava account to get personalized AI coaching insights.
        </p>
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-md transition duration-300"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Strava_Logo.svg"
            alt="Strava"
            className="w-6 h-6 mr-2 invert"
          />
          Connect with Strava
        </button>
      </div>
    </div>
  );
};

export default Login;
