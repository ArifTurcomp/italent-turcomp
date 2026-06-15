import React, { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCommunityPosts,
  fetchContacts,
  fetchDepartments,
  fetchJobs
} from "../store/store";
import { colors, formatDate } from "../utils/helpers";

const StatCard = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const DashboardScreen = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const contacts = useSelector((state) => state.contacts);
  const departments = useSelector((state) => state.departments.items);
  const jobs = useSelector((state) => state.jobs);
  const communityState = useSelector((state) => state.community);
  const community = communityState.posts;

  useEffect(() => {
    dispatch(fetchContacts({ page: 1, per_page: 20 }));
    dispatch(fetchDepartments({ page: 1, per_page: 20 }));
    dispatch(fetchJobs({ page: 1, per_page: 20 }));
    dispatch(fetchCommunityPosts({ page: 1, per_page: 20 }));
  }, [dispatch]);

  const openOffers = jobs.pagination.total || jobs.items.filter((job) => (job.status || "open") === "open").length;
  const groupMemberTotal = departments.reduce(
    (total, department) => total + (department.members_count || 0),
    0
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Turcomp iTalent Community</Text>
        <Text style={styles.heroText}>
          Find people by expertise, share public topics, and connect through mentorship or coaching.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Registered People" value={contacts.pagination.total || contacts.items.length} />
        <StatCard label="Groups" value={departments.length} />
        <StatCard label="Group Members" value={groupMemberTotal || contacts.pagination.total || contacts.items.length} />
        <StatCard label="Mentorship & Coaching" value={openOffers} />
        <StatCard label="Community Posts" value={communityState.pagination.total || community.length} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Groups</Text>
          <Pressable onPress={() => onNavigate("Departments")}>
            <Text style={styles.link}>View all</Text>
          </Pressable>
        </View>
        {departments.slice(0, 4).map((department) => (
          <View key={department.id} style={styles.departmentRow}>
            <View style={styles.departmentCopy}>
              <Text style={styles.rowTitle}>{department.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={2}>
                {department.description || "No description"}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {department.members_count || contacts.items.filter((item) => item.department_id === department.id).length}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable onPress={() => onNavigate("Community")}>
            <Text style={styles.link}>Community</Text>
          </Pressable>
        </View>
        {community.slice(0, 3).map((post) => (
          <View key={post.id} style={styles.activityRow}>
            <Text style={styles.rowTitle}>{post.category || "General"}</Text>
            <Text style={styles.rowMeta} numberOfLines={2}>
              {post.content}
            </Text>
            <Text style={styles.time}>{formatDate(post.created_at)}</Text>
          </View>
        ))}
      </View>
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
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 20,
    marginBottom: 16
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "900"
  },
  heroText: {
    color: colors.primarySoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    minHeight: 92
  },
  statValue: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6
  },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  link: {
    color: colors.primary,
    fontWeight: "900"
  },
  departmentRow: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  departmentCopy: {
    flex: 1,
    minWidth: 0
  },
  activityRow: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexShrink: 0,
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center"
  },
  countText: {
    color: colors.surface,
    fontWeight: "900"
  },
  time: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 6
  }
});

export default DashboardScreen;
