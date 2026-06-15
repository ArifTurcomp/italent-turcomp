import PropTypes from "prop-types";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, getInitials, joinList } from "../utils/helpers";

/**
 * Displays a contact summary with optional view/edit/delete actions.
 */
const getDisplayName = (contact) =>
  contact.name ||
  `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
  contact.username ||
  "Community Member";

const getConnectionAction = (contact) => {
  if (contact.connection_status === "accepted") {
    return { label: "Friends", disabled: true };
  }
  if (contact.connection_status === "pending" && contact.connection_direction === "outgoing") {
    return { label: "Requested", disabled: true };
  }
  if (contact.connection_status === "pending" && contact.connection_direction === "incoming") {
    return { label: "Accept", action: "accept" };
  }
  return { label: "Add Friend", action: "connect" };
};

const ContactCard = ({ contact, onPress, onEdit, onDelete, onConnect, onAccept, connectionSaving }) => {
  const status = contact.status || "active";
  const department = contact.department?.name || contact.department || contact.dept || "Unassigned";
  const skills = joinList(contact.skills);
  const maritalStatus = contact.marital_status || "single";
  const name = getDisplayName(contact);
  const connectionAction = getConnectionAction(contact);
  const handleConnectionPress =
    connectionAction.action === "accept" ? onAccept : onConnect;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.position} numberOfLines={1}>
            {contact.position || department}
          </Text>
        </View>
        <View style={[styles.badge, status === "hired" && styles.badgeSuccess]}>
          <Text style={[styles.badgeText, status === "hired" && styles.badgeSuccessText]}>
            {status}
          </Text>
        </View>
      </View>

      <Text style={styles.meta} numberOfLines={1}>
        {department} | {contact.email || "No email"}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        Marital status: {maritalStatus}
      </Text>
      {skills ? <Text style={styles.skills} numberOfLines={2}>Expertise: {skills}</Text> : null}
      {contact.hiring_personality_test ? (
        <Text style={styles.personality} numberOfLines={2}>
          Hiring personality: {contact.hiring_personality_test}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {handleConnectionPress ? (
          <Pressable
            disabled={connectionSaving || connectionAction.disabled}
            style={[
              styles.actionButton,
              styles.connectButton,
              (connectionSaving || connectionAction.disabled) && styles.disabledButton
            ]}
            onPress={handleConnectionPress}
          >
            <Text style={[styles.actionText, styles.connectText]}>
              {connectionSaving ? "Saving..." : connectionAction.label}
            </Text>
          </Pressable>
        ) : null}
        {onEdit ? (
          <Pressable style={styles.actionButton} onPress={onEdit}>
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
};

ContactCard.propTypes = {
  contact: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    username: PropTypes.string,
    first_name: PropTypes.string,
    last_name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    position: PropTypes.string,
    marital_status: PropTypes.string,
    hiring_personality_test: PropTypes.string,
    department: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    dept: PropTypes.string,
    skills: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    status: PropTypes.string,
    connection_status: PropTypes.string,
    connection_direction: PropTypes.string
  }).isRequired,
  onPress: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onConnect: PropTypes.func,
  onAccept: PropTypes.func,
  connectionSaving: PropTypes.bool
};

ContactCard.defaultProps = {
  onPress: undefined,
  onEdit: undefined,
  onDelete: undefined,
  onConnect: undefined,
  onAccept: undefined,
  connectionSaving: false
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12
  },
  pressed: {
    opacity: 0.82
  },
  header: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  avatarText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800"
  },
  identity: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  position: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeSuccess: {
    backgroundColor: "#E1F5EE"
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  badgeSuccessText: {
    color: colors.success
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 12
  },
  skills: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6
  },
  personality: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12
  },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface
  },
  deleteButton: {
    borderColor: "#F1B8B2"
  },
  connectButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  disabledButton: {
    opacity: 0.6
  },
  actionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  connectText: {
    color: colors.primary
  },
  deleteText: {
    color: colors.danger
  }
});

export default ContactCard;
