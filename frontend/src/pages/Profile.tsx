import React, { useReducer, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Preference {
  id: string;
  key: string;
  value: string;
}

interface ProfileState {
  preferences: Preference[];
  newKey: string;
  newValue: string;
}

type ProfileAction = 
  | { type: 'SET_ALL', payload: any }
  | { type: 'SET_NEW_KEY', payload: string }
  | { type: 'SET_NEW_VALUE', payload: string }
  | { type: 'ADD_FIELD' }
  | { type: 'REMOVE_FIELD', payload: string }
  | { type: 'REORDER', payload: { oldIndex: number, newIndex: number } };

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'SET_ALL': return { ...state, ...action.payload };
    case 'SET_NEW_KEY': return { ...state, newKey: action.payload };
    case 'SET_NEW_VALUE': return { ...state, newValue: action.payload };
    case 'ADD_FIELD':
      if (!state.newKey || !state.newValue) return state;
      return {
        ...state,
        preferences: [...state.preferences, { id: `${state.newKey}-${Date.now()}`, key: state.newKey, value: state.newValue }],
        newKey: '', newValue: ''
      };
    case 'REMOVE_FIELD': return { ...state, preferences: state.preferences.filter(p => p.id !== action.payload) };
    case 'REORDER': return { ...state, preferences: arrayMove(state.preferences, action.payload.oldIndex, action.payload.newIndex) };
    default: return state;
  }
}

const SortableItem = (props: { id: string, label: string, value: string, onRemove: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-4 bg-white dark:bg-gray-800 border ${isDragging ? 'border-orange-500 shadow-lg' : 'border-gray-100 dark:border-gray-700'} p-4 rounded-2xl group transition-all mb-3`}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-gray-300 dark:text-gray-600 hover:text-orange-400">
        <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor"><circle cx="2" cy="2" r="2"/><circle cx="2" cy="10" r="2"/><circle cx="2" cy="18" r="2"/><circle cx="10" cy="2" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="10" cy="18" r="2"/></svg>
      </div>
      <div className="flex-1">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{props.label}</span>
        <p className="font-bold text-gray-800 dark:text-gray-200">{props.value}</p>
      </div>
      <button onClick={() => props.onRemove(props.id)} className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition">✕</button>
    </div>
  );
};

const Profile: React.FC = () => {
  const { token, logout } = useAuthStore();
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  
  const [state, dispatch] = useReducer(profileReducer, {
    preferences: [], newKey: '', newValue: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      const parsed = profileData.preferences ? JSON.parse(profileData.preferences) : [];
      const prefs = Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([k, v]) => ({ id: k, key: k, value: v as string }));
      dispatch({ type: 'SET_ALL', payload: { preferences: prefs } });
    }
  }, [profileData]);

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: Preference[]) => {
      await axios.post(`${apiUrl}/user/preferences`, prefs, { headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-profile'] }); toast.success('Preferences saved!'); },
    onError: () => toast.error('Failed to save preferences')
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = state.preferences.findIndex((i) => i.id === active.id);
      const newIndex = state.preferences.findIndex((i) => i.id === over.id);
      dispatch({ type: 'REORDER', payload: { oldIndex, newIndex } });
    }
  };

  if (isLoading && !profileData) return <div className="p-8 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading Profile...</div>;

  return (
    <div className="py-6 sm:py-10 px-4 sm:px-8 max-w-4xl mx-auto pb-32 lg:pb-10">
      <h2 className="text-3xl sm:text-4xl font-black mb-10 tracking-tighter uppercase italic dark:text-white">Runner Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Runner Account */}
        <div className="md:col-span-5">
          <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 text-center sticky top-10">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Account Details</h3>
            <img src={profileData?.profile_picture} alt="" className="w-32 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover mx-auto border-4 border-orange-50 dark:border-orange-900/20 shadow-2xl mb-6" />
            <h4 className="text-2xl font-black dark:text-white mb-1 tracking-tight uppercase italic">{profileData?.name}</h4>
            <p className="text-sm text-gray-500 mb-6 font-medium">{profileData?.email}</p>
            
            <div className="bg-green-50 dark:bg-green-900/10 py-2 px-4 rounded-xl border border-green-100 dark:border-green-900/20 inline-flex items-center gap-2 mb-10">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Strava Connected</span>
            </div>

            <button onClick={logout} className="w-full py-4 rounded-2xl border-2 border-red-50 dark:border-red-900/10 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              Sign Out from Pacely
            </button>
          </section>
        </div>

        {/* Additional Information */}
        <div className="md:col-span-7 space-y-8">
          <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Additional Information</h3>
            <p className="text-xs text-gray-500 mb-8 font-medium leading-relaxed">
              Tell Pacely more about your goals, current injuries, or fitness level. This data is used to provide higher quality AI coaching insights.
            </p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={state.preferences.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {state.preferences.map((pref) => (
                  <SortableItem key={pref.id} id={pref.id} label={pref.key} value={pref.value} onRemove={(id) => dispatch({ type: 'REMOVE_FIELD', payload: id })} />
                ))}
              </SortableContext>
            </DndContext>

            <div className="mt-8 bg-orange-50/50 dark:bg-orange-900/10 p-6 rounded-3xl border border-orange-100 dark:border-orange-900/20">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Field Name</label>
                  <input type="text" placeholder="e.g. Marathon Goal" value={state.newKey} onChange={(e) => dispatch({ type: 'SET_NEW_KEY', payload: e.target.value })} className="w-full bg-white dark:bg-black border-none rounded-xl px-4 py-3 text-sm dark:text-white font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Value</label>
                  <input type="text" placeholder="e.g. Sub 4 Hours" value={state.newValue} onChange={(e) => dispatch({ type: 'SET_NEW_VALUE', payload: e.target.value })} className="w-full bg-white dark:bg-black border-none rounded-xl px-4 py-3 text-sm dark:text-white font-bold" />
                </div>
              </div>
              <button onClick={() => dispatch({ type: 'ADD_FIELD' })} className="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Add to Context</button>
            </div>

            <button
              onClick={() => savePreferencesMutation.mutate(state.preferences)}
              disabled={savePreferencesMutation.isPending}
              className="w-full mt-10 bg-gray-900 dark:bg-orange-600 hover:scale-[1.02] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl"
            >
              {savePreferencesMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
