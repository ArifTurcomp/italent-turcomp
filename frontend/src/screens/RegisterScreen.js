import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import TurcompLogo from "../components/TurcompLogo";
import { fetchDepartments, fetchPositions, registerUser } from "../store/store";
import { colors, isEmail, splitCsv } from "../utils/helpers";

const OptionGroup = ({ label, value, options, error, helperText, onChange }) => (
  <View style={styles.optionGroup}>
    <Text style={styles.optionLabel}>{label}</Text>
    <View style={styles.optionRow}>
      {options.map((option) => {
        const active = String(value) === String(option.value);
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            style={[styles.optionButton, active && styles.activeOptionButton]}
            onPress={() => onChange(String(option.value))}
          >
            <Text style={[styles.optionText, active && styles.activeOptionText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
  </View>
);

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const { items: departments, loading: departmentsLoading, error: departmentsError } = useSelector(
    (state) => state.departments
  );
  const { items: positions, loading: positionsLoading, error: positionsError } = useSelector(
    (state) => state.positions
  );
  const jobStatusOptions = [
  { label: "Open to opportunities", value: "open" },
  { label: "Open to work", value: "open_to_work" },
  { label: "Not looking", value: "not_looking" }
];

const toggleOptions = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" }
];

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
    confirmPassword: "",
    job_status: "open",
    offers_free_coaching: false,
    offers_free_counselling: false,
    requests_free_coaching: false,
    requests_free_counselling: false,
    terms_accepted: false
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchDepartments({ page: 1, per_page: 100 }));
    dispatch(fetchPositions());
  }, [dispatch]);

  useEffect(() => {
    if (!values.department_id && departments.length === 1) {
      setValues((current) => ({ ...current, department_id: String(departments[0].id) }));
    }
  }, [departments, values.department_id]);

  const groupOptions = departments.map((department) => ({
    label: department.name,
    value: String(department.id)
  }));
  const groupHelperText = departmentsLoading
    ? "Loading groups..."
    : departmentsError || (!groupOptions.length ? "No groups are available yet." : "");

  const [positionOpen, setPositionOpen] = useState(false);
  const [positionSearch, setPositionSearch] = useState("");
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const filteredPositions = useMemo(() => {
    if (!positionSearch.trim()) {
      return positions;
    }
    const search = positionSearch.trim().toLowerCase();
    return positions.filter((position) => position.toLowerCase().includes(search));
  }, [positionSearch, positions]);

  useEffect(() => {
    if (positionOpen) {
      setPositionSearch(values.position || "");
    }
  }, [positionOpen, values.position]);

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const selectedPositionLabel = useMemo(
    () => values.position || "Choose expertise / role",
    [values.position]
  );

  const toggleTermsAccepted = () => {
    setValues((current) => ({ ...current, terms_accepted: !current.terms_accepted }));
    setErrors((current) => ({ ...current, terms_accepted: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.first_name.trim()) nextErrors.first_name = "First name is required.";
    if (!values.last_name.trim()) nextErrors.last_name = "Last name is required.";
    if (!values.username.trim()) nextErrors.username = "Username is required.";
    if (!isEmail(values.email)) nextErrors.email = "Enter a valid email address.";
    if (!values.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!values.position.trim()) nextErrors.position = "Expertise or role is required.";
    if (!values.department_id.trim()) nextErrors.department_id = "Choose a group.";
    if (values.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Passwords must match.";
    }
    if (!values.terms_accepted) {
      nextErrors.terms_accepted = "You must accept the Terms & Conditions.";
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
          role: "user",
          job_status: values.job_status,
          offers_free_coaching: values.offers_free_coaching,
          offers_free_counselling: values.offers_free_counselling,
          requests_free_coaching: values.requests_free_coaching,
          requests_free_counselling: values.requests_free_counselling,
          terms_accepted: values.terms_accepted
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
        <View style={styles.optionGroup}>
          <Text style={styles.optionLabel}>Expertise / Role</Text>
          <Pressable
            style={[styles.selectInput, errors.position && styles.inputError]}
            onPress={() => setPositionOpen((current) => !current)}
          >
            <Text style={[styles.selectText, !values.position && styles.selectPlaceholder]}>
              {selectedPositionLabel}
            </Text>
          </Pressable>
          {positionOpen ? (
            <View style={styles.dropdownPanel}>
              <TextInput
                style={styles.dropdownSearch}
                placeholder="Search roles or type your own"
                placeholderTextColor={colors.muted}
                value={positionSearch}
                onChangeText={setPositionSearch}
                autoCapitalize="words"
              />
              {positionsLoading ? (
                <Text style={styles.dropdownPlaceholder}>Loading suggested roles...</Text>
              ) : filteredPositions.length > 0 ? (
                filteredPositions.map((position) => (
                  <Pressable
                    key={position}
                    style={styles.dropdownOption}
                    onPress={() => {
                      updateValue("position", position);
                      setPositionOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownOptionText}>{position}</Text>
                  </Pressable>
                ))
              ) : positionSearch.trim() ? (
                <Pressable
                  style={styles.dropdownOption}
                  onPress={() => {
                    updateValue("position", positionSearch.trim());
                    setPositionOpen(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>
                    Use "{positionSearch.trim()}"
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.dropdownPlaceholder}>No roles match yet. Type to add your own.</Text>
              )}
            </View>
          ) : null}
          {errors.position ? <Text style={styles.fieldError}>{errors.position}</Text> : null}
          <Text style={styles.helper}>Choose a suggested role or type your own expertise.</Text>
        </View>
        <OptionGroup
          label="Group"
          value={values.department_id}
          error={errors.department_id}
          helperText={groupHelperText}
          options={groupOptions}
          onChange={(value) => updateValue("department_id", value)}
        />
        <OptionGroup
          label="Job Status"
          value={values.job_status}
          options={jobStatusOptions}
          onChange={(value) => updateValue("job_status", value)}
        />
        <OptionGroup
          label="Offer free coaching"
          value={String(values.offers_free_coaching)}
          options={toggleOptions}
          onChange={(value) => updateValue("offers_free_coaching", value === "true")}
        />
        <OptionGroup
          label="Offer free counselling"
          value={String(values.offers_free_counselling)}
          options={toggleOptions}
          onChange={(value) => updateValue("offers_free_counselling", value === "true")}
        />
        <OptionGroup
          label="Request free coaching"
          value={String(values.requests_free_coaching)}
          options={toggleOptions}
          onChange={(value) => updateValue("requests_free_coaching", value === "true")}
        />
        <OptionGroup
          label="Request free counselling"
          value={String(values.requests_free_counselling)}
          options={toggleOptions}
          onChange={(value) => updateValue("requests_free_counselling", value === "true")}
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
        <View style={styles.termsRow}>
          <Pressable
            style={[styles.checkbox, values.terms_accepted && styles.checkboxChecked]}
            onPress={toggleTermsAccepted}
          >
            {values.terms_accepted ? <Text style={styles.checkboxMark}>✓</Text> : null}
          </Pressable>
          <Text style={styles.termsText}>
            I accept the{' '}
            <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>
              Terms & Conditions
            </Text>
            .
          </Text>
        </View>
        {errors.terms_accepted ? (
          <Text style={styles.fieldError}>{errors.terms_accepted}</Text>
        ) : null}
        <Modal visible={termsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <Text style={styles.modalText}>
                  By registering, you agree to use iTalent respectfully and to follow our community guidelines.
                  Your profile and expertise are shared with the community, while private contact details remain hidden unless you choose to share them.
                  Please contact the platform administrator if you have questions about privacy, account usage, or appropriate behaviour.
                </Text>
              </ScrollView>
              <Pressable style={[styles.primaryButton, styles.modalButton]} onPress={() => setTermsModalVisible(false)}>
                <Text style={styles.primaryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

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
  optionGroup: {
    marginBottom: 14
  },
  optionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  selectInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center"
  },
  selectText: {
    color: colors.text,
    fontSize: 14
  },
  selectPlaceholder: {
    color: colors.muted
  },
  inputError: {
    borderColor: colors.danger
  },
  dropdownPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
    overflow: "hidden"
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  dropdownOptionText: {
    color: colors.text,
    fontSize: 14
  },
  dropdownSearch: {
    minHeight: 46,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  dropdownPlaceholder: {
    color: colors.muted,
    padding: 12
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  suggestionButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  suggestionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  checkboxChecked: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  checkboxMark: {
    color: colors.primary,
    fontWeight: "900"
  },
  termsText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: "underline"
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
  modalBody: {
    maxHeight: 280,
    marginBottom: 18
  },
  modalBodyContent: {
    paddingBottom: 8
  },
  modalText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  optionButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  activeOptionButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  optionText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  activeOptionText: {
    color: colors.primary
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 5
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5
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
