import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
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
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";
import { useSafeGuard } from "@/context/SafeGuardContext";

type SensitivityLevel = "low" | "medium" | "high";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HourPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (h: number) => void;
  label: string;
}) {
  const formatH = (h: number) => {
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${ampm}`;
  };

  return (
    <View style={styles.hourPicker}>
      <Text style={styles.hourPickerLabel}>{label}</Text>
      <View style={styles.hourPickerControls}>
        <Pressable
          onPress={() => onChange((value - 1 + 24) % 24)}
          style={styles.hourBtn}
        >
          <Feather name="chevron-left" size={18} color={COLORS.textSub} />
        </Pressable>
        <Text style={styles.hourValue}>{formatH(value)}</Text>
        <Pressable
          onPress={() => onChange((value + 1) % 24)}
          style={styles.hourBtn}
        >
          <Feather name="chevron-right" size={18} color={COLORS.textSub} />
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onToggle,
  icon,
  iconColor,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
  icon: string;
  iconColor?: string;
}) {
  return (
    <Pressable style={styles.settingRow} onPress={onToggle}>
      <View style={[styles.settingIcon, { backgroundColor: (iconColor ?? COLORS.primary) + "18" }]}>
        <Feather name={icon as any} size={18} color={iconColor ?? COLORS.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { monitoring, updateMonitoring, isMonitoringActive, toggleMonitoring } =
    useSafeGuard();

  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(true);
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>("medium");
  const [keywords, setKeywords] = useState(true);
  const [motionDetection, setMotionDetection] = useState(true);
  const [vibrateOnDetect, setVibrateOnDetect] = useState(true);
  const [autoEscalate, setAutoEscalate] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const loc = await Location.getForegroundPermissionsAsync();
    setLocationGranted(loc.granted);
  };

  const requestLocation = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(granted);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const requestNotifications = async () => {
    setNotifGranted(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const sensitivities: SensitivityLevel[] = ["low", "medium", "high"];
  const sensitivityLabels = { low: "Low", medium: "Medium", high: "High" };
  const sensitivityDesc = {
    low: "Fewer false positives, less responsive",
    medium: "Balanced detection — recommended",
    high: "Maximum sensitivity, may trigger more",
  };

  return (
    <View style={[styles.container]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.pageTitle}>Monitoring</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BACKGROUND MONITORING</Text>

          <ToggleRow
            title="Enable Monitoring"
            subtitle="Smart detection for distress signals"
            value={isMonitoringActive}
            onToggle={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              toggleMonitoring();
            }}
            icon="radio"
            iconColor={COLORS.success}
          />

          <View style={styles.divider} />

          <ToggleRow
            title="Scheduled Hours"
            subtitle="Run only during specified time range"
            value={monitoring.enabled}
            onToggle={() =>
              updateMonitoring({ enabled: !monitoring.enabled })
            }
            icon="clock"
          />

          {monitoring.enabled && !monitoring.alwaysOn && (
            <View style={styles.schedulePickers}>
              <HourPicker
                label="Start"
                value={monitoring.startHour}
                onChange={(h) => updateMonitoring({ startHour: h })}
              />
              <View style={styles.scheduleDivider}>
                <Feather name="arrow-right" size={16} color={COLORS.textMuted} />
              </View>
              <HourPicker
                label="End"
                value={monitoring.endHour}
                onChange={(h) => updateMonitoring({ endHour: h })}
              />
            </View>
          )}

          <View style={styles.divider} />

          <ToggleRow
            title="Always On"
            subtitle="Monitor 24/7 (uses more battery)"
            value={monitoring.alwaysOn}
            onToggle={() =>
              updateMonitoring({ alwaysOn: !monitoring.alwaysOn })
            }
            icon="zap"
            iconColor={COLORS.warning}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>DETECTION SIGNALS</Text>

          <ToggleRow
            title="Keyword Spotting"
            subtitle='"Help", "Bachao", "Save me" and more'
            value={keywords}
            onToggle={() => setKeywords((p) => !p)}
            icon="mic"
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Motion Anomaly"
            subtitle="Detects sudden falls or struggle motion"
            value={motionDetection}
            onToggle={() => setMotionDetection((p) => !p)}
            icon="activity"
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Vibrate on Detection"
            subtitle="Subtle pulse when threat is suspected"
            value={vibrateOnDetect}
            onToggle={() => setVibrateOnDetect((p) => !p)}
            icon="smartphone"
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Auto-Escalate"
            subtitle="Activate SOS if no response in 8 seconds"
            value={autoEscalate}
            onToggle={() => setAutoEscalate((p) => !p)}
            icon="alert-triangle"
            iconColor={COLORS.warning}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>DETECTION SENSITIVITY</Text>
          <Text style={styles.sensitivityDesc}>
            {sensitivityDesc[sensitivity]}
          </Text>
          <View style={styles.sensitivityRow}>
            {sensitivities.map((s) => (
              <Pressable
                key={s}
                style={[
                  styles.sensitivityBtn,
                  sensitivity === s && styles.sensitivityBtnActive,
                ]}
                onPress={() => {
                  setSensitivity(s);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Text
                  style={[
                    styles.sensitivityBtnText,
                    sensitivity === s && styles.sensitivityBtnTextActive,
                  ]}
                >
                  {sensitivityLabels[s]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>PERMISSIONS</Text>

          <Pressable
            style={styles.permRow}
            onPress={requestLocation}
          >
            <View
              style={[
                styles.permIcon,
                {
                  backgroundColor: (locationGranted
                    ? COLORS.success
                    : COLORS.warning) + "18",
                },
              ]}
            >
              <Feather
                name="map-pin"
                size={18}
                color={locationGranted ? COLORS.success : COLORS.warning}
              />
            </View>
            <View style={styles.permContent}>
              <Text style={styles.permTitle}>Location</Text>
              <Text style={styles.permSub}>
                {locationGranted ? "Granted" : "Tap to grant"}
              </Text>
            </View>
            <View
              style={[
                styles.permStatus,
                {
                  backgroundColor: (locationGranted
                    ? COLORS.success
                    : COLORS.warning) + "20",
                },
              ]}
            >
              <Feather
                name={locationGranted ? "check" : "chevron-right"}
                size={14}
                color={locationGranted ? COLORS.success : COLORS.warning}
              />
            </View>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.permRow} onPress={requestNotifications}>
            <View
              style={[
                styles.permIcon,
                {
                  backgroundColor: (notifGranted
                    ? COLORS.success
                    : COLORS.warning) + "18",
                },
              ]}
            >
              <Feather
                name="bell"
                size={18}
                color={notifGranted ? COLORS.success : COLORS.warning}
              />
            </View>
            <View style={styles.permContent}>
              <Text style={styles.permTitle}>Notifications</Text>
              <Text style={styles.permSub}>
                {notifGranted ? "Granted" : "Tap to grant"}
              </Text>
            </View>
            <View
              style={[
                styles.permStatus,
                {
                  backgroundColor: (notifGranted
                    ? COLORS.success
                    : COLORS.warning) + "20",
                },
              ]}
            >
              <Feather
                name={notifGranted ? "check" : "chevron-right"}
                size={14}
                color={notifGranted ? COLORS.success : COLORS.warning}
              />
            </View>
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.permRow}>
            <View
              style={[styles.permIcon, { backgroundColor: COLORS.primary + "18" }]}
            >
              <Feather name="mic" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.permContent}>
              <Text style={styles.permTitle}>Microphone</Text>
              <Text style={styles.permSub}>For audio distress detection</Text>
            </View>
            <View
              style={[styles.permStatus, { backgroundColor: COLORS.textMuted + "20" }]}
            >
              <Feather name="info" size={14} color={COLORS.textMuted} />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.permRow}>
            <View
              style={[styles.permIcon, { backgroundColor: COLORS.primary + "18" }]}
            >
              <Feather name="camera" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.permContent}>
              <Text style={styles.permTitle}>Camera</Text>
              <Text style={styles.permSub}>For silent video evidence recording</Text>
            </View>
            <View
              style={[styles.permStatus, { backgroundColor: COLORS.textMuted + "20" }]}
            >
              <Feather name="info" size={14} color={COLORS.textMuted} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    gap: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginTop: 1,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  schedulePickers: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard2,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  scheduleDivider: {
    paddingHorizontal: 8,
  },
  hourPicker: {
    flex: 1,
    gap: 4,
  },
  hourPickerLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  hourPickerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  hourBtn: {
    padding: 4,
  },
  hourValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
    minWidth: 70,
    textAlign: "center",
  },
  sensitivityDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginBottom: 12,
    lineHeight: 17,
  },
  sensitivityRow: {
    flexDirection: "row",
    gap: 8,
  },
  sensitivityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sensitivityBtnActive: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
  },
  sensitivityBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textSub,
  },
  sensitivityBtnTextActive: {
    color: COLORS.primary,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  permIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  permContent: {
    flex: 1,
  },
  permTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
  },
  permSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginTop: 1,
  },
  permStatus: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
