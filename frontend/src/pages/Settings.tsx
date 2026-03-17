import React, { useReducer, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface SettingsState {
  geminiKeyInput: string;
  partnerName: string;
  partnerPersona: string;
  selectedModel: string;
  roundRobin: boolean;
  selectedModelForTest: Record<string, string>; // keyId -> modelName
}

type SettingsAction = 
  | { type: 'SET_ALL', payload: any }
  | { type: 'SET_GEMINI_KEY_INPUT', payload: string }
  | { type: 'SET_PARTNER_INFO', payload: { name: string, persona: string } }
  | { type: 'SET_SELECTED_MODEL', payload: string }
  | { type: 'SET_ROUND_ROBIN', payload: boolean }
  | { type: 'SET_MODEL_FOR_TEST', payload: { keyId: string, model: string } };

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_ALL': return { ...state, ...action.payload };
    case 'SET_GEMINI_KEY_INPUT': return { ...state, geminiKeyInput: action.payload };
    case 'SET_PARTNER_INFO': return { ...state, partnerName: action.payload.name, partnerPersona: action.payload.persona };
    case 'SET_SELECTED_MODEL': return { ...state, selectedModel: action.payload };
    case 'SET_ROUND_ROBIN': return { ...state, roundRobin: action.payload };
    case 'SET_MODEL_FOR_TEST': return { ...state, selectedModelForTest: { ...state.selectedModelForTest, [action.payload.keyId]: action.payload.model } };
    default: return state;
  }
}

const Settings: React.FC = () => {
  const { token, theme, setTheme } = useAuthStore();
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  
  const [state, dispatch] = useReducer(settingsReducer, {
    geminiKeyInput: '', partnerName: '', partnerPersona: '', selectedModel: 'gemini-3-flash-preview', roundRobin: false, selectedModelForTest: {}
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
          selectedModel: profileData.selected_model || 'gemini-3-flash-preview',
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

  const testGeminiKeyMutation = useMutation({
    mutationFn: async ({ id, model }: { id: string, model?: string }) => {
      const response = await axios.post(`${apiUrl}/user/test-gemini-key/${id}`, { model }, { headers: { Authorization: `Bearer ${token}` } });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      if (data.data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(`Connection failed: ${data.data.message}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
    }
  });

  const [availableModelsForKey, setAvailableModelsForKey] = React.useState<Record<string, any[]>>({});

  const viewModelsMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.get(`${apiUrl}/user/gemini-key/${id}/models`, { headers: { Authorization: `Bearer ${token}` } });
      return { id, models: response.data.data };
    },
    onSuccess: ({ id, models }) => {
      setAvailableModelsForKey(prev => ({ ...prev, [id]: models }));
      if (!state.selectedModelForTest[id] && models.length > 0) {
        dispatch({ type: 'SET_MODEL_FOR_TEST', payload: { keyId: id, model: models[0].name } });
      }
      const modelList = models.map((m: any) => `- ${m.displayName} (${m.name})`).join('\n');
      toast.success(`Fetched ${models.length} models for this key.`);
    },
    onError: (error: any) => {
      toast.error(`Failed to fetch models: ${error.message}`);
    }
  });

  const toggleRoundRobinMutation = useMutation({
    mutationFn: async (enabled: boolean) => { await axios.post(`${apiUrl}/user/round-robin`, { enabled }, { headers: { Authorization: `Bearer ${token}` } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-profile'] }); toast.success('Load balancing updated'); }
  });

  const saveAiSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      await axios.post(`${apiUrl}/user/profile-update`, {
        partner_name: payload.partnerName,
        partner_persona: payload.partnerPersona,
        selected_model: payload.selectedModel
      }, { headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-profile'] }); toast.success('AI Partner updated!'); },
    onError: () => toast.error('Failed to update AI Partner')
  });

  const [allAvailableModels, setAllAvailableModels] = React.useState<any[]>([]);
  const firstHealthyKey = profileData?.geminiApiKeys?.find((k: any) => k.status === 'HEALTHY');

  useEffect(() => {
    if (firstHealthyKey && allAvailableModels.length === 0) {
      axios.get(`${apiUrl}/user/gemini-key/${firstHealthyKey.id}/models`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setAllAvailableModels(res.data.data))
        .catch(err => console.error('Failed to fetch global models', err));
    }
  }, [firstHealthyKey, token, apiUrl, allAvailableModels.length]);

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

        {/* AI Monitoring */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">AI Monitoring</h3>
          <Link 
            to="/ai-dashboard"
            className="flex items-center justify-between bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-50 dark:border-gray-800 hover:border-orange-500 transition-all group"
          >
            <div>
              <p className="text-sm font-bold dark:text-gray-200">AI Usage Tracking</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Monitor token consumption and request history</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
          </Link>
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
              <div key={k.id} className="bg-gray-50 dark:bg-black p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 w-2 h-2 rounded-full ${k.status === 'HEALTHY' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-gray-500 truncate">{k.key}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                        {k.usage_count} requests • {k.total_tokens?.toLocaleString()} tokens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => viewModelsMutation.mutate(k.id)} 
                      disabled={viewModelsMutation.isPending}
                      className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 disabled:opacity-50"
                    >
                      {viewModelsMutation.isPending && viewModelsMutation.variables === k.id ? 'Loading...' : 'Models'}
                    </button>
                    <button 
                      onClick={() => testGeminiKeyMutation.mutate({ id: k.id, model: state.selectedModelForTest[k.id] })} 
                      disabled={testGeminiKeyMutation.isPending}
                      className="text-[9px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 disabled:opacity-50"
                    >
                      {testGeminiKeyMutation.isPending && testGeminiKeyMutation.variables?.id === k.id ? 'Testing...' : 'Test'}
                    </button>
                    <button onClick={() => deleteGeminiKeyMutation.mutate(k.id)} className="text-gray-400 hover:text-red-500 p-1">✕</button>
                  </div>
                </div>

                {availableModelsForKey[k.id] && (
                  <div className="mb-2">
                    <select
                      value={state.selectedModelForTest[k.id] || ''}
                      onChange={(e) => dispatch({ type: 'SET_MODEL_FOR_TEST', payload: { keyId: k.id, model: e.target.value } })}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-600 dark:text-gray-300 outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {availableModelsForKey[k.id].map((m: any) => (
                        <option key={m.name} value={m.name}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {k.last_error && (
                  <div className="text-[9px] text-red-500 font-medium bg-red-500/5 p-2 rounded-lg mt-2 border border-red-500/10 italic">
                    {k.last_error}
                  </div>
                )}
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

            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Global AI Model (All Keys)</label>
              <div className="relative">
                <select 
                  value={state.selectedModel} 
                  onChange={(e) => dispatch({ type: 'SET_SELECTED_MODEL', payload: e.target.value })} 
                  className="w-full bg-gray-50 dark:bg-black border-none rounded-xl focus:ring-2 focus:ring-orange-500 px-4 py-3 text-sm dark:text-white font-bold appearance-none cursor-pointer"
                >
                  {allAvailableModels.length > 0 ? (
                    allAvailableModels.map((m: any) => (
                      <option key={m.name} value={m.name}>{m.displayName}</option>
                    ))
                  ) : (
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Default)</option>
                  )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <p className="text-[8px] text-gray-400 mt-2 ml-1 uppercase font-bold tracking-tight">This model will be used across all your API keys for every task.</p>
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
