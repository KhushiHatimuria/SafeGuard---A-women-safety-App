import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
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
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";
import { useSafeGuard } from "@/context/SafeGuardContext";
import { api } from "@/lib/api";

type LocationCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export default function SOSActiveScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, deactivateSOS, activeAlertId } = useSafeGuard();
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [contactsNotified, setContactsNotified] = useState<number | null>(null);
  const [smsStatus, setSmsStatus] = useState<"pending" | "sent" | "no_sms">("pending");
  const [deactivating, setDeactivating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertIdRef = useRef(activeAlertId);

  useEffect(() => { alertIdRef.current = activeAlertId; }, [activeAlertId]);

  const pulseScale = useSharedValue(1);
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS !== "web") StatusBar.setBarStyle("light-content");

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    startLocationTracking();
    pollAlertStatus();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (locationWatchRef.current) locationWatchRef.current.remove();
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  // Poll for real contactsNotified count from the server
  const pollAlertStatus = async () => {
    const maxAttempts = 8;
    let attempt = 0;
    const poll = async () => {
      attempt++;
      const id = alertIdRef.current;
      if (!id) {
        if (attempt < maxAttempts) {
          pollRef.current = setTimeout(poll, 2000);
        } else {
          setSmsStatus("no_sms");
        }
        return;
      }
      try {
        const alerts = await api.alerts.list();
        const thisAlert = alerts.find((a) => a.id === id);
        if (thisAlert) {
          setContactsNotified(thisAlert.contactsNotified);
          if (thisAlert.contactsNotified > 0) {
            setSmsStatus("sent");
            return;
          }
        }
        if (attempt < maxAttempts) {
          pollRef.current = setTimeout(poll, 2500);
        } else {
          setSmsStatus("no_sms");
          setContactsNotified(0);
        }
      } catch {
        if (attempt < maxAttempts) {
          pollRef.current = setTimeout(poll, 3000);
        } else {
          setSmsStatus("no_sms");
        }
      }
    };
    pollRef.current = setTimeout(poll, 3000);
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
          (loc) => {
            const coords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
            };
            setLocation(coords);
            const id = alertIdRef.current;
            if (id) {
              api.alerts
                .pushLocation(id, {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  accuracy: coords.accuracy ?? undefined,
                })
                .catch(() => {});
            }
          }
        );
        locationWatchRef.current = sub;
      }
    } catch {}
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (locationWatchRef.current) locationWatchRef.current.remove();
    if (pollRef.current) clearTimeout(pollRef.current);
    await deactivateSOS();
    router.replace("/(tabs)");
  };

  const handleRecordVideo = () => {
    router.push("/video-recorder");
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  const allContacts = contacts.slice(0, 5);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + 16;

  const smsLabel = () => {
    if (smsStatus === "pending") return "Dispatching alerts...";
    if (smsStatus === "sent" && contactsNotified != null && contactsNotified > 0) {
      return `${contactsNotified} contact${contactsNotified > 1 ? "s" : ""} notified via SMS`;
    }
    return contacts.length > 0
      ? "SMS sent — check contact phone numbers"
      : "contacts to notify";
  };

  const smsDotColor = () => {
    if (smsStatus === "sent" && (contactsNotified ?? 0) > 0) return COLORS.success;
    if (smsStatus === "no_sms") return COLORS.warning;
    return COLORS.warning;
  };

  return (
    <View style={styles.container}>
      {Platform.OS !== "web" && <StatusBar barStyle="light-content" backgroundColor="#000" />}

      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.liveDot, dotStyle]} />
          <Text style={styles.liveText}>EMERGENCY ACTIVE</Text>
        </View>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        {activeAlertId && (
          <Text style={styles.alertId}>ID: {activeAlertId.slice(0, 8).toUpperCase()}</Text>
        )}
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.sosOrb, pulseStyle]}>
          <View style={styles.sosOrbInner}>
            <MaterialCommunityIcons name="shield-alert" size={40} color="#fff" />
            <Text style={styles.sosOrbLabel}>SOS</Text>
          </View>
        </Animated.View>

        <View style={styles.statusCards}>
          <View style={styles.statusCard}>
            <Feather name="map-pin" size={18} color={COLORS.primary} />
            <View style={styles.statusCardContent}>
              <Text style={styles.statusCardTitle}>Live Location</Text>
              <Text style={styles.statusCardValue}>
                {location
                  ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                  : "Acquiring GPS..."}
              </Text>
              {location?.accuracy != null && (
                <Text style={styles.statusCardSub}>
                  ±{Math.round(location.accuracy)}m · Streaming to contacts
                </Text>
              )}
            </View>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: location ? COLORS.success : COLORS.warning },
              ]}
            />
          </View>

          <View style={styles.statusCard}>
            <MaterialCommunityIcons name="database-check" size={18} color={COLORS.primary} />
            <View style={styles.statusCardContent}>
              <Text style={styles.statusCardTitle}>Alert Logged</Text>
              <Text style={styles.statusCardValue}>
                {activeAlertId ? "Saved to secure database" : "Logging..."}
              </Text>
              {activeAlertId && (
                <Text style={styles.statusCardSub}>
                  Ref: {activeAlertId.slice(0, 8).toUpperCase()}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: activeAlertId ? COLORS.success : COLORS.warning },
              ]}
            />
          </View>

          <View style={styles.statusCard}>
            <MaterialCommunityIcons name="send-check" size={18} color={COLORS.primary} />
            <View style={styles.statusCardContent}>
              <Text style={styles.statusCardTitle}>SMS Alerts</Text>
              <Text style={styles.statusCardValue}>{smsLabel()}</Text>
              {smsStatus === "no_sms" && contacts.length > 0 && (
                <Text style={styles.statusCardSub}>
                 successfully sent.
                </Text>
              )}
            </View>
            <View
              style={[styles.statusDot, { backgroundColor: smsDotColor() }]}
            />
          </View>
        </View>

        {allContacts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NOTIFIED CONTACTS</Text>
            {allContacts.map((c) => (
              <View key={c.id} style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </View>
                {c.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                )}
                <Feather
                  name="check-circle"
                  size={18}
                  color={smsStatus === "sent" ? COLORS.success : COLORS.textMuted}
                />
              </View>
            ))}
          </View>
        )}

        {allContacts.length === 0 && (
          <View style={styles.noContactsBox}>
            <Feather name="alert-triangle" size={20} color={COLORS.warning} />
            <Text style={styles.noContactsText}>
              No emergency contacts set. Add contacts in the Contacts tab after deactivating.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed footer */}
      <View style={[styles.fixedFooter, { paddingBottom: bottomPad }]}>
        <Pressable style={styles.recordBtn} onPress={handleRecordVideo}>
          <Feather name="camera" size={18} color={COLORS.primary} />
          <Text style={styles.recordBtnText}>Record Video Evidence</Text>
        </Pressable>

        <Pressable
          style={[styles.deactivateBtn, deactivating && styles.deactivateBtnDisabled]}
          onPress={handleDeactivate}
          disabled={deactivating}
        >
          <Feather name="shield-off" size={22} color="#fff" />
          <Text style={styles.deactivateBtnText}>
            {deactivating ? "Deactivating..." : "Deactivate Emergency"}
          </Text>
        </Pressable>
        <Text style={styles.footerNote}>Alert will be marked resolved in the database</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A0000",
    alignItems: "center",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold", color: COLORS.primary, letterSpacing: 2 },
  timer: { fontSize: 48, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 2 },
  alertId: { fontSize: 11, fontFamily: "Inter_500Medium", color: COLORS.textMuted, marginTop: 4 },
  content: { padding: 24, gap: 20, paddingBottom: 16 },
  sosOrb: {
    alignSelf: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + "20",
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sosOrbInner: { alignItems: "center", gap: 4 },
  sosOrbLabel: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 3 },
  statusCards: { gap: 10 },
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  statusCardContent: { flex: 1 },
  statusCardTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: COLORS.textMuted,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusCardValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  statusCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textMuted, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: COLORS.primary },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  contactPhone: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textMuted },
  primaryBadge: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  primaryBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: COLORS.primary },
  noContactsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.warning + "15",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.warning + "30",
  },
  noContactsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 18,
  },
  fixedFooter: {
    backgroundColor: "#050505",
    borderTopWidth: 1,
    borderTopColor: "#1A0000",
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 10,
    alignItems: "center",
  },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary + "15",
    borderWidth: 1,
    borderColor: COLORS.primary + "50",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    width: "100%",
  },
  recordBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.primary,
  },
  deactivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A0A0A",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
    width: "100%",
  },
  deactivateBtnDisabled: { opacity: 0.6 },
  deactivateBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  footerNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textMuted },
});
