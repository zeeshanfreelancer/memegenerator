import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const createMeme = createAsyncThunk(
  'memes/createMeme',
  async (memeData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post('/api/memes', memeData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create meme');
    }
  }
);

export const fetchUserMemes = createAsyncThunk(
  'memes/fetchUserMemes',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.get('/api/memes/my-memes', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          limit: 100,
        },
      });
      return response.data.memes || response.data || [];
    } catch (error) {
      console.error('Detailed error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch your memes');
    }
  }
);

export const fetchPopularMemes = createAsyncThunk(
  'memes/fetchPopularMemes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/memes/popular');
      return response.data?.memes || response.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch popular memes');
    }
  }
);

export const likeMeme = createAsyncThunk(
  'memes/likeMeme',
  async (memeId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `/api/memes/${memeId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to like meme');
    }
  }
);

export const deleteMeme = createAsyncThunk(
  'memes/deleteMeme',
  async (memeId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await axios.delete(`/api/memes/${memeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return memeId; // Return the deleted meme ID
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete meme');
    }
  }
);

const memeSlice = createSlice({
  name: 'memes',
  initialState: {
    userMemes: [],
    popularMemes: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    clearMemeError: (state) => {
      state.error = null;
    },
    resetMemes: (state) => {
      state.userMemes = [];
      state.popularMemes = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Meme
      .addCase(createMeme.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createMeme.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.userMemes.unshift(action.payload);
      })
      .addCase(createMeme.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch User Memes
      .addCase(fetchUserMemes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserMemes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.userMemes = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchUserMemes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Popular Memes
      .addCase(fetchPopularMemes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPopularMemes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.popularMemes = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchPopularMemes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Like Meme
      .addCase(likeMeme.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(likeMeme.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Update in both user memes and popular memes
        const updateMemeInArray = (array) => {
          const index = array.findIndex((meme) => meme._id === action.payload._id);
          if (index !== -1) {
            array[index] = action.payload;
          }
        };
        updateMemeInArray(state.userMemes);
        updateMemeInArray(state.popularMemes);
      })
      .addCase(likeMeme.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Delete Meme
      .addCase(deleteMeme.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteMeme.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.userMemes = state.userMemes.filter(meme => meme._id !== action.payload);
      })
      .addCase(deleteMeme.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearMemeError, resetMemes } = memeSlice.actions;
export default memeSlice.reducer;