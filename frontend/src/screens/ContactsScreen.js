import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import {
  fetchContacts,
  respondConnectionRequest,
  sendConnectionRequest
} from "../store/store";
import { colors } from "../utils/helpers";

const ContactsScreen = ({ navigation, initialSearch = "" }) => {
  const dispatch = useDispatch();
  const { items, loading, error, pagination } = useSelector((state) => state.contacts);
  const user = useSelector((state) => state.auth.user);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [connectionSavingId, setConnectionSavingId] = useState(null);

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

  useEffect(() => {
    setSearch(initialSearch);
    setPage(1);
  }, [initialSearch]);

  const sendRequest = async (contact) => {
    setConnectionSavingId(contact.id);
    try {
      await dispatch(sendConnectionRequest({ recipient_id: contact.id })).unwrap();
    } catch (_) {
      // The Redux error state renders below the search box.
    } finally {
      setConnectionSavingId(null);
    }
  };

  const acceptRequest = async (contact) => {
    if (!contact.connection_id) return;
    setConnectionSavingId(contact.id);
    try {
      await dispatch(
        respondConnectionRequest({ id: contact.connection_id, status: "accepted" })
      ).unwrap();
    } catch (_) {
      // The Redux error state renders below the search box.
    } finally {
      setConnectionSavingId(null);
    }
  };

  const canGoBack = page > 1;
  const canGoForward = page < (pagination.pages || 1);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarText}>
          <Text style={styles.title}>People</Text>
          <Text style={styles.subtitle}>{pagination.total || items.length} registered members sharing expertise</Text>
        </View>
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
              onPress={() => {
                navigation.navigate("ContactDetails", { contactId: item.id });
              }}
              onConnect={item.id !== user?.id ? () => sendRequest(item) : undefined}
              onAccept={
                item.id !== user?.id && item.connection_direction === "incoming"
                  ? () => acceptRequest(item)
                  : undefined
              }
              connectionSaving={connectionSavingId === item.id}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No people found</Text>
              <Text style={styles.emptyCopy}>Try another search or ask them to register an iTalent account.</Text>
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
