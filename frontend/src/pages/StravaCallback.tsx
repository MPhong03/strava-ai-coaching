import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const StravaCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get('code');
    const apiUrl = process.env.REACT_APP_API_URL;

    if (code) {
      axios
        .post(`${apiUrl}/auth/strava/callback`, { code })
        .then((response) => {
          const { user, token } = response.data.data;
          setToken(token);
          setUser(user);
          navigate('/');
        })
        .catch((error) => {
          console.error('Auth error:', error);
          navigate('/login');
        });
    }
  }, [searchParams, navigate, setToken, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-xl font-semibold">Authenticating with Strava...</p>
      </div>
    </div>
  );
};

export default StravaCallback;
