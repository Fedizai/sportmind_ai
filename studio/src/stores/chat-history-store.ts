
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WorkoutPlanOutput, ExerciseFeedbackOutput } from '@/ai/schemas';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  workoutPlan?: WorkoutPlanOutput;
  formFeedback?: ExerciseFeedbackOutput;
}

export interface SavedChat {
    id: string;
    timestamp: string;
    messages: ChatMessage[];
}

interface ChatHistoryState {
  history: { [key: string]: ChatMessage[] };
  savedHistories: { [key: string]: SavedChat[] };
  favorites: { [key: string]: SavedChat[] };
  isHydrated: boolean;
  
  addMessage: (chatId: string, message: ChatMessage) => void;
  startNewChat: (chatId: string, initialMessage: ChatMessage) => void;
  loadChat: (chatId: string, messages: ChatMessage[]) => void;
  
  addFavorite: (chatId: string, messages: ChatMessage[]) => void;
  toggleFavorite: (chatId: string, conversation: SavedChat) => void;
  removeSavedHistory: (chatId: string, conversationId: string) => void;
  removeFavorite: (chatId: string, conversationId: string) => void;

  _setIsHydrated: (isHydrated: boolean) => void;
}

export const useChatHistoryStore = create<ChatHistoryState>()(
  persist(
    (set, get) => ({
      history: {},
      savedHistories: {},
      favorites: {},
      isHydrated: false,

      addMessage: (chatId, message) => {
        const currentHistory = get().history[chatId] || [];
        set({
          history: {
            ...get().history,
            [chatId]: [...currentHistory, message],
          },
        });
      },

      startNewChat: (chatId, initialMessage) => {
        const currentHistory = get().history[chatId];
        // If there's a conversation with more than the initial AI message, save it.
        if (currentHistory && currentHistory.length > 1) {
            const newSavedChat: SavedChat = {
                id: `chat_${Date.now()}`,
                timestamp: new Date().toISOString(),
                messages: currentHistory
            };
            const currentSaved = get().savedHistories[chatId] || [];
            set(state => ({
                savedHistories: {
                    ...state.savedHistories,
                    [chatId]: [newSavedChat, ...currentSaved]
                }
            }));
        }
        // Reset the current chat history to the initial message
        set(state => ({
            history: {
                ...state.history,
                [chatId]: [initialMessage]
            }
        }));
      },
      
      loadChat: (chatId, messages) => {
        set(state => ({
            history: {
                ...state.history,
                [chatId]: messages
            }
        }));
      },
      
      addFavorite: (chatId, messages) => {
          const newFavorite: SavedChat = {
            id: `chat_${Date.now()}`,
            timestamp: new Date().toISOString(),
            messages: messages,
          };
          const currentFavorites = get().favorites[chatId] || [];
          
          // Check if a conversation with the exact same messages already exists in favorites
          const isAlreadyFavorited = currentFavorites.some(
              (fav) => JSON.stringify(fav.messages) === JSON.stringify(messages)
          );

          if (!isAlreadyFavorited) {
              set((state) => ({
                  favorites: {
                      ...state.favorites,
                      [chatId]: [newFavorite, ...currentFavorites],
                  },
              }));
          }
      },

      toggleFavorite: (chatId: string, conversation: SavedChat) => {
        const currentFavorites = get().favorites[chatId] || [];
        const isFavorited = currentFavorites.some(fav => fav.id === conversation.id);

        let newFavorites;
        if (isFavorited) {
            // Remove from favorites
            newFavorites = currentFavorites.filter(fav => fav.id !== conversation.id);
        } else {
            // Add to favorites
            newFavorites = [conversation, ...currentFavorites];
        }
        
        set(state => ({
            favorites: {
                ...state.favorites,
                [chatId]: newFavorites
            }
        }));
      },
      
      removeSavedHistory: (chatId, conversationId) => {
        const currentSaved = get().savedHistories[chatId] || [];
        set(state => ({
            savedHistories: {
                ...state.savedHistories,
                [chatId]: currentSaved.filter(c => c.id !== conversationId)
            }
        }));
      },
      
      removeFavorite: (chatId, conversationId) => {
        const currentFavorites = get().favorites[chatId] || [];
        set(state => ({
            favorites: {
                ...state.favorites,
                [chatId]: currentFavorites.filter(c => c.id !== conversationId)
            }
        }));
      },

      _setIsHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: 'chat-history-storage',
      storage: createJSONStorage(() => localStorage),
       onRehydrateStorage: () => (state) => {
        if (state) {
            state._setIsHydrated(true);
        }
      },
    }
  )
);
