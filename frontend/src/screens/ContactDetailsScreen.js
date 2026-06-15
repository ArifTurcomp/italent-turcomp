import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  clearSelectedContact,
  fetchContactById,
  respondConnectionRequest,
  sendConnectionRequest
} from "../store/store";
import { colors, formatDate, joinList } from "../utils/helpers";

const displayName = (person = {}) =>
  person.name ||
  `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
  person.username ||
  "Community Member";

const connectionAction = (person = {}) => {
  if (person.connection_status === "accepted") {
    return { label: "Friends", disabled: true };
  }
  if (person.connection_status === "pending" && person.connection_direction === "outgoing") {
    return { label: "Requested", disabled: true };
  }
  if (person.connection_status === "pending" && person.connection_direction === "incoming") {
    return { label: "Accept Friend" };
  }
  return { label: "Add Friend" };
};

const ProfileRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const ContactDetailsScreen = ({ route }) => {
  const { contactId } = route.params || {};
  const dispatch = useDispatch();
  const { selectedContact, loading, error } = useSelector((state) => state.contacts);
  const currentUser = useSelector((state) => state.auth.user);
  const [connectionSaving, setConnectionSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchContactById(contactId));
    return () => dispatch(clearSelectedContact());
  }, [contactId, dispatch]);

  const handleConnection = async () => {
    if (!selectedContact || selectedContact.id === currentUser?.id) return;
    const action = connectionAction(selectedContact);
    if (action.disabled) return;

    setConnectionSaving(true);
    try {
      if (selectedContact.connection_direction === "incoming" && selectedContact.connection_id) {
        await dispatch(
          respondConnectionRequest({
            id: selectedContact.connection_id,
            status: "accepted"
          })
        ).unwrap();
      } else {
        await dispatch(sendConnectionRequest({ recipient_id: selectedContact.id })).unwrap();
      }
    } catch (_) {
      // The Redux error state renders below the profile header.
    } finally {
      setConnectionSaving(false);
    }
  };

  if (loading && !selectedContact) {
    return <LoadingSpinner label="Loading profile" fullScreen />;
  }

  if (!selectedContact) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Profile not found</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  const name = displayName(selectedContact);
  const skills = joinList(selectedContact.skills);
  const action = connectionAction(selectedContact);
  const canConnect = selectedContact.id !== currentUser?.id;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("") || "IT"}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>{selectedContact.position || "Registered member"}</Text>
          <Text style={styles.meta}>
            Joined {formatDate(selectedContact.created_at)}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {canConnect ? (
        <Pressable
          disabled={connectionSaving || action.disabled}
          style={[
            styles.primaryButton,
            (connectionSaving || action.disabled) && styles.disabledButton
          ]}
          onPress={handleConnection}
        >
          <Text style={styles.primaryText}>
            {connectionSaving ? "Saving..." : action.label}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Profile</Text>
        <ProfileRow label="Email" value={selectedContact.email} />
        <ProfileRow label="Group" value={selectedContact.department || "Unassigned"} />
        <ProfileRow label="Expertise" value={skills} />
        <ProfileRow label="Marital Status" value={selectedContact.marital_status} />
        <ProfileRow label="Bio" value={selectedContact.bio} />
        <ProfileRow label="Notes" value={selectedContact.notes} />
        <ProfileRow label="Portfolio" value={selectedContact.portfolio_url} />
        <ProfileRow label="Resume" value={selectedContact.resume_url} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },
  avatarText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: "900"
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },
  disabledButton: {
    opacity: 0.6
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 15
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4
  },
  infoRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 12
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 5
  },
  error: {
    color: colors.danger,
    marginBottom: 12
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: 24
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  }
});

export default ContactDetailsScreen;
