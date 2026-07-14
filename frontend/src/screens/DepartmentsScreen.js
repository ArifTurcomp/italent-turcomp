import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../components/FormInput";
import JobCard from "../components/JobCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { createJob, fetchContacts, fetchDepartments, fetchJobs } from "../store/store";
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

const DepartmentsScreen = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { items: departments, loading: departmentsLoading, error: departmentsError } = useSelector(
    (state) => state.departments
  );
  const contacts = useSelector((state) => state.contacts.items);
  const { items: jobs, loading: jobsLoading, saving, error: jobsError } = useSelector((state) => state.jobs);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState({
    title: "",
    department_id: "",
    requirements: "",
    description: ""
  });

  useEffect(() => {
    dispatch(fetchDepartments({ page: 1, per_page: 50 }));
    dispatch(fetchContacts({ page: 1, per_page: 100 }));
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

  if (departmentsLoading && departments.length === 0) {
    return <LoadingSpinner label="Loading groups" fullScreen />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Groups & Mentorship</Text>
      <Text style={styles.subtitle}>
        Browse groups and discover or post mentorship and coaching opportunities in one place.
      </Text>
      {departmentsError ? <Text style={styles.error}>{departmentsError}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Groups</Text>
        {departments.map((item) => {
          const members = contacts.filter((contact) => {
            if (contact.department_ids && contact.department_ids.length > 0) {
              return contact.department_ids.map(Number).includes(Number(item.id));
            }
            return contact.department_id === item.id;
          });
          const memberTotal = item.members_count ?? members.length;
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.description}>{item.description || "No description"}</Text>
                  <Text style={styles.leader}>
                    Lead: {item.leader_name || (item.leader_id ? `ID ${item.leader_id}` : "Unassigned")}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{memberTotal} members</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mentorship & Coaching</Text>
          <Pressable style={styles.toggleButton} onPress={() => setShowForm((value) => !value)}>
            <Text style={styles.toggleButtonText}>{showForm ? "Close" : "Create offer"}</Text>
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

        {jobsError ? <Text style={styles.error}>{jobsError}</Text> : null}
        {jobsLoading && jobs.length === 0 ? <LoadingSpinner label="Loading offers" /> : null}
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onFindPeople={() => onNavigate?.("Contacts", { search: getPeopleSearchTerm(job) })}
          />
        ))}
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
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    marginTop: 4
  },
  error: {
    color: colors.danger,
    marginBottom: 10
  },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  card: {
    backgroundColor: colors.background,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5
  },
  leader: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  toggleButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  toggleButtonText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 12
  },
  formCard: {
    backgroundColor: colors.background,
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
  }
});

export default DepartmentsScreen;
