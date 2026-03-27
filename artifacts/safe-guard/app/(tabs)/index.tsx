import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SOSButton } from "@/components/SOSButton";
import { VerificationModal } from "@/components/VerificationModal";
import { COLORS } from "@/constants/colors";
import { useSafeGuard } from "@/context/SafeGuardContext";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    contacts,
    isMonitoringActive,
    toggleMonitoring,
    sosState,
    triggerSOS,
    cancelSOS,
    confirmSOS,
    alertCount,
    monitoring,
    userProfile,
  } = useSafeGuard();

  const monitoringDotOpacity = useSharedValue(1);

  useEffect(() => {
    if (isMonitoringActive) {
      monitoringDotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      monitoringDotOpacity.value = 1;
    }
  }, [isMonitoringActive]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: monitoringDotOpacity.value,
  }));

  useEffect(() => {
    if (sosState === "active") {
      router.push("/sos-active");
    }
  }, [sosState]);

  const handleSOSPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    triggerSOS();
  };

  const handleMonitoringToggle = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleMonitoring();
  };

  const primaryContacts = contacts.filter((c) => c.isPrimary);
  const readyContacts = contacts.length;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <LinearGradient
      colors={["#0D0D0D", "#0A0505", "#0D0D0D"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {userProfile.name ? `Hello, ${userProfile.name.split(" ")[0]}` : "SafeGuard"}
            </Text>
            <Text style={styles.tagline}>Your personal guardian</Text>
          </View>
          <Pressable
            onPress={() => router.push("/permissions")}
            style={styles.shieldIcon}
          >
            <MaterialCommunityIcons
              name="shield-check"
              size={24}
              color={COLORS.primary}
            />
          </Pressable>
        </View>

        <View style={styles.sosSection}>
          <SOSButton
            onPress={handleSOSPress}
            isActive={sosState === "active"}
            size={200}
          />
          <Text style={styles.sosHint}>
            Press once to trigger emergency SOS
          </Text>
        </View>

        <View style={styles.monitoringCard}>
          <View style={styles.monitoringLeft}>
            <View style={styles.monitoringIconWrap}>
              {isMonitoringActive ? (
                <Animated.View style={[styles.monitoringDot, dotStyle]} />
              ) : (
                <View
                  style={[
                    styles.monitoringDot,
                    { backgroundColor: COLORS.textMuted },
                  ]}
                />
              )}
              <MaterialCommunityIcons
                name="radar"
                size={20}
                color={isMonitoringActive ? COLORS.success : COLORS.textMuted}
              />
            </View>
            <View>
              <Text style={styles.monitoringTitle}>
                {isMonitoringActive ? "Monitoring Active" : "Monitoring Off"}
              </Text>
              <Text style={styles.monitoringSubtitle}>
                {isMonitoringActive
                  ? "Listening for distress signals"
                  : "Tap to enable smart detection"}
              </Text>
            </View>
          </View>
          <Pressable
            style={[
              styles.monitoringToggle,
              isMonitoringActive && styles.monitoringToggleActive,
            ]}
            onPress={handleMonitoringToggle}
          >
            <View
              style={[
                styles.toggleKnob,
                isMonitoringActive && styles.toggleKnobActive,
              ]}
            />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{readyContacts}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={styles.statValue}>{alertCount}</Text>
            <Text style={styles.statLabel}>Alerts Sent</Text>
          </View>
          <View style={styles.statCard}>
            <Feather
              name={monitoring.enabled ? "clock" : "moon"}
              size={22}
              color={monitoring.enabled ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={styles.statLabel}>
              {monitoring.alwaysOn ? "Always On" : "Scheduled"}
            </Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push("/permissions")}
            >
              <MaterialCommunityIcons
                name="shield-lock"
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.actionLabel}>Permissions</Text>
            </Pressable>
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/contacts")}
            >
              <Feather name="user-plus" size={24} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Add Contact</Text>
            </Pressable>
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/settings")}
            >
              <Feather name="clock" size={24} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Schedule</Text>
            </Pressable>
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Feather name="user" size={24} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Profile</Text>
            </Pressable>
          </View>
        </View>

        {contacts.length === 0 && (
          <Pressable
            style={styles.setupBanner}
            onPress={() => router.push("/(tabs)/contacts")}
          >
            <Feather name="alert-triangle" size={18} color={COLORS.warning} />
            <Text style={styles.setupBannerText}>
              Add emergency contacts to receive your SOS alerts
            </Text>
            <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
          </Pressable>
        )}
      </ScrollView>

      <VerificationModal
        visible={sosState === "verifying"}
        onConfirm={confirmSOS}
        onCancel={cancelSOS}
        countdownSeconds={8}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginTop: 2,
  },
  shieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  sosSection: {
    alignItems: "center",
    marginBottom: 36,
    gap: 14,
  },
  sosHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  monitoringCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monitoringLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  monitoringIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgCard2,
    alignItems: "center",
    justifyContent: "center",
  },
  monitoringDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    zIndex: 1,
  },
  monitoringTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
  },
  monitoringSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginTop: 2,
  },
  monitoringToggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    padding: 3,
    justifyContent: "center",
  },
  monitoringToggleActive: {
    backgroundColor: COLORS.success,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardMiddle: {
    borderColor: COLORS.primary + "30",
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSub,
    textAlign: "center",
  },
  quickActions: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "47%",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSub,
  },
  setupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.warning + "10",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.warning + "25",
  },
  setupBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 18,
  },
});
