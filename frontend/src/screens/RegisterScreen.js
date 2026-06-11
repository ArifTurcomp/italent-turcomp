import React, { useState } from "react";
import {
  Alert,
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
import TurcompLogo from "../components/TurcompLogo";
import { registerUser } from "../store/store";
import { colors, isEmail, splitCsv } from "../utils/helpers";

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [values, setValues] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    position: "",
    department_id: "",
    skills: "",
    notes: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState({});

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.first_name.trim()) nextErrors.first_name = "First name is required.";
    if (!values.last_name.trim()) nextErrors.last_name = "Last name is required.";
    if (!values.username.trim()) nextErrors.username = "Username is required.";
    if (!isEmail(values.email)) nextErrors.email = "Enter a valid email address.";
    if (!values.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!values.position.trim()) nextErrors.position = "Expertise or role is required.";
    if (!values.department_id.trim()) {
      nextErrors.department_id = "Group ID is required.";
    } else if (Number.isNaN(Number(values.department_id))) {
      nextErrors.department_id = "Group ID must be a number.";
    }
    if (values.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Passwords must match.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const result = await dispatch(
        registerUser({
          username: values.username.trim(),
          email: values.email.trim().toLowerCase(),
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          phone: values.phone.trim(),
          position: values.position.trim(),
          department_id: Number(values.department_id),
          skills: splitCsv(values.skills),
          notes: values.notes.trim(),
          password: values.password,
          role: "user"
        })
      ).unwrap();

      if (!result.access_token) {
        Alert.alert("Account created", "You can now sign in with your new account.");
        navigation.navigate("Login");
      }
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
        <TurcompLogo />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the community to share expertise, mentorship, coaching, and topics you care about.</Text>

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
          label="Username"
          value={values.username}
          error={errors.username}
          autoCapitalize="none"
          onChangeText={(value) => updateValue("username", value)}
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
          label="Phone Number (private)"
          value={values.phone}
          error={errors.phone}
          keyboardType="phone-pad"
          helperText="Stored for account follow-up only; phone numbers are not shown on public cards."
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
          keyboardType="numeric"
          helperText="Use the numeric group ID."
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
        <FormInput
          label="Password"
          value={values.password}
          error={errors.password}
          secureTextEntry
          onChangeText={(value) => updateValue("password", value)}
        />
        <FormInput
          label="Confirm Password"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          secureTextEntry
          onChangeText={(value) => updateValue("confirmPassword", value)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={loading}
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
        >
          {loading ? <LoadingSpinner size="small" /> : <Text style={styles.primaryText}>Register</Text>}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>Back to sign in</Text>
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
    padding: 20,
    paddingTop: 32
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 12
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    marginTop: 8
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
  },
  linkButton: {
    alignItems: "center",
    marginTop: 18
  },
  linkText: {
    color: colors.primary,
    fontWeight: "800"
  }
});

export default RegisterScreen;
