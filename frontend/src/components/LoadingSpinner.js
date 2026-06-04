import PropTypes from "prop-types";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../utils/helpers";

/**
 * Centered loading indicator used by screens and submit buttons.
 */
const LoadingSpinner = ({ label, size, fullScreen }) => (
  <View style={[styles.container, fullScreen && styles.fullScreen]}>
    <ActivityIndicator color={colors.primary} size={size} />
    {label ? <Text style={styles.label}>{label}</Text> : null}
  </View>
);

LoadingSpinner.propTypes = {
  label: PropTypes.string,
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fullScreen: PropTypes.bool
};

LoadingSpinner.defaultProps = {
  label: "",
  size: "large",
  fullScreen: false
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 10
  }
});

export default LoadingSpinner;
