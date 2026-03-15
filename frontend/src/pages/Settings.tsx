import React, { useReducer, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface SettingsState {
  geminiKeyInput: string;
  partnerName: string;
  partnerPersona: string;
  roundRobin: boolean;
}

type SettingsAction = 
  | { type: 'SET_ALL', payload: any }
  | { type: 'SET_GEMINI_KEY_INPUT', payload: string }
  | { type: 'SET_PARTNER_INFO', payload: { name: string, persona: string } }
  | { type: 'SET_ROUND_ROBIN', payload: boolean };

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_ALL': return { ...state, ...action.payload };
    case 'SET_GEMINI_KEY_INPUT': return { ...state, geminiKeyInput: action.payload };
    case 'SET_PARTNER_INFO': return { ...state, partnerName: action.payload.name, partnerPersona: action.payload.persona };
    case 'SET_ROUND_ROBIN': return { ...state, roundRobin: action.payload };
    default: return state;
  }
}

const Settings: React.FC = () => {
  const { token, theme, setTheme } = useAuthStore();
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  
  const [state, dispatch] = useReducer(settingsReducer, {
    geminiKeyInput: '', partnerName: '', partnerPersona: '', roundRobin: false
  });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
      return response.data.data;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (profileData) {
      dispatch({ 
        type: 'SET_ALL', 
        payload: {
          partnerName: profileData.partner_name || 'AI Partner',
          partnerPersona: profileData.partner_persona || '',
          roundRobin: profileData.round_robin_enabled
        } 
      });
    }
  }, [profileData]);

  const addGeminiKeyMutation = useMutation({
    mutationFn: async (key: string) => { await axios.post(`${apiUrl}/user/gemini-key`, { key }, { headers: { Authorization: `Bearer ${token}` } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-profile'] }); dispatch({ type: 'SET_GEMINI_KEY_INPUT', payload: '' }); toast.success('API Key added!'); },
    onError: () => toast.error('Failed to add API Key')
  });

  const deleteGeminiKeyMutation = useMutation({
    mutationFn: async (id: string) => { await axios.delete(`${apiUrl}/user/gemini-key/${id}`, { headers: { Authorization: `Bearer ${token}` } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-profile'] }); toast.success('API Key removed'); }
  });

  const toggleRoundRobinMutation = useMutation({
    mutationFn: async (enabled: boolean) => { await axios.post(`${apiUrl}/user/round-robin`, { enabled }, { headers: { Authorization: `Bearer ${token}` } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-profile'] }); toast.success('Load balancing updated'); }
  });

  const saveAiSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      await axios.post(`${apiUrl}/user/profile-update`, {
        partner_name: payload.partnerName,
        partner_persona: payload.partnerPersona
      }, { headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-profile'] }); toast.success('AI Partner updated!'); },
    onError: () => toast.error('Failed to update AI Partner')
  });

  if (isLoading && !profileData) return <div className="p-8 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading Settings...</div>;

  return (
    <div className="py-6 sm:py-10 px-4 sm:px-8 max-w-4xl mx-auto pb-32 lg:pb-10">
      <h2 className="text-3xl sm:text-4xl font-black mb-10 tracking-tighter uppercase italic dark:text-white">Settings</h2>

      <div className="space-y-8">
        {/* App Appearance */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">App Appearance</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`py-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest
                  ${theme === t 
                    ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20' 
                    : 'border-gray-50 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-gray-200'}
                `}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* AI Partner (Gemini) */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">AI Partner (Gemini)</h3>
          
          <div className="flex justify-between items-center mb-6 bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-50 dark:border-gray-800">
            <div>
              <p className="text-sm font-bold dark:text-gray-200">Load Balancing</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Round-robin between healthy keys</p>
            </div>
            <button 
              onClick={() => { const newVal = !state.roundRobin; dispatch({ type: 'SET_ROUND_ROBIN', payload: newVal }); toggleRoundRobinMutation.mutate(newVal); }}
              className={`w-12 h-6 rounded-full transition-colors relative ${state.roundRobin ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.roundRobin ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
          
          <div className="space-y-2 mb-6">
            {profileData?.geminiApiKeys?.map((k: any) => (
              <div key={k.id} className="flex items-center justify-between bg-gray-50 dark:bg-black p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 w-2 h-2 rounded-full ${k.status === 'HEALTHY' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-[10px] font-mono text-gray-500 truncate">••••••••{k.key.slice(-4)}</span>
                </div>
                <button onClick={() => deleteGeminiKeyMutation.mutate(k.id)} className="text-gray-400 hover:text-red-500 p-1">✕</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-10">
            <input
              type="password" placeholder="Add Gemini API Key..." value={state.geminiKeyInput}
              onChange={(e) => dispatch({ type: 'SET_GEMINI_KEY_INPUT', payload: e.target.value })}
              className="flex-1 bg-gray-50 dark:bg-black border-none rounded-xl focus:ring-2 focus:ring-orange-500 px-4 py-3 text-sm dark:text-white"
            />
            <button
              onClick={() => addGeminiKeyMutation.mutate(state.geminiKeyInput)}
              disabled={!state.geminiKeyInput || addGeminiKeyMutation.isPending}
              className="bg-gray-900 dark:bg-orange-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all"
            >Add</button>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-800">
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">AI Name</label>
              <input type="text" value={state.partnerName} onChange={(e) => dispatch({ type: 'SET_PARTNER_INFO', payload: { name: e.target.value, persona: state.partnerPersona } })} className="w-full bg-gray-50 dark:bg-black border-none rounded-xl focus:ring-2 focus:ring-orange-500 px-4 py-3 text-sm dark:text-white font-bold" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">AI Persona / Voice Style</label>
              <textarea value={state.partnerPersona} onChange={(e) => dispatch({ type: 'SET_PARTNER_INFO', payload: { name: state.partnerName, persona: e.target.value } })} className="w-full bg-gray-50 dark:bg-black border-none rounded-xl focus:ring-2 focus:ring-orange-500 px-4 py-3 text-sm dark:text-white h-28 font-medium leading-relaxed" />
            </div>
            <button
              onClick={() => saveAiSettingsMutation.mutate(state)}
              disabled={saveAiSettingsMutation.isPending}
              className="w-full bg-gray-900 dark:bg-orange-600 hover:scale-[1.02] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl"
            >
              Update AI Partner
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
