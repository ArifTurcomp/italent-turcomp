import PropTypes from "prop-types";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, joinList } from "../utils/helpers";

/**
 * Displays a job offering with department, status, and requirements.
 */
const JobCard = ({ job }) => {
  const department = job.department?.name || job.department || "Unassigned";
  const requirements = joinList(job.requirements);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.department}>{department}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{job.status || "open"}</Text>
        </View>
      </View>
      <Text style={styles.description}>{job.description}</Text>
      {requirements ? <Text style={styles.requirements}>Required: {requirements}</Text> : null}
      <Pressable style={styles.matchButton}>
        <Text style={styles.matchText}>Find Matches</Text>
      </Pressable>
    </View>
  );
};

JobCard.propTypes = {
  job: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    requirements: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
    department: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    status: PropTypes.string
  }).isRequired
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  department: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3
  },
  badge: {
    backgroundColor: "#E1F5EE",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  badgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  description: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12
  },
  requirements: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10
  },
  matchButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12
  },
  matchText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  }
});

export default JobCard;
