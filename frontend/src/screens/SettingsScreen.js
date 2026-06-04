import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import { updateUserProfile } from "../store/store";
import { colors, getInitials, joinList, splitCsv } from "../utils/helpers";

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [values, setValues] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    position: "",
    department_id: "",
    skills: "",
    notes: ""
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
      position: user?.position || "",
      department_id: user?.department_id ? String(user.department_id) : "",
      skills: joinList(user?.skills),
      notes: user?.notes || ""
    });
  }, [user]);

  const displayName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "Account";

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.first_name.trim()) nextErrors.first_name = "First name is required.";
    if (!values.last_name.trim()) nextErrors.last_name = "Last name is required.";
    if (!values.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!values.position.trim()) nextErrors.position = "Position is required.";
    if (!values.department_id.trim()) {
      nextErrors.department_id = "Department ID is required.";
    } else if (Number.isNaN(Number(values.department_id))) {
      nextErrors.department_id = "Department ID must be a number.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await dispatch(
        updateUserProfile({
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          phone: values.phone.trim(),
          position: values.position.trim(),
          department_id: Number(values.department_id),
          skills: splitCsv(values.skills),
          notes: values.notes.trim()
        })
      ).unwrap();
      Alert.alert("Account updated", "Your name has been saved.");
    } catch (_) {
      // The Redux error state renders under the form.
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.title}>{displayName}</Text>
          <Text style={styles.meta}>{user?.email}</Text>
          <Text style={styles.meta}>{user?.position || "No position set"}</Text>
          <Text style={styles.meta}>@{user?.username}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <FormInput
          label="First Name"
          value={values.first_name}
          error={errors.first_name}
          onChangeText={(value) => updateValue("first_name", value)}
        />
        <FormInput
          label="Last Name"
          value={values.last_name}
          error={errors.last_name}
          onChangeText={(value) => updateValue("last_name", value)}
        />
        <FormInput
          label="Phone Number"
          value={values.phone}
          error={errors.phone}
          keyboardType="phone-pad"
          onChangeText={(value) => updateValue("phone", value)}
        />
        <FormInput
          label="Position"
          value={values.position}
          error={errors.position}
          onChangeText={(value) => updateValue("position", value)}
        />
        <FormInput
          label="Department ID"
          value={values.department_id}
          error={errors.department_id}
          keyboardType="numeric"
          helperText="Use the numeric department ID."
          onChangeText={(value) => updateValue("department_id", value)}
        />
        <FormInput
          label="Skills"
          value={values.skills}
          helperText="Separate skills with commas."
          onChangeText={(value) => updateValue("skills", value)}
        />
        <FormInput
          label="Notes"
          value={values.notes}
          multiline
          onChangeText={(value) => updateValue("notes", value)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={loading}
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSave}
        >
          {loading ? <LoadingSpinner size="small" /> : <Text style={styles.primaryText}>Save Changes</Text>}
        </Pressable>
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
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginBottom: 16
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "900"
  },
  profileCopy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 14
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  disabledButton: {
    opacity: 0.7
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 15
  }
});

export default SettingsScreen;
