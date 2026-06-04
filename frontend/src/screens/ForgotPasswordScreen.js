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
import { colors, isEmail } from "../utils/helpers";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setMessage("");
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await api.auth.requestPasswordReset({
        email: email.trim().toLowerCase()
      });
      setMessage(result.message || "If that email is registered, a reset token has been sent.");
    } catch (requestError) {
      setError(requestError.message);
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
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your registered email and use the token sent to your inbox.</Text>

        <FormInput
          label="Email"
          value={email}
          error={error}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            setError("");
          }}
        />

        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={loading}
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
        >
          {loading ? <LoadingSpinner size="small" /> : <Text style={styles.primaryText}>Send Reset Token</Text>}
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.navigate("ResetPassword")}
        >
          <Text style={styles.linkText}>I have a reset token</Text>
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

export default ForgotPasswordScreen;
