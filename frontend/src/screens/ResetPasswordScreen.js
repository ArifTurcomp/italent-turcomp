import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import TurcompLogo from "../components/TurcompLogo";
import api from "../services/api";
import { colors } from "../utils/helpers";

const ResetPasswordScreen = ({ navigation }) => {
  const [values, setValues] = useState({
    token: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.token.trim()) nextErrors.token = "Reset token is required.";
    if (values.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Passwords must match.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    setMessage("");
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await api.auth.confirmPasswordReset({
        token: values.token.trim(),
        password: values.password
      });
      setMessage(result.message || "Password has been reset. You can now sign in.");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.panel}>
        <TurcompLogo />
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Paste the reset token from your email and choose a new password.</Text>

        <FormInput
          label="Reset Token"
          value={values.token}
          error={errors.token}
          autoCapitalize="none"
          onChangeText={(value) => updateValue("token", value)}
        />
        <FormInput
          label="New Password"
          value={values.password}
          error={errors.password}
          secureTextEntry
          onChangeText={(value) => updateValue("password", value)}
        />
        <FormInput
          label="Confirm New Password"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          secureTextEntry
          onChangeText={(value) => updateValue("confirmPassword", value)}
        />

        {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={loading}
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
        >
          {loading ? <LoadingSpinner size="small" /> : <Text style={styles.primaryText}>Reset Password</Text>}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: 20
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20
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
    fontSize: 13,
    marginBottom: 12
  },
  success: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
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

export default ResetPasswordScreen;
