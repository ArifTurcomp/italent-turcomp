import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import CommunityPostCard from "../components/CommunityPostCard";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  bookmarkCommunityPost,
  createCommunityComment,
  createCommunityPost,
  fetchBookmarkedCommunityPosts,
  fetchCommunityComments,
  fetchCommunityPosts,
  reactCommunityPost,
  voteCommunityPoll
} from "../store/store";
import { colors, splitCsv } from "../utils/helpers";

const categories = [
  "All",
  "Mentorship",
  "Coaching",
  "Expertise",
  "Hobby",
  "Science",
  "General"
];

const postTypes = [
  { key: "text", label: "Post" },
  { key: "question", label: "Question" },
  { key: "poll", label: "Poll" }
];

const sortOptions = [
  { key: "featured", label: "Featured" },
  { key: "recent", label: "Recent" },
  { key: "active", label: "Active" }
];

const defaultValues = {
  title: "",
  content: "",
  category: "Mentorship",
  content_type: "text",
  hashtags: "",
  poll_options: ""
};

const metricValue = (post) => (post.likes || 0) + (post.comments_count || 0) * 2;

const StatCard = ({ label, value, tone }) => (
  <View style={[styles.statCard, tone === "warm" && styles.warmStatCard]}>
    <Text style={[styles.statValue, tone === "warm" && styles.warmStatValue]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const CommunityScreen = () => {
  const dispatch = useDispatch();
  const {
    posts,
    bookmarkedPosts,
    loading,
    saving,
    error,
    commentsByPost,
    commentLoadingByPost,
    bookmarkedPostIds,
    pollResultsByPost
  } = useSelector((state) => state.community);
  const user = useSelector((state) => state.auth.user);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState("all");
  const [sortMode, setSortMode] = useState("featured");
  const [query, setQuery] = useState("");
  const [values, setValues] = useState(defaultValues);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (viewMode === "bookmarks") {
      dispatch(fetchBookmarkedCommunityPosts());
    } else {
      dispatch(
        fetchCommunityPosts({
          page: 1,
          per_page: 50,
          category: selectedCategory === "All" ? undefined : selectedCategory
        })
      );
    }
  }, [dispatch, selectedCategory, viewMode]);

  const authorName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : "Turcomp Team";

  const visiblePosts = useMemo(() => {
    const sourcePosts = viewMode === "bookmarks" ? bookmarkedPosts : posts;
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? sourcePosts.filter((post) => {
          const searchable = [
            post.title,
            post.content,
            post.category,
            post.author_name,
            ...(Array.isArray(post.hashtags) ? post.hashtags : [])
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return searchable.includes(normalizedQuery);
        })
      : sourcePosts;

    return [...filtered].sort((a, b) => {
      if (sortMode === "recent") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortMode === "active") {
        return metricValue(b) - metricValue(a);
      }
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return metricValue(b) - metricValue(a);
    });
  }, [bookmarkedPosts, posts, query, sortMode, viewMode]);

  const stats = useMemo(
    () => ({
      posts: posts.length,
      replies: posts.reduce((total, post) => total + (post.comments_count || 0), 0),
      polls: posts.filter((post) => post.content_type === "poll").length,
      bookmarks: Math.max(
        bookmarkedPosts.length,
        posts.filter((post) => post.is_bookmarked || bookmarkedPostIds?.[post.id]).length
      )
    }),
    [bookmarkedPostIds, bookmarkedPosts, posts]
  );

  const updateValue = (field, value) => {
    setFormError("");
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submitPost = async () => {
    const content = values.content.trim();
    const pollOptions = splitCsv(values.poll_options);
    if (!content) {
      setFormError("Write something meaningful before posting.");
      return;
    }
    if (values.content_type === "poll" && pollOptions.length < 2) {
      setFormError("Polls need at least two options.");
      return;
    }

    try {
      await dispatch(
        createCommunityPost({
          title: values.title.trim(),
          content,
          category: values.category.trim() || "General",
          content_type: values.content_type,
          hashtags: splitCsv(values.hashtags).map((tag) => tag.replace(/^#/, "")),
          poll_options: values.content_type === "poll" ? pollOptions : []
        })
      ).unwrap();
      setValues(defaultValues);
      setShowForm(false);
    } catch (_) {
      // The Redux error state renders below the form.
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Community Apps</Text>
          <Text style={styles.title}>Build momentum together</Text>
          <Text style={styles.subtitle}>
            A focused place for questions, mentoring, polls, expertise, and shared wins.
          </Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setShowForm((value) => !value)}>
          <Text style={styles.addButtonText}>{showForm ? "Close" : "Create"}</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Posts" value={stats.posts} />
        <StatCard label="Replies" value={stats.replies} />
        <StatCard label="Polls" value={stats.polls} tone="warm" />
        <StatCard label="Bookmarks" value={stats.bookmarks} tone="warm" />
      </View>

      <View style={styles.controls}>
        <View style={styles.viewToggle}>
          {[
            { key: "all", label: "All Posts" },
            { key: "bookmarks", label: "Bookmarks" }
          ].map((option) => {
            const active = viewMode === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.viewButton, active && styles.activeViewButton]}
                onPress={() => setViewMode(option.key)}
              >
                <Text style={[styles.viewButtonText, active && styles.activeViewButtonText]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <FormInput
          label=""
          value={query}
          placeholder="Search topics, people, tags"
          containerStyle={styles.searchField}
          onChangeText={setQuery}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentRow}
        >
          {sortOptions.map((option) => {
            const active = sortMode === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.segment, active && styles.activeSegment]}
                onPress={() => setSortMode(option.key)}
              >
                <Text style={[styles.segmentText, active && styles.activeSegmentText]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {viewMode === "all" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <Pressable
                key={category}
                style={[styles.filterChip, active && styles.activeFilterChip]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.filterText, active && styles.activeFilterText]}>{category}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {showForm ? (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Start a conversation</Text>
            <View style={styles.typeRow}>
              {postTypes.map((type) => {
                const active = values.content_type === type.key;
                return (
                  <Pressable
                    key={type.key}
                    style={[styles.typeButton, active && styles.activeTypeButton]}
                    onPress={() => updateValue("content_type", type.key)}
                  >
                    <Text style={[styles.typeButtonText, active && styles.activeTypeButtonText]}>
                      {type.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FormInput
            label="Title"
            value={values.title}
            placeholder="Short headline"
            onChangeText={(value) => updateValue("title", value)}
          />
          <FormInput
            label={values.content_type === "question" ? "Question" : "Message"}
            value={values.content}
            multiline
            placeholder="Share context, progress, or what you need"
            onChangeText={(value) => updateValue("content", value)}
          />

          <View style={styles.categoryPicker}>
            {categories
              .filter((category) => category !== "All")
              .map((category) => {
                const active = values.category === category;
                return (
                  <Pressable
                    key={category}
                    style={[styles.categoryButton, active && styles.activeCategoryButton]}
                    onPress={() => updateValue("category", category)}
                  >
                    <Text
                      style={[styles.categoryButtonText, active && styles.activeCategoryButtonText]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
          </View>

          {values.content_type === "poll" ? (
            <FormInput
              label="Poll Options"
              value={values.poll_options}
              helperText="Separate options with commas."
              onChangeText={(value) => updateValue("poll_options", value)}
            />
          ) : null}

          <FormInput
            label="Tags"
            value={values.hashtags}
            helperText="Separate tags with commas."
            onChangeText={(value) => updateValue("hashtags", value)}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Pressable disabled={saving} style={styles.primaryButton} onPress={submitPost}>
            <Text style={styles.primaryText}>{saving ? "Posting..." : "Post to Community"}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && posts.length === 0 ? <LoadingSpinner label="Loading community" /> : null}

      {visiblePosts.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {viewMode === "bookmarks" ? "No bookmarks yet" : "No conversations found"}
          </Text>
          <Text style={styles.emptyText}>
            {viewMode === "bookmarks"
              ? "Bookmark community posts and they will appear here."
              : "Try a different category or start a new one."}
          </Text>
        </View>
      ) : null}

      {visiblePosts.map((post) => (
        <CommunityPostCard
          key={post.id}
          post={post}
          authorName={
            post.author_name || (post.author_id === user?.id ? authorName : "Community Member")
          }
          authorEmail={post.author_email}
          comments={commentsByPost?.[post.id]}
          commentsLoading={Boolean(commentLoadingByPost?.[post.id])}
          bookmarked={Boolean(post.is_bookmarked || bookmarkedPostIds?.[post.id])}
          pollResults={pollResultsByPost?.[post.id] || {}}
          onReact={(reactionType) =>
            dispatch(reactCommunityPost({ id: post.id, reaction_type: reactionType }))
          }
          onBookmark={() => dispatch(bookmarkCommunityPost(post.id))}
          onLoadComments={() => dispatch(fetchCommunityComments(post.id))}
          onAddComment={(content, attachments = []) =>
            dispatch(createCommunityComment({ id: post.id, content, attachments })).unwrap()
          }
          onPollVote={(optionIndex) =>
            dispatch(voteCommunityPoll({ id: post.id, option_index: optionIndex }))
          }
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 16,
    paddingBottom: 28
  },
  hero: {
    alignItems: "flex-start",
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    marginBottom: 14,
    overflow: "hidden",
    padding: 18
  },
  heroCopy: {
    flex: 1,
    minWidth: 0
  },
  eyebrow: {
    color: "#BFE7DA",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase"
  },
  title: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31
  },
  subtitle: {
    color: "#DDEBFA",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  addButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11
  },
  addButtonText: {
    color: colors.primaryDark,
    fontWeight: "900"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 78,
    padding: 14
  },
  warmStatCard: {
    backgroundColor: "#FFF8EB",
    borderColor: "#F5D08A"
  },
  statValue: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "900"
  },
  warmStatValue: {
    color: "#9A5C00"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  controls: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12
  },
  viewToggle: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10
  },
  viewButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  activeViewButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  viewButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  activeViewButtonText: {
    color: colors.surface
  },
  searchField: {
    marginBottom: 10
  },
  segmentRow: {
    gap: 8
  },
  segment: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  activeSegment: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  activeSegmentText: {
    color: colors.primary
  },
  filterRow: {
    gap: 8,
    paddingBottom: 14
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  activeFilterChip: {
    backgroundColor: "#EAF7F2",
    borderColor: colors.success
  },
  filterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  activeFilterText: {
    color: colors.success
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 4px 12px rgba(23, 32, 51, 0.05)",
    elevation: 2
  },
  formHeader: {
    gap: 10,
    marginBottom: 14
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  typeButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  activeTypeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  typeButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  activeTypeButtonText: {
    color: colors.surface
  },
  categoryPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  activeCategoryButton: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  categoryButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  activeCategoryButtonText: {
    color: colors.accentDark
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "900"
  },
  error: {
    color: colors.danger,
    marginBottom: 10
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 22
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
    textAlign: "center"
  }
});

export default CommunityScreen;
