import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, formatDate, getInitials } from "../utils/helpers";

const reactionOptions = [
  { key: "like", label: "Like" },
  { key: "insightful", label: "Insightful" },
  { key: "support", label: "Support" },
  { key: "curious", label: "Curious" }
];

const contentTypeLabel = {
  text: "Post",
  question: "Question",
  poll: "Poll"
};

const photoAttachmentsFromText = (value) =>
  String(value || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ type: "image", url }));

const CommunityPostCard = ({
  post,
  authorName,
  authorEmail,
  comments,
  commentsLoading,
  bookmarked,
  pollResults,
  onReact,
  onBookmark,
  onLoadComments,
  onAddComment,
  onPollVote
}) => {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentPhotoUrls, setCommentPhotoUrls] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState("like");
  const [selectedPollIndex, setSelectedPollIndex] = useState(null);

  useEffect(() => {
    if (expanded && !comments && !commentsLoading && onLoadComments) {
      onLoadComments();
    }
  }, [comments, commentsLoading, expanded, onLoadComments]);

  const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
  const pollOptions = Array.isArray(post.poll_options) ? post.poll_options : [];
  const isPoll = post.content_type === "poll" && pollOptions.length > 0;
  const pendingPhotoAttachments = photoAttachmentsFromText(commentPhotoUrls);
  const canSubmitComment = commentText.trim() || pendingPhotoAttachments.length > 0;

  const totalVotes = useMemo(
    () =>
      Object.values(pollResults || {}).reduce(
        (total, value) => total + Number(value || 0),
        0
      ),
    [pollResults]
  );

  const addComment = async () => {
    const content = commentText.trim();
    const attachments = pendingPhotoAttachments;
    if ((!content && attachments.length === 0) || !onAddComment) return;
    setSavingComment(true);
    try {
      await onAddComment(content || "Photo reply", attachments);
      setCommentText("");
      setCommentPhotoUrls("");
    } finally {
      setSavingComment(false);
    }
  };

  const chooseReaction = (reactionType) => {
    setSelectedReaction(reactionType);
    if (onReact) onReact(reactionType);
  };

  const vote = (optionIndex) => {
    setSelectedPollIndex(optionIndex);
    if (onPollVote) onPollVote(optionIndex);
  };

  return (
    <View style={[styles.card, post.pinned && styles.pinnedCard]}>
      <Pressable style={styles.header} onPress={() => setExpanded((value) => !value)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(authorName)}</Text>
        </View>
        <View style={styles.authorBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.author} numberOfLines={1}>
              {authorName}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{post.category || "General"}</Text>
            </View>
          </View>
          <Text style={styles.time} numberOfLines={1}>
            {authorEmail ? `${authorEmail} | ` : ""}
            {formatDate(post.created_at)}
          </Text>
        </View>
        <View style={styles.typePill}>
          <Text style={styles.typeText}>{contentTypeLabel[post.content_type] || "Post"}</Text>
        </View>
      </Pressable>

      {post.pinned ? (
        <Text style={styles.pinnedLabel}>Pinned conversation</Text>
      ) : null}

      {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
      <Text style={styles.content}>{post.content}</Text>

      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.slice(0, 4).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {isPoll ? (
        <View style={styles.pollPanel}>
          {pollOptions.map((option, index) => {
            const votes = Number((pollResults || {})[String(index)] || 0);
            const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const selected = selectedPollIndex === index;
            return (
              <Pressable
                key={`${option}-${index}`}
                style={[styles.pollOption, selected && styles.pollOptionSelected]}
                onPress={() => vote(index)}
              >
                <View style={[styles.pollBar, { width: `${percent}%` }]} />
                <View style={styles.pollCopy}>
                  <Text style={styles.pollText}>{option}</Text>
                  <Text style={styles.pollMeta}>{percent}%</Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={styles.pollFooter}>{totalVotes} votes</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => chooseReaction(selectedReaction)}
          style={[styles.actionButton, styles.primaryAction]}
        >
          <Text style={styles.primaryActionText}>{post.likes || 0} reactions</Text>
        </Pressable>
        <Pressable onPress={() => setExpanded((value) => !value)} style={styles.actionButton}>
          <Text style={styles.actionText}>{post.comments_count || 0} comments</Text>
        </Pressable>
        <Pressable
          onPress={onBookmark}
          style={[styles.iconButton, bookmarked && styles.bookmarkedButton]}
        >
          <Text style={[styles.iconButtonText, bookmarked && styles.bookmarkedText]}>
            {bookmarked ? "Unbookmark" : "Bookmark"}
          </Text>
        </Pressable>
        {onShare ? (
          <Pressable onPress={onShare} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>Share</Text>
          </Pressable>
        ) : null}
      </View>

      {expanded ? (
        <View style={styles.expandedPanel}>
          <View style={styles.reactionRow}>
            {reactionOptions.map((reaction) => {
              const active = selectedReaction === reaction.key;
              return (
                <Pressable
                  key={reaction.key}
                  style={[styles.reactionChip, active && styles.activeReactionChip]}
                  onPress={() => chooseReaction(reaction.key)}
                >
                  <Text style={[styles.reactionText, active && styles.activeReactionText]}>
                    {reaction.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.commentComposer}>
            <View style={styles.commentFields}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a useful reply"
                placeholderTextColor="#8795A8"
                multiline
                style={styles.commentInput}
              />
              <TextInput
                value={commentPhotoUrls}
                onChangeText={setCommentPhotoUrls}
                placeholder="Photo URL, or multiple URLs separated by commas"
                placeholderTextColor="#8795A8"
                autoCapitalize="none"
                style={styles.photoInput}
              />
            </View>
            <Pressable
              disabled={savingComment || !canSubmitComment}
              style={[
                styles.commentButton,
                (!canSubmitComment || savingComment) && styles.disabledButton
              ]}
              onPress={addComment}
            >
              <Text style={styles.commentButtonText}>
                {savingComment ? "Sending" : "Reply"}
              </Text>
            </Pressable>
          </View>

          {commentsLoading ? <Text style={styles.commentMeta}>Loading replies...</Text> : null}
          {(comments || []).slice(0, 3).map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{getInitials(comment.author_name)}</Text>
              </View>
              <View style={styles.commentBubble}>
                <Text style={styles.commentAuthor}>{comment.author_name || "Community Member"}</Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
                {(comment.attachments || [])
                  .filter((attachment) => attachment.type === "image" && attachment.url)
                  .map((attachment, index) => (
                    <Image
                      key={`${attachment.url}-${index}`}
                      source={{ uri: attachment.url }}
                      style={styles.commentPhoto}
                      resizeMode="cover"
                    />
                  ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

CommunityPostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string,
    content: PropTypes.string.isRequired,
    category: PropTypes.string,
    content_type: PropTypes.string,
    poll_options: PropTypes.arrayOf(PropTypes.string),
    hashtags: PropTypes.arrayOf(PropTypes.string),
    pinned: PropTypes.bool,
    likes: PropTypes.number,
    comments_count: PropTypes.number,
    created_at: PropTypes.string
  }).isRequired,
  authorName: PropTypes.string,
  authorEmail: PropTypes.string,
  comments: PropTypes.arrayOf(PropTypes.object),
  commentsLoading: PropTypes.bool,
  bookmarked: PropTypes.bool,
  pollResults: PropTypes.object,
  onReact: PropTypes.func,
  onBookmark: PropTypes.func,
  onShare: PropTypes.func,
  onLoadComments: PropTypes.func,
  onAddComment: PropTypes.func,
  onPollVote: PropTypes.func
};

CommunityPostCard.defaultProps = {
  authorName: "Turcomp Team",
  authorEmail: "",
  comments: undefined,
  commentsLoading: false,
  bookmarked: false,
  pollResults: {},
  onReact: undefined,
  onBookmark: undefined,
  onShare: undefined,
  onLoadComments: undefined,
  onAddComment: undefined,
  onPollVote: undefined
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 4px 12px rgba(23, 32, 51, 0.06)",
    elevation: 2
  },
  pinnedCard: {
    borderColor: "#F4B740",
    backgroundColor: "#FFFDF7"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryDark,
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
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900"
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  badge: {
    backgroundColor: "#EAF7F2",
    borderRadius: 5,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "800"
  },
  typePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  typeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900"
  },
  pinnedLabel: {
    color: "#8A5A00",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
    marginBottom: 7
  },
  content: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  tag: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  tagText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  pollPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
    marginTop: 14,
    paddingTop: 14
  },
  pollOption: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative"
  },
  pollOptionSelected: {
    borderColor: colors.primary
  },
  pollBar: {
    backgroundColor: "#DFF4EA",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0
  },
  pollCopy: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 12,
    position: "relative"
  },
  pollText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  pollMeta: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900"
  },
  pollFooter: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  actionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  },
  iconButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  bookmarkedButton: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  iconButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  bookmarkedText: {
    color: colors.accentDark
  },
  expandedPanel: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    marginTop: 14,
    padding: 12
  },
  reactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  reactionChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  activeReactionChip: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  reactionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  activeReactionText: {
    color: colors.primary
  },
  commentComposer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  commentFields: {
    flex: 1,
    gap: 8
  },
  commentInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    flex: 1,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top"
  },
  photoInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: 13,
    minHeight: 42,
    paddingHorizontal: 12
  },
  commentButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: 12
  },
  disabledButton: {
    opacity: 0.55
  },
  commentButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  },
  commentMeta: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 8
  },
  commentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  commentAvatar: {
    alignItems: "center",
    backgroundColor: "#DDE7F3",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  commentAvatarText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "900"
  },
  commentBubble: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    flex: 1,
    padding: 10
  },
  commentAuthor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900"
  },
  commentContent: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3
  },
  commentPhoto: {
    backgroundColor: colors.background,
    borderRadius: 8,
    height: 150,
    marginTop: 8,
    width: "100%"
  }
});

export default CommunityPostCard;
