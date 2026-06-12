import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import ContactCard from "../components/ContactCard";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import { deleteContact, fetchContacts } from "../store/store";
import { colors } from "../utils/helpers";

const ContactsScreen = ({ navigation, initialSearch = "" }) => {
  const dispatch = useDispatch();
  const { items, loading, error, pagination } = useSelector((state) => state.contacts);
  const user = useSelector((state) => state.auth.user);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      page,
      per_page: 20,
      search: search.trim() || undefined
    }),
    [page, search]
  );

  const loadContacts = useCallback(() => {
    dispatch(fetchContacts(query));
  }, [dispatch, query]);

  useEffect(() => {
    const timer = setTimeout(loadContacts, 300);
    return () => clearTimeout(timer);
  }, [loadContacts]);

  const confirmDelete = (contact) => {
    Alert.alert("Delete profile", `Remove ${contact.name} from iTalent?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => dispatch(deleteContact(contact.id))
      }
    ]);
  };

  const canGoBack = page > 1;
  const canGoForward = page < (pagination.pages || 1);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarText}>
          <Text style={styles.title}>People</Text>
          <Text style={styles.subtitle}>{pagination.total || items.length} people sharing expertise</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate("AddContact")}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <FormInput
        value={search}
        placeholder="Search name, email, expertise, role, or skill"
        autoCapitalize="none"
        onChangeText={(value) => {
          setSearch(value);
          setPage(1);
        }}
        containerStyle={styles.search}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && items.length === 0 ? (
        <LoadingSpinner label="Loading people" fullScreen />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadContacts} />}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          renderItem={({ item }) => (
            <ContactCard
              contact={item}
              onPress={() => navigation.navigate("ContactDetails", { contactId: item.id })}
              onEdit={
                item.created_by_id === user?.id
                  ? () => navigation.navigate("ContactDetails", { contactId: item.id, edit: true })
                  : undefined
              }
              onDelete={item.created_by_id === user?.id ? () => confirmDelete(item) : undefined}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No people found</Text>
              <Text style={styles.emptyCopy}>Try another search or add the first community profile.</Text>
            </View>
          }
          ListFooterComponent={
            items.length ? (
              <View style={styles.pagination}>
                <Pressable
                  disabled={!canGoBack}
                  style={[styles.pageButton, !canGoBack && styles.disabledPageButton]}
                  onPress={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <Text style={styles.pageButtonText}>Previous</Text>
                </Pressable>
                <Text style={styles.pageText}>
                  Page {pagination.page || page} of {pagination.pages || 1}
                </Text>
                <Pressable
                  disabled={!canGoForward}
                  style={[styles.pageButton, !canGoForward && styles.disabledPageButton]}
                  onPress={() => setPage((value) => value + 1)}
                >
                  <Text style={styles.pageButtonText}>Next</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  toolbarText: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 11
  },
  addButtonText: {
    color: colors.surface,
    fontWeight: "900"
  },
  search: {
    marginBottom: 4
  },
  error: {
    color: colors.danger,
    marginBottom: 8
  },
  list: {
    paddingBottom: 24
  },
  emptyList: {
    flexGrow: 1
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center"
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4
  },
  pageButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface
  },
  disabledPageButton: {
    opacity: 0.45
  },
  pageButtonText: {
    color: colors.primary,
    fontWeight: "900"
  },
  pageText: {
    color: colors.muted,
    fontWeight: "700"
  }
});

export default ContactsScreen;
