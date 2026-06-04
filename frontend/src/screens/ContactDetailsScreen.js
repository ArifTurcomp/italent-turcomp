import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  clearSelectedContact,
  deleteContact,
  fetchContactById,
  updateContact
} from "../store/store";
import { colors, formatDate, isEmail, joinList, splitCsv } from "../utils/helpers";

const makeForm = (contact = {}) => ({
  name: contact.name || "",
  email: contact.email || "",
  phone: contact.phone || "",
  position: contact.position || "",
  skills: joinList(contact.skills),
  notes: contact.notes || "",
  department_id: contact.department_id ? String(contact.department_id) : "",
  status: contact.status || "active"
});

const ContactDetailsScreen = ({ route, navigation }) => {
  const { contactId, edit } = route.params || {};
  const dispatch = useDispatch();
  const { selectedContact, loading, saving, error } = useSelector((state) => state.contacts);
  const [isEditing, setIsEditing] = useState(Boolean(edit));
  const [values, setValues] = useState(makeForm());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchContactById(contactId));
    return () => dispatch(clearSelectedContact());
  }, [contactId, dispatch]);

  useEffect(() => {
    if (selectedContact) setValues(makeForm(selectedContact));
  }, [selectedContact]);

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Name is required.";
    if (!isEmail(values.email)) nextErrors.email = "Enter a valid email address.";
    if (!values.position.trim()) nextErrors.position = "Position is required.";
    if (values.department_id && Number.isNaN(Number(values.department_id))) {
      nextErrors.department_id = "Department ID must be a number.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      position: values.position.trim(),
      skills: splitCsv(values.skills),
      notes: values.notes.trim(),
      department_id: values.department_id ? Number(values.department_id) : null,
      status: values.status
    };
    try {
      await dispatch(updateContact({ id: contactId, payload })).unwrap();
      setIsEditing(false);
    } catch (_) {
      // The Redux error state renders below the form.
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete contact", `Remove ${selectedContact?.name || "this contact"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(deleteContact(contactId)).unwrap();
            navigation.goBack();
          } catch (_) {
            // The Redux error state renders below the form.
          }
        }
      }
    ]);
  };

  if (loading && !selectedContact) {
    return <LoadingSpinner label="Loading contact" fullScreen />;
  }

  if (!selectedContact) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Contact not found</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{selectedContact.name}</Text>
            <Text style={styles.subtitle}>
              Updated {formatDate(selectedContact.updated_at || selectedContact.created_at)}
            </Text>
          </View>
          <Pressable style={styles.secondaryButton} onPress={() => setIsEditing((value) => !value)}>
            <Text style={styles.secondaryText}>{isEditing ? "Cancel" : "Edit"}</Text>
          </Pressable>
        </View>

        <FormInput
          label="Full Name"
          value={values.name}
          editable={isEditing}
          error={errors.name}
          onChangeText={(value) => updateValue("name", value)}
        />
        <FormInput
          label="Email"
          value={values.email}
          editable={isEditing}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(value) => updateValue("email", value)}
        />
        <FormInput
          label="Phone"
          value={values.phone}
          editable={isEditing}
          keyboardType="phone-pad"
          onChangeText={(value) => updateValue("phone", value)}
        />
        <FormInput
          label="Position"
          value={values.position}
          editable={isEditing}
          error={errors.position}
          onChangeText={(value) => updateValue("position", value)}
        />
        <FormInput
          label="Department ID"
          value={values.department_id}
          editable={isEditing}
          error={errors.department_id}
          keyboardType="number-pad"
          onChangeText={(value) => updateValue("department_id", value)}
        />
        <FormInput
          label="Skills"
          value={values.skills}
          editable={isEditing}
          helperText={isEditing ? "Separate skills with commas." : ""}
          onChangeText={(value) => updateValue("skills", value)}
        />
        <FormInput
          label="Notes"
          value={values.notes}
          editable={isEditing}
          multiline
          onChangeText={(value) => updateValue("notes", value)}
        />
        <FormInput
          label="Status"
          value={values.status}
          editable={isEditing}
          helperText={isEditing ? "Use active, inactive, or hired." : ""}
          onChangeText={(value) => updateValue("status", value)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isEditing ? (
          <Pressable
            disabled={saving}
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={handleSave}
          >
            {saving ? <LoadingSpinner size="small" /> : <Text style={styles.primaryText}>Save Changes</Text>}
          </Pressable>
        ) : null}

        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete Contact</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 18
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4
  },
  disabledButton: {
    opacity: 0.7
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 15
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface
  },
  secondaryText: {
    color: colors.primary,
    fontWeight: "900"
  },
  deleteButton: {
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 12
  },
  deleteText: {
    color: colors.danger,
    fontWeight: "900"
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
