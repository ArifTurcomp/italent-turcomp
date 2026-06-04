import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import TurcompLogo from "../components/TurcompLogo";
import { logoutUser } from "../store/store";
import { colors } from "../utils/helpers";
import CommunityScreen from "./CommunityScreen";
import ContactsScreen from "./ContactsScreen";
import DashboardScreen from "./DashboardScreen";
import DepartmentsScreen from "./DepartmentsScreen";
import JobsScreen from "./JobsScreen";
import SettingsScreen from "./SettingsScreen";

const tabs = [
  { key: "Dashboard", label: "Dashboard" },
  { key: "Departments", label: "Departments" },
  { key: "Contacts", label: "Contacts" },
  { key: "Jobs", label: "Job Offerings" },
  { key: "Community", label: "Community" },
  { key: "Settings", label: "Settings" }
];

const MainTabsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const displayName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  const renderScreen = () => {
    if (activeTab === "Dashboard") return <DashboardScreen onNavigate={setActiveTab} />;
    if (activeTab === "Departments") return <DepartmentsScreen onNavigate={setActiveTab} />;
    if (activeTab === "Contacts") return <ContactsScreen navigation={navigation} />;
    if (activeTab === "Jobs") return <JobsScreen />;
    if (activeTab === "Community") return <CommunityScreen />;
    return <SettingsScreen />;
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TurcompLogo compact />
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle}>Turcomp iTalent</Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              {displayName || "Community talent network"}
            </Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={() => dispatch(logoutUser())}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, active && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.activeTabText]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.body}>{renderScreen()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10
  },
  brandCopy: {
    flex: 1,
    minWidth: 0
  },
  brandTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  brandSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  logoutText: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 12
  },
  tabs: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8
  },
  tab: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 9
  },
  activeTab: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  tabText: {
    color: colors.muted,
    fontWeight: "800",
    fontSize: 13
  },
  activeTabText: {
    color: colors.primary
  },
  body: {
    flex: 1
  }
});

export default MainTabsScreen;
