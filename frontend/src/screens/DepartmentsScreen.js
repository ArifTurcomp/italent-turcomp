import React, { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import LoadingSpinner from "../components/LoadingSpinner";
import { fetchContacts, fetchDepartments } from "../store/store";
import { colors } from "../utils/helpers";

const DepartmentsScreen = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.departments);
  const contacts = useSelector((state) => state.contacts.items);

  useEffect(() => {
    dispatch(fetchDepartments({ page: 1, per_page: 50 }));
    dispatch(fetchContacts({ page: 1, per_page: 100 }));
  }, [dispatch]);

  if (loading && items.length === 0) {
    return <LoadingSpinner label="Loading groups" fullScreen />;
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Groups & Leaders</Text>
      <Text style={styles.subtitle}>Browse groups and connect people to relevant mentors, coaches, or topic leads.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const members = contacts.filter((contact) => contact.department_id === item.id);
          const memberTotal = item.members_count ?? members.length;
          return (
            <View style={styles.card}>
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
              <Pressable style={styles.button} onPress={() => onNavigate("Jobs")}>
                <Text style={styles.buttonText}>Create Coaching Offer</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16
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
  list: {
    paddingBottom: 24
  },
  card: {
    backgroundColor: colors.surface,
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
  button: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 14
  },
  buttonText: {
    color: colors.primary,
    fontWeight: "900"
  }
});

export default DepartmentsScreen;
