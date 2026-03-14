import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const StravaCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [status, setStatus] = useState('Completing authentication...');

  useEffect(() => {
    const code = searchParams.get('code');
    const apiUrl = process.env.REACT_APP_API_URL;
    
    // Luôn sử dụng endpoint bridge làm redirect_uri để khớp với bước gửi yêu cầu
    const redirectUri = `${apiUrl}/auth/strava/bridge`;

    if (code) {
      axios
        .post(`${apiUrl}/auth/strava/callback`, { code, redirect_uri: redirectUri })
        .then((response) => {
          const { user, token } = response.data.data;
          setToken(token);
          setUser(user);
          navigate('/');
        })
        .catch((error) => {
          console.error('Auth error:', error);
          setStatus('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
        });
    }
  }, [searchParams, navigate, setToken, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="text-center max-w-sm w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#FC4C02] mx-auto mb-6"></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{status}</h2>
        <p className="text-gray-500 text-sm">Please wait a moment while we set up your dashboard.</p>
      </div>
    </div>
  );
};

export default StravaCallback;
