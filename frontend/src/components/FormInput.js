import PropTypes from "prop-types";
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../utils/helpers";

/**
 * Reusable labelled text input with helper and error states.
 */
const FormInput = ({
  label,
  error,
  helperText,
  multiline,
  inputStyle,
  containerStyle,
  ...inputProps
}) => (
  <View style={[styles.container, containerStyle]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      style={[styles.input, multiline && styles.multiline, error && styles.inputError, inputStyle]}
      placeholderTextColor="#8A98AA"
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      {...inputProps}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
  </View>
);

FormInput.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  multiline: PropTypes.bool,
  inputStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
};

FormInput.defaultProps = {
  label: "",
  error: "",
  helperText: "",
  multiline: false,
  inputStyle: null,
  containerStyle: null
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14
  },
  multiline: {
    minHeight: 96,
    paddingTop: 12,
    paddingBottom: 12
  },
  inputError: {
    borderColor: colors.danger
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 5
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5
  }
});

export default FormInput;
