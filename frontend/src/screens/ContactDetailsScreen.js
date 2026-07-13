import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  adminUpdateUserRole,
  adminUpdateUserStatus,
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

const BooleanProfileRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value ? "Yes" : "No"}</Text>
  </View>
);

const ContactDetailsScreen = ({ route }) => {
  const { contactId } = route.params || {};
  const dispatch = useDispatch();
  const { selectedContact, loading, error } = useSelector((state) => state.contacts);
  const currentUser = useSelector((state) => state.auth.user);
  const [connectionSaving, setConnectionSaving] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminStatus, setAdminStatus] = useState("active");
  const [adminRole, setAdminRole] = useState("user");
  const [adminMessage, setAdminMessage] = useState("");

  useEffect(() => {
    dispatch(fetchContactById(contactId));
    return () => dispatch(clearSelectedContact());
  }, [contactId, dispatch]);

  useEffect(() => {
    if (selectedContact) {
      setAdminStatus(selectedContact.status || "active");
      setAdminRole(selectedContact.role || "user");
      setAdminMessage("");
    }
  }, [selectedContact]);

  const closeAdminModal = () => setAdminModalVisible(false);

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

  const saveAdminChanges = async () => {
    if (!selectedContact) return;
    setAdminMessage("");
    try {
      if (adminStatus !== selectedContact.status) {
        await dispatch(
          adminUpdateUserStatus({ id: selectedContact.id, status: adminStatus })
        ).unwrap();
      }
      if (adminRole !== selectedContact.role) {
        await dispatch(adminUpdateUserRole({ id: selectedContact.id, role: adminRole })).unwrap();
      }
      setAdminMessage("Saved changes successfully.");
    } catch (error) {
      setAdminMessage(error || "Failed to save changes.");
    }
  };

  if (currentUser && currentUser.role !== "admin") {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Admin profile access only</Text>
        <Text style={styles.emptyCopy}>Only administrator accounts can view detailed member profiles.</Text>
      </View>
    );
  }

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
      {currentUser?.role === "admin" ? (
        <Pressable style={styles.adminButton} onPress={() => setAdminModalVisible(true)}>
          <Text style={styles.adminButtonText}>Admin profile details</Text>
        </Pressable>
      ) : null}
      <Modal visible={adminModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin profile details</Text>
            <Text style={styles.modalLabel}>Account status</Text>
            <View style={styles.optionRow}>
              {[
                { label: "Active", value: "active" },
                { label: "Suspended", value: "suspended" },
                { label: "Inactive", value: "inactive" }
              ].map((option) => {
                const active = adminStatus === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.optionButton, active && styles.activeOptionButton]}
                    onPress={() => setAdminStatus(option.value)}
                  >
                    <Text style={[styles.optionText, active && styles.activeOptionText]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.modalLabel}>Role</Text>
            <View style={styles.optionRow}>
              {[
                { label: "User", value: "user" },
                { label: "Admin", value: "admin" },
                { label: "Moderator", value: "moderator" }
              ].map((option) => {
                const active = adminRole === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.optionButton, active && styles.activeOptionButton]}
                    onPress={() => setAdminRole(option.value)}
                  >
                    <Text style={[styles.optionText, active && styles.activeOptionText]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.modalLabel}>Job status</Text>
            <Text style={styles.modalValue}>{selectedContact.job_status || "not_specified"}</Text>
            <Text style={styles.modalLabel}>Offers free coaching</Text>
            <Text style={styles.modalValue}>{selectedContact.offers_free_coaching ? "Yes" : "No"}</Text>
            <Text style={styles.modalLabel}>Offers free counselling</Text>
            <Text style={styles.modalValue}>{selectedContact.offers_free_counselling ? "Yes" : "No"}</Text>
            <Text style={styles.modalLabel}>Requests free coaching</Text>
            <Text style={styles.modalValue}>{selectedContact.requests_free_coaching ? "Yes" : "No"}</Text>
            <Text style={styles.modalLabel}>Requests free counselling</Text>
            <Text style={styles.modalValue}>{selectedContact.requests_free_counselling ? "Yes" : "No"}</Text>
            {adminMessage ? <Text style={styles.adminMessage}>{adminMessage}</Text> : null}
            <Pressable
              accessibilityRole="button"
              style={[styles.primaryButton, styles.modalButton]}
              onPress={saveAdminChanges}
            >
              <Text style={styles.primaryText}>Save admin changes</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, styles.modalButton, styles.cancelButton]} onPress={closeAdminModal}>
              <Text style={[styles.primaryText, styles.cancelText]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
        <BooleanProfileRow label="Offers free coaching" value={selectedContact.offers_free_coaching} />
        <BooleanProfileRow label="Offers free counselling" value={selectedContact.offers_free_counselling} />
        <BooleanProfileRow label="Requests free coaching" value={selectedContact.requests_free_coaching} />
        <BooleanProfileRow label="Requests free counselling" value={selectedContact.requests_free_counselling} />
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
  adminButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.primarySoft,
    marginBottom: 14,
    alignItems: "center"
  },
  adminButtonText: {
    color: colors.primary,
    fontWeight: "900"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  modalLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10
  },
  modalValue: {
    color: colors.text,
    fontSize: 15,
    marginTop: 2
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8
  },
  activeOptionButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  optionText: {
    color: colors.text,
    fontWeight: "700"
  },
  activeOptionText: {
    color: colors.surface
  },
  adminMessage: {
    color: colors.success,
    marginTop: 10,
    marginBottom: 12
  },
  modalButton: {
    marginTop: 8
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1
  },
  cancelText: {
    color: colors.danger
  },
  empty: {
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
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: 14,
    paddingHorizontal: 12,
    textAlign: "center"
  }
});

export default ContactDetailsScreen;
