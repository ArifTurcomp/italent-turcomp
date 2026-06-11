import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider, useDispatch, useSelector } from "react-redux";
import LoadingSpinner from "./components/LoadingSpinner";
import AddContactScreen from "./screens/AddContactScreen";
import ContactDetailsScreen from "./screens/ContactDetailsScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import LoginScreen from "./screens/LoginScreen";
import MainTabsScreen from "./screens/MainTabsScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import store, { bootstrapAuth, logoutUser } from "./store/store";
import { colors } from "./utils/helpers";

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

const HeaderLogout = () => {
  const dispatch = useDispatch();
  return (
    <Pressable style={styles.logoutButton} onPress={() => dispatch(logoutUser())}>
      <Text style={styles.logoutText}>Logout</Text>
    </Pressable>
  );
};

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </AuthStack.Navigator>
);

const AppNavigator = () => (
  <AppStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: "900" },
      contentStyle: { backgroundColor: colors.background },
      headerRight: () => <HeaderLogout />
    }}
  >
    <AppStack.Screen
      name="Home"
      component={MainTabsScreen}
      options={{ headerShown: false }}
    />
    <AppStack.Screen
      name="ContactDetails"
      component={ContactDetailsScreen}
      options={{ title: "Profile Details" }}
    />
    <AppStack.Screen
      name="AddContact"
      component={AddContactScreen}
      options={{ title: "Add Person" }}
    />
  </AppStack.Navigator>
);

const RootNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, bootstrapped } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  if (!bootstrapped) {
    return <LoadingSpinner label="Starting iTalent" fullScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const App = () => (
  <Provider store={store}>
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  </Provider>
);

const styles = StyleSheet.create({
  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  logoutText: {
    color: colors.primary,
    fontWeight: "900"
  }
});

export default App;
