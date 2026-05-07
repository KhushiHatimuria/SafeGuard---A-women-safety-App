import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
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
    motionAlert,
    dismissMotionAlert,
    voiceListening,
    lastDetection,
  } = useSafeGuard();

  const monitoringDotOpacity = useSharedValue(1);
  const voiceDotOpacity = useSharedValue(1);
  const motionBannerOpacity = useSharedValue(0);

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

  useEffect(() => {
    if (voiceListening) {
      voiceDotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      voiceDotOpacity.value = 1;
    }
  }, [voiceListening]);

  useEffect(() => {
    motionBannerOpacity.value = withTiming(motionAlert ? 1 : 0, { duration: 300 });
  }, [motionAlert]);

  useEffect(() => {
    if (sosState === "active") {
      router.push("/sos-active");
    }
  }, [sosState]);

  const handleSOSPress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    triggerSOS("manual");
  };

  const handleMonitoringToggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleMonitoring();
  };

  const dotStyle = useAnimatedStyle(() => ({ opacity: monitoringDotOpacity.value }));
  const voiceDotStyle = useAnimatedStyle(() => ({ opacity: voiceDotOpacity.value }));
  const motionBannerStyle = useAnimatedStyle(() => ({
    opacity: motionBannerOpacity.value,
    transform: [{ translateY: motionAlert ? 0 : -10 }],
  }));

  const primaryContacts = contacts.filter((c) => c.isPrimary);
  const readyContacts = contacts.length;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <LinearGradient colors={["#0D0D0D", "#0A0505", "#0D0D0D"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {userProfile.name ? `Hello, ${userProfile.name.split(" ")[0]}` : "SafeGuard"}
            </Text>
            <Text style={styles.tagline}>Your personal guardian</Text>
          </View>
          <View style={styles.headerRight}>
            {voiceListening && (
              <Animated.View style={[styles.voiceBadge, voiceDotStyle]}>
                <MaterialCommunityIcons name="microphone" size={14} color={COLORS.primary} />
              </Animated.View>
            )}
            <Pressable onPress={() => router.push("/permissions")} style={styles.shieldIcon}>
              <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.primary} />
            </Pressable>
          </View>
        </View>

        {/* Motion alert banner */}
        {motionAlert && (
          <Animated.View style={[styles.motionBanner, motionBannerStyle]}>
            <MaterialCommunityIcons name="run-fast" size={20} color={COLORS.warning} />
            <View style={styles.motionBannerContent}>
              <Text style={styles.motionBannerTitle}>Motion Detected</Text>
              <Text style={styles.motionBannerSub}>Unusual movement pattern detected</Text>
            </View>
            <Pressable
              style={styles.motionSOS}
              onPress={() => {
                dismissMotionAlert();
                triggerSOS("motion");
              }}
            >
              <Text style={styles.motionSOSText}>SOS</Text>
            </Pressable>
            <Pressable onPress={dismissMotionAlert} style={styles.motionDismiss}>
              <Feather name="x" size={16} color={COLORS.textMuted} />
            </Pressable>
          </Animated.View>
        )}

        {/* Last detection info */}
        {lastDetection && !motionAlert && (
          <View style={styles.detectionBanner}>
            <MaterialCommunityIcons
              name={lastDetection.type === "codeword" ? "key-variant" : "microphone-outline"}
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.detectionText}>
              {lastDetection.type === "codeword"
                ? `Codeword detected (${Math.round(lastDetection.confidence * 100)}%)`
                : `Voice signal: ${lastDetection.keywords.slice(0, 2).join(", ")}`}
            </Text>
          </View>
        )}

        {/* SOS Button */}
        <View style={styles.sosSection}>
          <SOSButton
            onPress={handleSOSPress}
            isActive={sosState === "active"}
            size={200}
          />
          <Text style={styles.sosHint}>Press once to trigger emergency SOS</Text>
          {monitoring.codeword ? (
            <View style={styles.codewordActiveRow}>
              <MaterialCommunityIcons name="key-variant" size={13} color={COLORS.primary} />
              <Text style={styles.codewordHint}>Codeword "{monitoring.codeword}" active</Text>
            </View>
          ) : null}
        </View>

        {/* Monitoring toggle card */}
        <View style={styles.monitoringCard}>
          <View style={styles.monitoringLeft}>
            <View style={styles.monitoringIconWrap}>
              {isMonitoringActive ? (
                <Animated.View style={[styles.monitoringDot, dotStyle]} />
              ) : (
                <View style={[styles.monitoringDot, { backgroundColor: COLORS.textMuted }]} />
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
                  ? voiceListening
                    ? "Recording & analysing audio..."
                    : "Listening for distress signals"
                  : "Tap to enable smart detection"}
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.monitoringToggle, isMonitoringActive && styles.monitoringToggleActive]}
            onPress={handleMonitoringToggle}
          >
            <View style={[styles.toggleKnob, isMonitoringActive && styles.toggleKnobActive]} />
          </Pressable>
        </View>

        {/* Stats */}
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

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <Pressable style={styles.actionCard} onPress={() => router.push("/permissions")}>
              <MaterialCommunityIcons name="shield-lock" size={24} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Permissions</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => router.push("/(tabs)/contacts")}>
              <Feather name="user-plus" size={24} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Add Contact</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => router.push("/(tabs)/history")}>
              <Feather name="clock" size={24} color={COLORS.primary} />
              <Text style={styles.actionLabel}>History</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => router.push("/(tabs)/profile")}>
              <Feather name="user" size={24} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Profile</Text>
            </Pressable>
            <Pressable
              style={[styles.actionCard, styles.fakeCallCard]}
              onPress={() => router.push("/fake-call")}
            >
              <MaterialCommunityIcons name="phone-incoming" size={24} color="#22c55e" />
              <Text style={[styles.actionLabel, { color: "#22c55e" }]}>Fake Call</Text>
              <Text style={styles.fakeCallHint}>Fool attacker</Text>
            </Pressable>
          </View>
        </View>

        {/* Setup banner if no contacts */}
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

        {/* Codeword setup banner */}
        {isMonitoringActive && !monitoring.codeword && (
          <Pressable
            style={styles.codewordSetupBanner}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <MaterialCommunityIcons name="microphone-question" size={18} color={COLORS.primary} />
            <Text style={styles.codewordSetupText}>
              Set a secret codeword for silent SOS activation
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
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 26, fontFamily: "Inter_700Bold", color: COLORS.text },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  voiceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  shieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  motionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warning + "15",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.warning + "40",
    marginBottom: 16,
    gap: 10,
  },
  motionBannerContent: { flex: 1 },
  motionBannerTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.warning,
  },
  motionBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
  },
  motionSOS: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  motionSOSText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  motionDismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard2,
    alignItems: "center",
    justifyContent: "center",
  },
  detectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
    marginBottom: 12,
  },
  detectionText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSub,
    flex: 1,
  },
  sosSection: {
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  sosHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  codewordActiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  codewordHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: COLORS.primary,
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
  monitoringLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
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
  monitoringTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: COLORS.text },
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
  monitoringToggleActive: { backgroundColor: COLORS.success },
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
  toggleKnobActive: { alignSelf: "flex-end" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
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
  statCardMiddle: { borderColor: COLORS.primary + "30" },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: COLORS.primary },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSub,
    textAlign: "center",
  },
  quickActions: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
  fakeCallCard: {
    borderColor: "rgba(34,197,94,0.3)",
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  fakeCallHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(34,197,94,0.6)",
    marginTop: -4,
  },
  actionLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: COLORS.textSub },
  setupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.warning + "10",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.warning + "25",
    marginBottom: 12,
  },
  setupBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 18,
  },
  codewordSetupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.primary + "08",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
  },
  codewordSetupText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 18,
  },
});
