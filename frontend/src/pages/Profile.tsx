import React, { useReducer } from 'react';
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
  geminiKey: string;
}

type ProfileAction = 
  | { type: 'SET_PREFERENCES', payload: Preference[] }
  | { type: 'SET_NEW_KEY', payload: string }
  | { type: 'SET_NEW_VALUE', payload: string }
  | { type: 'SET_GEMINI_KEY', payload: string }
  | { type: 'ADD_FIELD' }
  | { type: 'REMOVE_FIELD', payload: string }
  | { type: 'REORDER', payload: { oldIndex: number, newIndex: number } };

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    case 'SET_NEW_KEY':
      return { ...state, newKey: action.payload };
    case 'SET_NEW_VALUE':
      return { ...state, newValue: action.payload };
    case 'SET_GEMINI_KEY':
      return { ...state, geminiKey: action.payload };
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
    geminiKey: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Data Fetching
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data;
      if (data.preferences) {
        const parsed = JSON.parse(data.preferences);
        const prefs = Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([k, v]) => ({ id: k, key: k, value: v as string }));
        dispatch({ type: 'SET_PREFERENCES', payload: prefs });
      }
      if (data.gemini_api_key) {
        dispatch({ type: 'SET_GEMINI_KEY', payload: data.gemini_api_key });
      }
      return data;
    },
    enabled: !!token
  });

  // Mutations
  const saveProfileMutation = useMutation({
    mutationFn: async (prefs: Preference[]) => {
      await axios.post(`${apiUrl}/user/preferences`, prefs, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Runner profile saved!');
    },
    onError: () => toast.error('Failed to save profile')
  });

  const saveGeminiKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      await axios.post(`${apiUrl}/user/gemini-key`, { key }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Gemini API Key updated!');
    },
    onError: () => toast.error('Failed to update API Key')
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = state.preferences.findIndex((i) => i.id === active.id);
      const newIndex = state.preferences.findIndex((i) => i.id === over.id);
      dispatch({ type: 'REORDER', payload: { oldIndex, newIndex } });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading your profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-orange-500 hover:text-orange-600 mb-6 inline-block font-medium">&larr; Back to Dashboard</Link>
        <h2 className="text-3xl font-bold mb-8">Coach Settings</h2>

        {/* Gemini API Key Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">🔑</span> Gemini AI Configuration
          </h4>
          <p className="text-sm text-gray-500 mb-6">
            To enable AI Coaching features, please provide your Gemini API Key from Google AI Studio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="password"
                placeholder="Paste your Gemini API Key here"
                value={state.geminiKey}
                onChange={(e) => dispatch({ type: 'SET_GEMINI_KEY', payload: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2.5 px-4 text-sm"
              />
            </div>
            <button
              onClick={() => saveGeminiKeyMutation.mutate(state.geminiKey)}
              disabled={saveGeminiKeyMutation.isPending || !state.geminiKey}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-md font-bold hover:bg-black transition text-sm disabled:bg-gray-300"
            >
              {saveGeminiKeyMutation.isPending ? 'Saving...' : 'Update Key'}
            </button>
          </div>
          {profile?.gemini_api_key && (
            <p className="mt-3 text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="text-base">✅</span> API Key is configured and secured.
            </p>
          )}
        </div>

        {/* Runner Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-6 mb-8">
            <img src={profile?.profile_picture} alt="" className="w-20 h-20 rounded-full border-2 border-orange-100" />
            <div>
              <h3 className="text-xl font-bold">{profile?.name}</h3>
              <p className="text-gray-500">{profile?.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-8">
            <h4 className="text-lg font-bold mb-4">Runner Profile Context</h4>
            <p className="text-sm text-gray-500 mb-6">Drag and drop to reorder. The AI Coach prioritizes information from top to bottom.</p>

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
                <label htmlFor="field-name" className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Field Name</label>
                <input
                  id="field-name"
                  type="text"
                  placeholder="e.g. Goal"
                  value={state.newKey}
                  onChange={(e) => dispatch({ type: 'SET_NEW_KEY', payload: e.target.value })}
                  className="w-full border-gray-200 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2.5 px-4"
                />
              </div>
              <div className="flex-1 w-full">
                <label htmlFor="field-value" className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Value</label>
                <input
                  id="field-value"
                  type="text"
                  placeholder="e.g. Sub 4h Marathon"
                  value={state.newValue}
                  onChange={(e) => dispatch({ type: 'SET_NEW_VALUE', payload: e.target.value })}
                  className="w-full border-gray-200 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2.5 px-4"
                />
              </div>
              <div className="md:pt-5 w-full md:w-auto">
                <button onClick={() => dispatch({ type: 'ADD_FIELD' })} className="w-full md:w-auto bg-orange-600 text-white px-6 py-2.5 rounded-md font-bold hover:bg-orange-700 transition shadow-sm mt-1 md:mt-0">Add</button>
              </div>
            </div>

            <button
              onClick={() => saveProfileMutation.mutate(state.preferences)}
              disabled={saveProfileMutation.isPending}
              className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold transition disabled:bg-gray-300 shadow-lg"
            >
              {saveProfileMutation.isPending ? 'Saving...' : 'Save Runner Profile & Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
