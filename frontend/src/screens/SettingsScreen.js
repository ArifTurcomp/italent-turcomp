import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import { fetchDepartments, updateUserProfile } from "../store/store";
import { colors, getInitials, joinList, splitCsv } from "../utils/helpers";

const maritalStatusOptions = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" }
];

const visibilityOptions = [
  { label: "Public", value: "public" },
  { label: "Private", value: "private" }
];

const jobStatusOptions = [
  { label: "Open to opportunities", value: "open" },
  { label: "Not looking", value: "not_looking" },
  { label: "Working", value: "working" },
  { label: "Seeking mentorship", value: "seeking_mentorship" }
];

const toggleOptions = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" }
];

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

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);
  const { items: departments, loading: departmentsLoading } = useSelector((state) => state.departments);
  const [values, setValues] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    position: "",
    marital_status: "single",
    job_status: "not_specified",
    offers_free_coaching: false,
    offers_free_counselling: false,
    requests_free_coaching: false,
    requests_free_counselling: false,
    department_id: "",
    skills: "",
    notes: "",
    bio: "",
    profile_picture: "",
    cover_photo: "",
    portfolio_url: "",
    resume_url: "",
    location: "",
    linkedin_url: "",
    website_url: "",
    profile_visibility: "public"
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchDepartments({ page: 1, per_page: 100 }));
  }, [dispatch]);

  useEffect(() => {
    setValues({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
      position: user?.position || "",
      marital_status: user?.marital_status || "single",
      department_id: user?.department_id ? String(user.department_id) : "",
      skills: joinList(user?.skills),
      notes: user?.notes || "",
      bio: user?.bio || "",
      job_status: user?.job_status || "not_specified",
      offers_free_coaching: Boolean(user?.offers_free_coaching),
      offers_free_counselling: Boolean(user?.offers_free_counselling),
      requests_free_coaching: Boolean(user?.requests_free_coaching),
      requests_free_counselling: Boolean(user?.requests_free_counselling),
      profile_picture: user?.profile_picture || "",
      cover_photo: user?.cover_photo || "",
      portfolio_url: user?.portfolio_url || "",
      resume_url: user?.resume_url || "",
      location: user?.contact_info?.location || "",
      linkedin_url: user?.contact_info?.linkedin_url || "",
      website_url: user?.contact_info?.website_url || "",
      profile_visibility: user?.privacy_settings?.profile_visibility || "public"
    });
  }, [user]);

  const displayName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "Account";
  const groupOptions = departments.map((department) => ({
    label: department.name,
    value: String(department.id)
  }));
  const hasSelectedGroup = groupOptions.some(
    (option) => option.value === String(values.department_id)
  );
  const visibleGroupOptions =
    values.department_id && !hasSelectedGroup
      ? [
          { label: `Current group #${values.department_id}`, value: String(values.department_id) },
          ...groupOptions
        ]
      : groupOptions;

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.first_name.trim()) nextErrors.first_name = "First name is required.";
    if (!values.last_name.trim()) nextErrors.last_name = "Last name is required.";
    if (!values.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!values.position.trim()) nextErrors.position = "Expertise or role is required.";
    if (!["single", "married"].includes(values.marital_status.trim().toLowerCase())) {
      nextErrors.marital_status = "Use single or married.";
    }
    if (!["public", "private"].includes(values.profile_visibility.trim().toLowerCase())) {
      nextErrors.profile_visibility = "Use public or private.";
    }
    if (!values.department_id.trim()) {
      nextErrors.department_id = "Choose a group.";
    } else if (Number.isNaN(Number(values.department_id))) {
      nextErrors.department_id = "Choose a valid group.";
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
          marital_status: values.marital_status.trim().toLowerCase(),
          job_status: values.job_status,
          offers_free_coaching: values.offers_free_coaching,
          offers_free_counselling: values.offers_free_counselling,
          requests_free_coaching: values.requests_free_coaching,
          requests_free_counselling: values.requests_free_counselling,
          department_id: Number(values.department_id),
          skills: splitCsv(values.skills),
          notes: values.notes.trim(),
          bio: values.bio.trim(),
          profile_picture: values.profile_picture.trim(),
          cover_photo: values.cover_photo.trim(),
          portfolio_url: values.portfolio_url.trim(),
          resume_url: values.resume_url.trim(),
          contact_info: {
            ...(user?.contact_info || {}),
            location: values.location.trim(),
            linkedin_url: values.linkedin_url.trim(),
            website_url: values.website_url.trim()
          },
          privacy_settings: {
            ...(user?.privacy_settings || {}),
            profile_visibility: values.profile_visibility.trim().toLowerCase()
          }
        })
      ).unwrap();
      Alert.alert("Account updated", "Your settings have been saved.");
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
          <Text style={styles.meta}>{user?.position || "No expertise set"}</Text>
          <Text style={styles.meta}>Marital status: {user?.marital_status || "single"}</Text>
          <Text style={styles.meta}>
            Visibility: {user?.privacy_settings?.profile_visibility || "public"}
          </Text>
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
        <OptionGroup
          label="Marital Status"
          value={values.marital_status}
          error={errors.marital_status}
          options={maritalStatusOptions}
          onChange={(value) => updateValue("marital_status", value)}
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
        <OptionGroup
          label="Group"
          value={values.department_id}
          error={errors.department_id}
          helperText={departmentsLoading ? "Loading groups..." : ""}
          options={visibleGroupOptions}
          onChange={(value) => updateValue("department_id", value)}
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
          label="Bio"
          value={values.bio}
          multiline
          helperText="Short public introduction for your community profile."
          onChangeText={(value) => updateValue("bio", value)}
        />
        <FormInput
          label="Location"
          value={values.location}
          helperText="City, country, or remote region."
          onChangeText={(value) => updateValue("location", value)}
        />
        <FormInput
          label="LinkedIn URL"
          value={values.linkedin_url}
          autoCapitalize="none"
          onChangeText={(value) => updateValue("linkedin_url", value)}
        />
        <FormInput
          label="Website URL"
          value={values.website_url}
          autoCapitalize="none"
          onChangeText={(value) => updateValue("website_url", value)}
        />
        <FormInput
          label="Portfolio URL"
          value={values.portfolio_url}
          autoCapitalize="none"
          onChangeText={(value) => updateValue("portfolio_url", value)}
        />
        <FormInput
          label="Resume URL"
          value={values.resume_url}
          autoCapitalize="none"
          helperText="Used when applying to mentorship or coaching opportunities."
          onChangeText={(value) => updateValue("resume_url", value)}
        />
        <FormInput
          label="Profile Picture URL"
          value={values.profile_picture}
          autoCapitalize="none"
          onChangeText={(value) => updateValue("profile_picture", value)}
        />
        <FormInput
          label="Cover Photo URL"
          value={values.cover_photo}
          autoCapitalize="none"
          onChangeText={(value) => updateValue("cover_photo", value)}
        />
        <OptionGroup
          label="Profile Visibility"
          value={values.profile_visibility}
          error={errors.profile_visibility}
          options={visibilityOptions}
          onChange={(value) => updateValue("profile_visibility", value)}
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
