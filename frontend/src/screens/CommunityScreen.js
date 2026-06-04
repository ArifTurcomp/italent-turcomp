import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import CommunityPostCard from "../components/CommunityPostCard";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  createCommunityPost,
  fetchCommunityPosts,
  likeCommunityPost
} from "../store/store";
import { colors } from "../utils/helpers";

const CommunityScreen = () => {
  const dispatch = useDispatch();
  const { posts, loading, saving, error } = useSelector((state) => state.community);
  const user = useSelector((state) => state.auth.user);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState({ content: "", category: "General" });

  useEffect(() => {
    dispatch(fetchCommunityPosts({ page: 1, per_page: 50 }));
  }, [dispatch]);

  const submitPost = async () => {
    if (!values.content.trim()) return;
    try {
      await dispatch(
        createCommunityPost({
          content: values.content.trim(),
          category: values.category.trim() || "General"
        })
      ).unwrap();
      setValues({ content: "", category: "General" });
      setShowForm(false);
    } catch (_) {
      // The Redux error state renders below the form.
    }
  };

  const authorName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Turcomp Team";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Community Hub</Text>
          <Text style={styles.subtitle}>Share announcements, opportunities, and learning updates.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setShowForm((value) => !value)}>
          <Text style={styles.addButtonText}>{showForm ? "Close" : "Post"}</Text>
        </Pressable>
      </View>

      <View style={styles.alert}>
        <Text style={styles.alertText}>
          Share updates and connect with colleagues across departments.
        </Text>
      </View>

      {showForm ? (
        <View style={styles.formCard}>
          <FormInput
            label="Message"
            value={values.content}
            multiline
            onChangeText={(value) => setValues((current) => ({ ...current, content: value }))}
          />
          <FormInput
            label="Category"
            value={values.category}
            helperText="General, Opportunity, Announcement, or Learning."
            onChangeText={(value) => setValues((current) => ({ ...current, category: value }))}
          />
          <Pressable disabled={saving} style={styles.primaryButton} onPress={submitPost}>
            <Text style={styles.primaryText}>{saving ? "Posting..." : "Post to Community"}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && posts.length === 0 ? <LoadingSpinner label="Loading community" /> : null}
      {posts.map((post) => (
        <CommunityPostCard
          key={post.id}
          post={post}
          authorName={post.author_id === user?.id ? authorName : "Turcomp Team"}
          onLike={() => dispatch(likeCommunityPost(post.id))}
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16
  },
  headerCopy: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11
  },
  addButtonText: {
    color: colors.surface,
    fontWeight: "900"
  },
  alert: {
    backgroundColor: "#E1F5EE",
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  alertText: {
    color: "#085041",
    fontSize: 13,
    fontWeight: "700"
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16
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
  }
});

export default CommunityScreen;
