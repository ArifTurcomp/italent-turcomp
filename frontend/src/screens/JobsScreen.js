import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../components/FormInput";
import JobCard from "../components/JobCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { createJob, fetchJobs } from "../store/store";
import { colors, splitCsv } from "../utils/helpers";

const getPeopleSearchTerm = (job) => {
  const focusAreas = Array.isArray(job.requirements)
    ? job.requirements
    : String(job.requirements || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  return focusAreas[0] || job.title || "";
};

const JobsScreen = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { items, loading, saving, error } = useSelector((state) => state.jobs);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState({
    title: "",
    department_id: "",
    requirements: "",
    description: ""
  });

  useEffect(() => {
    dispatch(fetchJobs({ page: 1, per_page: 50 }));
  }, [dispatch]);

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const createOffer = async () => {
    if (!values.title.trim() || !values.description.trim()) return;
    try {
      await dispatch(
        createJob({
          title: values.title.trim(),
          description: values.description.trim(),
          requirements: splitCsv(values.requirements),
          department_id: values.department_id ? Number(values.department_id) : null,
          status: "open"
        })
      ).unwrap();
      setValues({ title: "", department_id: "", requirements: "", description: "" });
      setShowForm(false);
    } catch (_) {
      // The Redux error state renders below the form.
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Mentorship & Coaching</Text>
          <Text style={styles.subtitle}>Create mentorship or coaching offers and match them with people by expertise.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setShowForm((value) => !value)}>
          <Text style={styles.addButtonText}>{showForm ? "Close" : "Create"}</Text>
        </Pressable>
      </View>

      {showForm ? (
        <View style={styles.formCard}>
          <FormInput label="Offer Title" value={values.title} onChangeText={(value) => updateValue("title", value)} />
          <FormInput
            label="Group ID"
            value={values.department_id}
            keyboardType="number-pad"
            onChangeText={(value) => updateValue("department_id", value)}
          />
          <FormInput
            label="Focus Areas"
            value={values.requirements}
            helperText="Separate expertise, coaching topics, or interests with commas."
            onChangeText={(value) => updateValue("requirements", value)}
          />
          <FormInput
            label="Offer Details"
            value={values.description}
            multiline
            onChangeText={(value) => updateValue("description", value)}
          />
          <Pressable disabled={saving} style={styles.primaryButton} onPress={createOffer}>
            <Text style={styles.primaryText}>{saving ? "Posting..." : "Post Offer"}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && items.length === 0 ? <LoadingSpinner label="Loading offers" /> : null}
      {items.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onFindPeople={() =>
            onNavigate?.("Contacts", { search: getPeopleSearchTerm(job) })
          }
        />
      ))}
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
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12
  },
  headerCopy: {
    flex: 1
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
    marginTop: 4
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11
  },
  addButtonText: {
    color: colors.surface,
    fontWeight: "900"
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "900"
  },
  error: {
    color: colors.danger,
    marginBottom: 10
  }
});

export default JobsScreen;
