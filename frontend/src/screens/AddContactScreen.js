import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import { createContact } from "../store/store";
import { colors, isEmail, splitCsv } from "../utils/helpers";

const initialValues = {
  name: "",
  email: "",
  phone: "",
  position: "",
  skills: "",
  notes: "",
  department_id: "",
  status: "active"
};

const AddContactScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { saving, error } = useSelector((state) => state.contacts);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Name is required.";
    if (!isEmail(values.email)) nextErrors.email = "Enter a valid email address.";
    if (!values.position.trim()) nextErrors.position = "Expertise or role is required.";
    if (values.department_id && Number.isNaN(Number(values.department_id))) {
      nextErrors.department_id = "Group ID must be a number.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
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
      const created = await dispatch(createContact(payload)).unwrap();
      navigation.replace("ContactDetails", { contactId: created.id });
    } catch (_) {
      // The Redux error state renders below the form.
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Person</Text>
        <Text style={styles.subtitle}>Create a community profile for mentorship, coaching, and expertise sharing.</Text>

        <FormInput
          label="Full Name"
          value={values.name}
          error={errors.name}
          onChangeText={(value) => updateValue("name", value)}
        />
        <FormInput
          label="Email"
          value={values.email}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(value) => updateValue("email", value)}
        />
        <FormInput
          label="Phone (private)"
          value={values.phone}
          keyboardType="phone-pad"
          helperText="Stored for follow-up only; phone numbers are not shown on public cards."
          onChangeText={(value) => updateValue("phone", value)}
        />
        <FormInput
          label="Expertise / Role"
          value={values.position}
          error={errors.position}
          onChangeText={(value) => updateValue("position", value)}
        />
        <FormInput
          label="Group ID"
          value={values.department_id}
          error={errors.department_id}
          keyboardType="number-pad"
          helperText="Use the numeric group ID from the backend."
          onChangeText={(value) => updateValue("department_id", value)}
        />
        <FormInput
          label="Expertise Tags"
          value={values.skills}
          helperText="Separate expertise, coaching topics, or interests with commas."
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
          disabled={saving}
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={handleSubmit}
        >
          {saving ? <LoadingSpinner size="small" /> : <Text style={styles.primaryText}>Create Profile</Text>}
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
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    marginTop: 6
  },
  error: {
    color: colors.danger,
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

export default AddContactScreen;
