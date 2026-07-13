import PropTypes from "prop-types";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../utils/helpers";

const turcompLogo = require("../../assets/turcomp-logo.png");

const TurcompLogo = ({ compact }) => {
  const markStyle = compact ? styles.compactMark : styles.mark;
  const textStyle = compact ? styles.compactWordmark : styles.wordmark;

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Image
        accessibilityLabel="Turcomp logo"
        resizeMode="contain"
        source={turcompLogo}
        style={markStyle}
      />
      <Text style={textStyle}>
        <Text style={styles.wordBlue}>i</Text>
        <Text style={styles.wordDark}>Talent</Text>
      </Text>
    </View>
  );
};

TurcompLogo.propTypes = {
  compact: PropTypes.bool
};

TurcompLogo.defaultProps = {
  compact: false
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    alignSelf: "flex-start"
  },
  compactContainer: {
    width: 82
  },
  mark: {
    height: 58,
    width: 84
  },
  compactMark: {
    height: 40,
    width: 58
  },
  wordmark: {
    marginTop: -6,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0
  },
  compactWordmark: {
    marginTop: -5,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0
  },
  wordBlue: {
    color: colors.primary
  },
  wordDark: {
    color: colors.text
  }
});

export default TurcompLogo;
