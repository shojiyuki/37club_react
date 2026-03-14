import React from "react";
import { View, StyleSheet } from "react-native";

// This screen is never actually rendered — the tab button is fully custom (CheckOutTabButton).
// It exists only to satisfy Expo Router's file-based routing requirement.
export default function CheckoutScreen() {
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070812" },
});
