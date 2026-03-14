import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const Login: React.FC = () => {
  const clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
  const scope = 'activity:read_all,profile:read_all';
  
  // URL cho Web: localhost hoặc Vercel
  const webRedirectUri = process.env.REACT_APP_STRAVA_REDIRECT_URI;
  
  // URL cho Android: dùng custom scheme
  const androidRedirectUri = 'com.m_phong.aicoach://callback';

  const handleLogin = async () => {
    const isNative = Capacitor.isNativePlatform();
    const redirectUri = isNative ? androidRedirectUri : webRedirectUri;
    
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

    if (isNative) {
      // Mở trình duyệt hệ thống trên Mobile
      await Browser.open({ url: stravaAuthUrl });
    } else {
      // Chuyển hướng trình duyệt trên Web
      window.location.href = stravaAuthUrl;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl">🏃‍♂️</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 text-center">AI Coach</h2>
          <p className="text-gray-500 text-sm text-center mt-2 font-medium">
            Personalized running insights on your wrist and phone.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold py-4 px-4 rounded-xl transition duration-300 shadow-lg shadow-orange-200 active:scale-[0.98]"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Strava_Logo.svg"
            alt="Strava"
            className="w-6 h-6 mr-3 invert"
          />
          Connect with Strava
        </button>
        
        <p className="mt-8 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          Powered by Gemini 3.0 & Strava API
        </p>
      </div>
    </div>
  );
};

export default Login;
