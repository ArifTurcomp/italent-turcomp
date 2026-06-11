import PropTypes from "prop-types";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, formatDate, getInitials } from "../utils/helpers";

/**
 * Displays a community post with author, category, and like action.
 */
const CommunityPostCard = ({ post, authorName, authorEmail, onLike }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(authorName)}</Text>
      </View>
      <View style={styles.authorBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.author}>{authorName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{post.category || "General"}</Text>
          </View>
        </View>
        <Text style={styles.time}>
          {authorEmail ? `${authorEmail} | ` : ""}
          {formatDate(post.created_at)}
        </Text>
      </View>
    </View>
    <Text style={styles.content}>{post.content}</Text>
    <View style={styles.actions}>
      <Pressable onPress={onLike} style={styles.action}>
        <Text style={styles.actionText}>Like {post.likes || 0}</Text>
      </Pressable>
      <Text style={styles.meta}>{post.comments_count || 0} comments</Text>
    </View>
  </View>
);

CommunityPostCard.propTypes = {
  post: PropTypes.shape({
    content: PropTypes.string.isRequired,
    category: PropTypes.string,
    likes: PropTypes.number,
    comments_count: PropTypes.number,
    created_at: PropTypes.string
  }).isRequired,
  authorName: PropTypes.string,
  authorEmail: PropTypes.string,
  onLike: PropTypes.func
};

CommunityPostCard.defaultProps = {
  authorName: "Turcomp Team",
  authorEmail: "",
  onLike: undefined
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  avatarText: {
    color: colors.surface,
    fontWeight: "900"
  },
  authorBlock: {
    flex: 1,
    minWidth: 0
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  author: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800"
  },
  content: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12
  },
  action: {
    paddingVertical: 4
  },
  actionText: {
    color: colors.primary,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 13
  }
});

export default CommunityPostCard;
