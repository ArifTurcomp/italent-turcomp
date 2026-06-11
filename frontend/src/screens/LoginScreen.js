import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import TurcompLogo from "../components/TurcompLogo";
import { loginUser } from "../store/store";
import { colors, isEmail } from "../utils/helpers";

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!isEmail(values.email)) nextErrors.email = "Enter a valid email address.";
    if (!values.password || values.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await dispatch(
      loginUser({
        email: values.email.trim().toLowerCase(),
        password: values.password
      })
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.panel}>
        <TurcompLogo />
        <Text style={styles.brand}>iTalent</Text>
        <Text style={styles.subtitle}>Sign in to join the community, find expertise, and share mentorship or coaching.</Text>

        <FormInput
          label="Email"
          value={values.email}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={(value) => updateValue("email", value)}
        />
        <FormInput
          label="Password"
          value={values.password}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          onChangeText={(value) => updateValue("password", value)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={loading}
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
        >
          {loading ? <LoadingSpinner size="small" /> : <Text style={styles.primaryText}>Sign In</Text>}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.linkText}>Create an account</Text>
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
  brand: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10
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

export default LoginScreen;
