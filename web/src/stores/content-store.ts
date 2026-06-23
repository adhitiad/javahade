// ============================================================
// Content Store — Zustand state for posts, stories, comments
// ============================================================
import { createStore } from 'zustand/vanilla';
import { createZustandContext } from './factory';
import type { Post, Story, Comment, PaginatedResponse } from '@/types';
import type { PostCreateInput } from '@/schemas';
import { django } from '@/lib/api';
import { postResponseSchema, commentResponseSchema, storyResponseSchema } from '@/schemas/responses';

export interface ContentState {
  posts: Post[];
  stories: Story[];
  comments: Record<string, Comment[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFeed: () => Promise<void>;
  fetchStories: () => Promise<void>;
  createPost: (data: PostCreateInput) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleUnlike: (postId: string) => Promise<void>;
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, body: string, parent?: string) => Promise<void>;
  createStory: (mediaFile: File, caption: string) => Promise<void>;
  clearError: () => void;
}

export const createContentStore = () => createStore<ContentState>()((set) => ({
  posts: [],
  stories: [],
  comments: {},
  isLoading: false,
  error: null,

  fetchFeed: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.get<PaginatedResponse<Post> | Post[]>('/posts/feed/');
      const posts = Array.isArray(res) ? res : res.results;
      set({ posts, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchStories: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.get<Story[] | PaginatedResponse<Story>>('/posts/stories/');
      const stories = Array.isArray(res) ? res : res.results;
      set({ stories, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createPost: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newPost = await django.post<Post>('/posts/', data, postResponseSchema);
      set((state) => ({
        posts: [newPost, ...state.posts],
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  toggleLike: async (postId) => {
    try {
      const res = await django.post<{
        liked: boolean;
        unliked: boolean;
        like_count: number;
        unlike_count: number;
        quality_score: number;
      }>(`/posts/${postId}/like/`);

      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                like_count: res.like_count,
                unlike_count: res.unlike_count,
                quality_score: res.quality_score,
                is_liked: res.liked,
                is_unliked: res.unliked,
              }
            : p
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  toggleUnlike: async (postId) => {
    try {
      const res = await django.post<{
        liked: boolean;
        unliked: boolean;
        like_count: number;
        unlike_count: number;
        quality_score: number;
      }>(`/posts/${postId}/unlike/`);

      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                like_count: res.like_count,
                unlike_count: res.unlike_count,
                quality_score: res.quality_score,
                is_liked: res.liked,
                is_unliked: res.unliked,
              }
            : p
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  fetchComments: async (postId) => {
    try {
      const res = await django.get<Comment[] | PaginatedResponse<Comment>>(`/posts/${postId}/comments/`);
      const commentsList = Array.isArray(res) ? res : res.results;
      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: commentsList,
        },
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  addComment: async (postId, body, parent) => {
    try {
      const newComment = await django.post<Comment>(`/posts/${postId}/comments/`, {
        body,
        parent,
      }, commentResponseSchema);

      set((state) => {
        const postComments = state.comments[postId] || [];
        return {
          comments: {
            ...state.comments,
            [postId]: [...postComments, newComment],
          },
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
          ),
        };
      });
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  createStory: async (mediaFile, caption) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('media_file', mediaFile);
      formData.append('caption', caption);

      const newStory = await django.post<Story>('/posts/stories/create/', formData, storyResponseSchema);

      set((state) => ({
        stories: [newStory, ...state.stories],
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

export const { Provider: ContentStoreProvider, useStoreHook: useContentStore } = createZustandContext<ContentState>();
