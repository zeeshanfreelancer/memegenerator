import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async ({ search = '', category = '', page = 1, limit = 5 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/templates', {
        params: { search, category, page, limit },
      });
      
      // Validate response structure
      if (!response.data?.templates) {
        throw new Error('Invalid response structure from server');
      }

      // Validate each template has required fields
      const validatedTemplates = response.data.templates.map(template => {
        if (!template._id || !template.imageUrl) {
          console.warn('Invalid template structure:', template);
          return {
            ...template,
            imageUrl: template.imageUrl || 'https://via.placeholder.com/300x300?text=Template+Image'
          };
        }
        return template;
      });

      return {
        templates: validatedTemplates,
        currentPage: page,
        totalPages: response.data.totalPages,
      };
    } catch (error) {
      console.error('Error fetching templates:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch templates');
    }
  }
);

export const fetchHomepageTemplates = createAsyncThunk(
  'templates/fetchHomepageTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/templates/homepage');
      return response.data;
    } catch (error) {
      console.error('Error fetching homepage templates:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch homepage templates');
    }
  }
);

export const uploadTemplate = createAsyncThunk(
  'templates/uploadTemplate',
  async (formData, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.post('/api/templates', formData, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Upload failed');
    }
  }
);

export const favoriteTemplate = createAsyncThunk(
  'templates/favoriteTemplate',
  async (templateId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.post(`/api/templates/${templateId}/favorite`, {}, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Favorite failed');
    }
  }
);

const templateSlice = createSlice({
  name: 'templates',
  initialState: {
    templates: [],
    homepageTemplates: [], // Separate state for homepage templates
    favorites: [],
    status: 'idle',
    homepageStatus: 'idle',
    error: null,
    homepageError: null,
    currentPage: 1,
    totalPages: 1,
  },
  reducers: {
    clearTemplates: (state) => {
      state.templates = [];
      state.currentPage = 1;
      state.totalPages = 1;
    },
    resetHomepageTemplates: (state) => {
      state.homepageTemplates = [];
      state.homepageStatus = 'idle';
      state.homepageError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch templates
      .addCase(fetchTemplates.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        if (action.payload.currentPage > 1) {
          state.templates = [...state.templates, ...action.payload.templates];
        } else {
          state.templates = action.payload.templates;
        }

        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.templates = [];
      })
      
      // Homepage templates
      .addCase(fetchHomepageTemplates.pending, (state) => {
        state.homepageStatus = 'loading';
        state.homepageError = null;
      })
      .addCase(fetchHomepageTemplates.fulfilled, (state, action) => {
        state.homepageStatus = 'succeeded';
        state.homepageTemplates = action.payload.templates || [];
      })
      .addCase(fetchHomepageTemplates.rejected, (state, action) => {
        state.homepageStatus = 'failed';
        state.homepageError = action.payload;
        state.homepageTemplates = [];
      })
      
      // Upload template
      .addCase(uploadTemplate.fulfilled, (state, action) => {
        state.templates.unshift(action.payload);
      })
      
      // Favorite template
      .addCase(favoriteTemplate.fulfilled, (state, action) => {
        state.favorites = action.payload.favoriteTemplates || [];
      });
  },
});

export const { clearTemplates, resetHomepageTemplates } = templateSlice.actions;
export default templateSlice.reducer;