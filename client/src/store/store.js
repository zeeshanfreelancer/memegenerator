// store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import memeReducer from './memeSlice';
import templateReducer from './templateSlice';

import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage
import { combineReducers } from 'redux';

const persistConfig = {
  key: 'auth',
  storage,
  whitelist: ['auth'] // only persist auth slice
};

const rootReducer = combineReducers({
  auth: authReducer,
  memes: memeReducer,
  templates: templateReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // required for redux-persist
    }),
});

export const persistor = persistStore(store);
