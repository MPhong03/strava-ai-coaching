import React, { useReducer, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Types & Reducer ---
interface Preference {
  id: string;
  key: string;
  value: string;
}

interface ProfileState {
  preferences: Preference[];
  newKey: string;
  newValue: string;
  geminiKeyInput: string;
  partnerName: string;
  partnerPersona: string;
  roundRobin: boolean;
}

type ProfileAction = 
  | { type: 'SET_ALL', payload: any }
  | { type: 'SET_NEW_KEY', payload: string }
  | { type: 'SET_NEW_VALUE', payload: string }
  | { type: 'SET_GEMINI_KEY_INPUT', payload: string }
  | { type: 'SET_PARTNER_INFO', payload: { name: string, persona: string } }
  | { type: 'SET_ROUND_ROBIN', payload: boolean }
  | { type: 'ADD_FIELD' }
  | { type: 'REMOVE_FIELD', payload: string }
  | { type: 'REORDER', payload: { oldIndex: number, newIndex: number } };

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'SET_ALL':
      return { ...state, ...action.payload };
    case 'SET_NEW_KEY':
      return { ...state, newKey: action.payload };
    case 'SET_NEW_VALUE':
      return { ...state, newValue: action.payload };
    case 'SET_GEMINI_KEY_INPUT':
      return { ...state, geminiKeyInput: action.payload };
    case 'SET_PARTNER_INFO':
      return { ...state, partnerName: action.payload.name, partnerPersona: action.payload.persona };
    case 'SET_ROUND_ROBIN':
      return { ...state, roundRobin: action.payload };
    case 'ADD_FIELD':
      if (!state.newKey || !state.newValue) return state;
      const id = `${state.newKey}-${Date.now()}`;
      return {
        ...state,
        preferences: [...state.preferences, { id, key: state.newKey, value: state.newValue }],
        newKey: '',
        newValue: ''
      };
    case 'REMOVE_FIELD':
      return { ...state, preferences: state.preferences.filter(p => p.id !== action.payload) };
    case 'REORDER':
      return {
        ...state,
        preferences: arrayMove(state.preferences, action.payload.oldIndex, action.payload.newIndex)
      };
    default:
      return state;
  }
}

// --- Sortable Item Component ---
const SortableItem = (props: { id: string, label: string, value: string, onRemove: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-4 bg-white border ${isDragging ? 'border-orange-500 shadow-lg' : 'border-gray-100'} p-3 rounded-lg group transition-all`}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-gray-300 hover:text-orange-400">
        <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
          <circle cx="2" cy="2" r="2"/><circle cx="2" cy="10" r="2"/><circle cx="2" cy="18" r="2"/>
          <circle cx="10" cy="2" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="10" cy="18" r="2"/>
        </svg>
      </div>
      <div className="flex-1">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{props.label}</span>
        <p className="font-bold text-gray-800">{props.value}</p>
      </div>
      <button onClick={() => props.onRemove(props.id)} className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition">✕</button>
    </div>
  );
};

// --- Main Component ---
const Profile: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  
  const [state, dispatch] = useReducer(profileReducer, {
    preferences: [],
    newKey: '',
    newValue: '',
    geminiKeyInput: '',
    partnerName: '',
    partnerPersona: '',
    roundRobin: false
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Data Fetching
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (profileData) {
      const parsed = profileData.preferences ? JSON.parse(profileData.preferences) : [];
      const prefs = Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([k, v]) => ({ id: k, key: k, value: v as string }));
      
      dispatch({ 
        type: 'SET_ALL', 
        payload: {
          preferences: prefs,
          partnerName: profileData.partner_name || 'AI Partner',
          partnerPersona: profileData.partner_persona || '',
          roundRobin: profileData.round_robin_enabled
        } 
      });
    }
  }, [profileData]);

  // Mutations
  const saveProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      await axios.post(`${apiUrl}/user/preferences`, payload.preferences, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await axios.post(`${apiUrl}/user/profile-update`, {
        partner_name: payload.partnerName,
        partner_persona: payload.partnerPersona
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Settings saved!');
    },
    onError: () => toast.error('Failed to save settings')
  });

  const addGeminiKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      await axios.post(`${apiUrl}/user/gemini-key`, { key }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      dispatch({ type: 'SET_GEMINI_KEY_INPUT', payload: '' });
      toast.success('New API Key added!');
    },
    onError: () => toast.error('Failed to add API Key')
  });

  const deleteGeminiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${apiUrl}/user/gemini-key/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('API Key removed');
    }
  });

  const toggleRoundRobinMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await axios.post(`${apiUrl}/user/round-robin`, { enabled }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Load balancing setting updated');
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = state.preferences.findIndex((i) => i.id === active.id);
      const newIndex = state.preferences.findIndex((i) => i.id === over.id);
      dispatch({ type: 'REORDER', payload: { oldIndex, newIndex } });
    }
  };

  if (isLoading && !profileData) return <div className="p-8 text-center text-gray-400">Loading your profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 pt-[calc(1rem+var(--safe-area-inset-top))]">
      <div className="max-w-3xl mx-auto pb-20">
        <Link to="/" className="text-orange-500 hover:text-orange-600 mb-6 inline-block font-medium">&larr; Back to Dashboard</Link>
        <h2 className="text-3xl font-black mb-8">Coach Settings</h2>

        {/* --- Gemini API Management --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🔑</span> Gemini API Keys
            </h4>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Round Robin</span>
              <button 
                onClick={() => {
                  const newVal = !state.roundRobin;
                  dispatch({ type: 'SET_ROUND_ROBIN', payload: newVal });
                  toggleRoundRobinMutation.mutate(newVal);
                }}
                className={`w-10 h-5 rounded-full transition-colors relative ${state.roundRobin ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${state.roundRobin ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {profileData?.geminiApiKeys?.map((k: any) => (
              <div key={k.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${k.status === 'HEALTHY' ? 'bg-green-500' : k.status === 'RATE_LIMITED' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm font-mono text-gray-600">{k.key}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                    k.status === 'HEALTHY' ? 'border-green-200 text-green-600' : 'border-red-200 text-red-600'
                  }`}>
                    {k.status}
                  </span>
                </div>
                <button onClick={() => deleteGeminiKeyMutation.mutate(k.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
            {(!profileData?.geminiApiKeys || profileData.geminiApiKeys.length === 0) && (
              <p className="text-sm text-gray-400 italic text-center py-4">No API keys added yet.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              placeholder="Add a new Gemini API Key"
              value={state.geminiKeyInput}
              onChange={(e) => dispatch({ type: 'SET_GEMINI_KEY_INPUT', payload: e.target.value })}
              className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2.5 px-4 text-sm"
            />
            <button
              onClick={() => addGeminiKeyMutation.mutate(state.geminiKeyInput)}
              disabled={addGeminiKeyMutation.isPending || !state.geminiKeyInput}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-md font-bold hover:bg-black transition text-sm disabled:bg-gray-300"
            >
              Add Key
            </button>
          </div>
        </div>

        {/* --- AI Partner Configuration --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">🤖</span> AI Partner Persona
          </h4>
          <div className="space-y-6">
            <div>
              <label htmlFor="partner-name" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">AI Name</label>
              <input
                id="partner-name"
                type="text"
                placeholder="e.g. AI Partner"
                value={state.partnerName}
                onChange={(e) => dispatch({ type: 'SET_PARTNER_INFO', payload: { name: e.target.value, persona: state.partnerPersona } })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2.5 px-4 text-sm"
              />
            </div>
            <div>
              <label htmlFor="partner-persona" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Persona / Style</label>
              <textarea
                id="partner-persona"
                placeholder="How should the AI behave?"
                value={state.partnerPersona}
                onChange={(e) => dispatch({ type: 'SET_PARTNER_INFO', payload: { name: state.partnerName, persona: e.target.value } })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2.5 px-4 text-sm h-24"
              />
            </div>
          </div>
        </div>

        {/* --- Runner Profile Section --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-6 mb-8">
            <img src={profileData?.profile_picture} alt="" className="w-20 h-20 rounded-full border-2 border-orange-100" />
            <div>
              <h3 className="text-xl font-bold">{profileData?.name}</h3>
              <p className="text-gray-500 text-sm">{profileData?.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-8">
            <h4 className="text-lg font-bold mb-4">Runner Context</h4>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="space-y-3 mb-8">
                <SortableContext items={state.preferences.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  {state.preferences.map((pref) => (
                    <SortableItem key={pref.id} id={pref.id} label={pref.key} value={pref.value} onRemove={(id) => dispatch({ type: 'REMOVE_FIELD', payload: id })} />
                  ))}
                </SortableContext>
              </div>
            </DndContext>

            <div className="flex flex-col md:flex-row gap-4 mb-8 items-start bg-orange-50/50 p-6 rounded-xl border border-orange-100">
              <div className="flex-1 w-full">
                <label htmlFor="field-name" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Field Name</label>
                <input
                  id="field-name"
                  type="text"
                  placeholder="e.g. Goal"
                  value={state.newKey}
                  onChange={(e) => dispatch({ type: 'SET_NEW_KEY', payload: e.target.value })}
                  className="w-full border-gray-200 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2.5 px-4 text-sm"
                />
              </div>
              <div className="flex-1 w-full">
                <label htmlFor="field-value" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Value</label>
                <input
                  id="field-value"
                  type="text"
                  placeholder="e.g. Sub 4h Marathon"
                  value={state.newValue}
                  onChange={(e) => dispatch({ type: 'SET_NEW_VALUE', payload: e.target.value })}
                  className="w-full border-gray-200 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2.5 px-4 text-sm"
                />
              </div>
              <div className="md:pt-5 w-full md:w-auto">
                <button onClick={() => dispatch({ type: 'ADD_FIELD' })} className="w-full md:w-auto bg-orange-600 text-white px-6 py-2.5 rounded-md font-bold hover:bg-orange-700 transition shadow-sm mt-1 md:mt-0 text-sm">Add</button>
              </div>
            </div>

            <button
              onClick={() => saveProfileMutation.mutate(state)}
              disabled={saveProfileMutation.isPending}
              className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold transition disabled:bg-gray-300 shadow-lg"
            >
              {saveProfileMutation.isPending ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
