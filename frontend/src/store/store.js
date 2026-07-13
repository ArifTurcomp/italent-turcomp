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

export const adminUpdateUserStatus = createAsyncThunk(
  "contacts/adminUpdateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return await api.admin.updateUserStatus(id, { status });
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const adminUpdateUserRole = createAsyncThunk(
  "contacts/adminUpdateRole",
  async ({ id, role }, { rejectWithValue }) => {
    try {
      return await api.admin.updateUserRole(id, { role });
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

export const sendConnectionRequest = createAsyncThunk(
  "connections/request",
  async ({ recipient_id, message = "" }, { rejectWithValue }) => {
    try {
      return await api.connections.request({ recipient_id, message });
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const respondConnectionRequest = createAsyncThunk(
  "connections/respond",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return await api.connections.respond(id, { status });
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

export const fetchPositions = createAsyncThunk(
  "positions/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.positions.list();
      return data.items || data || [];
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

export const reactCommunityPost = createAsyncThunk(
  "community/react",
  async ({ id, reaction_type = "like" }, { rejectWithValue }) => {
    try {
      return await api.community.react(id, { reaction_type });
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const bookmarkCommunityPost = createAsyncThunk(
  "community/bookmark",
  async (id, { rejectWithValue }) => {
    try {
      const data = await api.community.bookmark(id);
      return { id, ...data };
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const fetchBookmarkedCommunityPosts = createAsyncThunk(
  "community/bookmarks/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.community.bookmarks();
      return normalizeList(data);
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const fetchCommunityComments = createAsyncThunk(
  "community/comments/fetch",
  async (id, { rejectWithValue }) => {
    try {
      const data = await api.community.comments(id, { page: 1, per_page: 20 });
      return { postId: id, comments: normalizeList(data).items };
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const createCommunityComment = createAsyncThunk(
  "community/comments/create",
  async ({ id, content, attachments = [] }, { rejectWithValue }) => {
    try {
      const comment = await api.community.comment(id, { content, attachments });
      return { postId: id, comment };
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const voteCommunityPoll = createAsyncThunk(
  "community/poll/vote",
  async ({ id, option_index }, { rejectWithValue }) => {
    try {
      const result = await api.community.pollVote(id, { option_index });
      return { postId: id, optionIndex: option_index, result };
    } catch (error) {
      return rejectMessage(error, rejectWithValue);
    }
  }
);

export const shareCommunityPost = createAsyncThunk(
  "community/share",
  async ({ id, post }, { rejectWithValue }) => {
    try {
      return await api.community.share(id, post);
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

const withConnectionState = (contact, connection, direction) => ({
  ...contact,
  connection_id: connection.id,
  connection_status: connection.status,
  connection_direction: direction
});

const contactsSlice = createSlice({
  name: "contacts",
  initialState: {
    items: [],
    selectedContact: null,
    loading: false,
    adminSaving: false,
    saving: false,
    error: null,
    adminError: null,
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
      .addCase(adminUpdateUserStatus.pending, (state) => {
        state.adminSaving = true;
        state.adminError = null;
      })
      .addCase(adminUpdateUserStatus.fulfilled, (state, action) => {
        state.adminSaving = false;
        if (state.selectedContact?.id === action.payload.id) {
          state.selectedContact = action.payload;
        }
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
      })
      .addCase(adminUpdateUserStatus.rejected, (state, action) => {
        state.adminSaving = false;
        state.adminError = action.payload;
      })
      .addCase(adminUpdateUserRole.pending, (state) => {
        state.adminSaving = true;
        state.adminError = null;
      })
      .addCase(adminUpdateUserRole.fulfilled, (state, action) => {
        state.adminSaving = false;
        if (state.selectedContact?.id === action.payload.id) {
          state.selectedContact = action.payload;
        }
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
      })
      .addCase(adminUpdateUserRole.rejected, (state, action) => {
        state.adminSaving = false;
        state.adminError = action.payload;
      })
      .addCase(sendConnectionRequest.fulfilled, (state, action) => {
        const connection = action.payload;
        state.items = state.items.map((item) =>
          item.id === connection.recipient_id
            ? withConnectionState(item, connection, "outgoing")
            : item
        );
        if (state.selectedContact?.id === connection.recipient_id) {
          state.selectedContact = withConnectionState(
            state.selectedContact,
            connection,
            "outgoing"
          );
        }
      })
      .addCase(sendConnectionRequest.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(respondConnectionRequest.fulfilled, (state, action) => {
        const connection = action.payload;
        state.items = state.items.map((item) =>
          item.id === connection.requester_id
            ? withConnectionState(item, connection, "incoming")
            : item
        );
        if (state.selectedContact?.id === connection.requester_id) {
          state.selectedContact = withConnectionState(
            state.selectedContact,
            connection,
            "incoming"
          );
        }
      })
      .addCase(respondConnectionRequest.rejected, (state, action) => {
        state.error = action.payload;
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

const positionsSlice = createSlice({
  name: "positions",
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPositions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPositions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPositions.rejected, (state, action) => {
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
    bookmarkedPosts: [],
    selectedPost: null,
    commentsByPost: {},
    commentLoadingByPost: {},
    bookmarkedPostIds: {},
    pollResultsByPost: {},
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
        action.payload.items.forEach((post) => {
          if (post.is_bookmarked) {
            state.bookmarkedPostIds[post.id] = true;
          } else {
            delete state.bookmarkedPostIds[post.id];
          }
        });
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
      .addCase(reactCommunityPost.fulfilled, (state, action) => {
        state.posts = state.posts.map((post) =>
          post.id === action.payload.id ? action.payload : post
        );
      })
      .addCase(bookmarkCommunityPost.fulfilled, (state, action) => {
        const postId = action.payload.post_id || action.payload.id;
        if (action.payload.is_bookmarked) {
          state.bookmarkedPostIds[postId] = true;
        } else {
          delete state.bookmarkedPostIds[postId];
          state.bookmarkedPosts = state.bookmarkedPosts.filter((post) => post.id !== postId);
        }
        state.posts = state.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_bookmarked: Boolean(action.payload.is_bookmarked),
                bookmark_count: action.payload.bookmark_count ?? post.bookmark_count
              }
            : post
        );
        state.bookmarkedPosts = state.bookmarkedPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_bookmarked: Boolean(action.payload.is_bookmarked),
                bookmark_count: action.payload.bookmark_count ?? post.bookmark_count
              }
            : post
        );
      })
      .addCase(bookmarkCommunityPost.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchBookmarkedCommunityPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookmarkedCommunityPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.bookmarkedPosts = action.payload.items;
        action.payload.items.forEach((post) => {
          state.bookmarkedPostIds[post.id] = true;
        });
      })
      .addCase(fetchBookmarkedCommunityPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCommunityComments.pending, (state, action) => {
        state.commentLoadingByPost[action.meta.arg] = true;
      })
      .addCase(fetchCommunityComments.fulfilled, (state, action) => {
        state.commentLoadingByPost[action.payload.postId] = false;
        state.commentsByPost[action.payload.postId] = action.payload.comments;
      })
      .addCase(fetchCommunityComments.rejected, (state, action) => {
        state.commentLoadingByPost[action.meta.arg] = false;
        state.error = action.payload;
      })
      .addCase(createCommunityComment.fulfilled, (state, action) => {
        const postId = action.payload.postId;
        state.commentsByPost[postId] = [
          ...(state.commentsByPost[postId] || []),
          action.payload.comment
        ];
        state.posts = state.posts.map((post) =>
          post.id === postId
            ? { ...post, comments_count: (post.comments_count || 0) + 1 }
            : post
        );
      })
      .addCase(voteCommunityPoll.fulfilled, (state, action) => {
        state.pollResultsByPost[action.payload.postId] = action.payload.result.results || {};
      })
      .addCase(shareCommunityPost.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(shareCommunityPost.fulfilled, (state, action) => {
        state.saving = false;
        state.posts.unshift(action.payload);
      })
      .addCase(shareCommunityPost.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.posts = [];
        state.bookmarkedPosts = [];
        state.selectedPost = null;
        state.commentsByPost = {};
        state.commentLoadingByPost = {};
        state.bookmarkedPostIds = {};
        state.pollResultsByPost = {};
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.posts = [];
        state.bookmarkedPosts = [];
        state.selectedPost = null;
        state.commentsByPost = {};
        state.commentLoadingByPost = {};
        state.bookmarkedPostIds = {};
        state.pollResultsByPost = {};
        state.pagination = { page: 1, per_page: 20, total: 0, pages: 1 };
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.posts = [];
        state.bookmarkedPosts = [];
        state.selectedPost = null;
        state.commentsByPost = {};
        state.commentLoadingByPost = {};
        state.bookmarkedPostIds = {};
        state.pollResultsByPost = {};
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
    positions: positionsSlice.reducer,
    jobs: jobsSlice.reducer,
    community: communitySlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export default store;
