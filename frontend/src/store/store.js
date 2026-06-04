import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../services/api";

const normalizeList = (payload, fallbackPage = 1) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pagination: {
        page: fallbackPage,
        per_page: payload.length,
        total: payload.length,
        pages: 1
      }
    };
  }

  return {
    items: payload?.items || payload?.contacts || payload?.posts || payload?.data || [],
    pagination: payload?.pagination || {
      page: payload?.page || fallbackPage,
      per_page: payload?.per_page || 20,
      total: payload?.total || 0,
      pages: payload?.pages || 1
    }
  };
};

const rejectMessage = (error, rejectWithValue) =>
  rejectWithValue(error?.message || "Request failed");

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await api.auth.login(credentials);
      await AsyncStorage.multiSet([
        ["accessToken", data.access_token],
        ["refreshToken", data.refresh_token || ""],
        ["currentUser", JSON.stringify(data.user || {})]
      ]);
      return data;
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await api.auth.register(payload);
      if (data.access_token) {
        await AsyncStorage.multiSet([
          ["accessToken", data.access_token],
          ["refreshToken", data.refresh_token || ""],
          ["currentUser", JSON.stringify(data.user || data || {})]
        ]);
      }
      return data;
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const bootstrapAuth = createAsyncThunk("auth/bootstrap", async () => {
  const token = await AsyncStorage.getItem("accessToken");
  const userValue = await AsyncStorage.getItem("currentUser");
  return {
    token,
    user: userValue ? JSON.parse(userValue) : null
  };
});

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await api.auth.logout();
  } finally {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "currentUser"]);
  }
});

export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const user = await api.users.updateMe(payload);
      await AsyncStorage.setItem("currentUser", JSON.stringify(user || {}));
      return user;
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const fetchContacts = createAsyncThunk(
  "contacts/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await api.contacts.list(params);
      return normalizeList(data, params.page || 1);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const fetchContactById = createAsyncThunk(
  "contacts/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await api.contacts.get(id);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const createContact = createAsyncThunk(
  "contacts/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await api.contacts.create(payload);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const updateContact = createAsyncThunk(
  "contacts/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await api.contacts.update(id, payload);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const deleteContact = createAsyncThunk(
  "contacts/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.contacts.remove(id);
      return id;
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const fetchDepartments = createAsyncThunk(
  "departments/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await api.departments.list(params);
      return normalizeList(data, params.page || 1).items;
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const fetchJobs = createAsyncThunk(
  "jobs/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await api.jobs.list(params);
      return normalizeList(data, params.page || 1);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const createJob = createAsyncThunk(
  "jobs/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await api.jobs.create(payload);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const fetchCommunityPosts = createAsyncThunk(
  "community/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await api.community.list(params);
      return normalizeList(data, params.page || 1);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const createCommunityPost = createAsyncThunk(
  "community/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await api.community.create(payload);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const likeCommunityPost = createAsyncThunk(
  "community/like",
  async (id, { rejectWithValue }) => {
    try {
      return await api.community.like(id);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    bootstrapped: false
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = Boolean(action.payload.token);
        state.bootstrapped = true;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access_token || state.token;
        state.user = action.payload.user || action.payload;
        state.isAuthenticated = Boolean(action.payload.access_token);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

const contactsSlice = createSlice({
  name: "contacts",
  initialState: {
    items: [],
    selectedContact: null,
    loading: false,
    saving: false,
    error: null,
    pagination: { page: 1, per_page: 20, total: 0, pages: 1 }
  },
  reducers: {
    clearSelectedContact: (state) => {
      state.selectedContact = null;
    },
    clearContactsError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchContactById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContactById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedContact = action.payload;
      })
      .addCase(fetchContactById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createContact.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.saving = false;
        state.items.unshift(action.payload);
      })
      .addCase(createContact.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updateContact.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        state.saving = false;
        state.selectedContact = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
      })
      .addCase(updateContact.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.items = [];
        state.selectedContact = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.items = [];
        state.selectedContact = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.items = [];
        state.selectedContact = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      });
  }
});

const departmentsSlice = createSlice({
  name: "departments",
  initialState: { items: [], selectedDepartment: null, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

const jobsSlice = createSlice({
  name: "jobs",
  initialState: {
    items: [],
    selectedJob: null,
    loading: false,
    saving: false,
    error: null,
    pagination: { page: 1, per_page: 20, total: 0, pages: 1 }
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createJob.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.saving = false;
        state.items.unshift(action.payload);
      })
      .addCase(createJob.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.items = [];
        state.selectedJob = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.items = [];
        state.selectedJob = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.items = [];
        state.selectedJob = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      });
  }
});

const communitySlice = createSlice({
  name: "community",
  initialState: {
    posts: [],
    selectedPost: null,
    loading: false,
    saving: false,
    error: null,
    pagination: { page: 1, per_page: 20, total: 0, pages: 1 }
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommunityPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommunityPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCommunityPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCommunityPost.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createCommunityPost.fulfilled, (state, action) => {
        state.saving = false;
        state.posts.unshift(action.payload);
      })
      .addCase(createCommunityPost.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(likeCommunityPost.fulfilled, (state, action) => {
        state.posts = state.posts.map((post) =>
          post.id === action.payload.id ? action.payload : post
        );
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.posts = [];
        state.selectedPost = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.posts = [];
        state.selectedPost = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.posts = [];
        state.selectedPost = null;
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      });
  }
});

export const { clearAuthError } = authSlice.actions;
export const { clearSelectedContact, clearContactsError } = contactsSlice.actions;

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    contacts: contactsSlice.reducer,
    departments: departmentsSlice.reducer,
    jobs: jobsSlice.reducer,
    community: communitySlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export default store;
