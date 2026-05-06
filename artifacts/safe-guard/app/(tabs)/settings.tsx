import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";
import { useSafeGuard } from "@/context/SafeGuardContext";

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
        <Pressable onPress={() => onChange((value - 1 + 24) % 24)} style={styles.hourBtn}>
          <Feather name="chevron-left" size={18} color={COLORS.textSub} />
        </Pressable>
        <Text style={styles.hourValue}>{formatH(value)}</Text>
        <Pressable onPress={() => onChange((value + 1) % 24)} style={styles.hourBtn}>
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
  iconLib = "feather",
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
  icon: string;
  iconColor?: string;
  iconLib?: "feather" | "material";
}) {
  const color = iconColor ?? COLORS.primary;
  return (
    <Pressable style={styles.settingRow} onPress={onToggle}>
      <View style={[styles.settingIcon, { backgroundColor: color + "18" }]}>
        {iconLib === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={18} color={color} />
        ) : (
          <Feather name={icon as any} size={18} color={color} />
        )}
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

function PermRow({
  icon,
  title,
  subtitle,
  granted,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  granted: boolean;
  onPress?: () => void;
}) {
  const color = granted ? COLORS.success : COLORS.warning;
  return (
    <Pressable style={styles.permRow} onPress={onPress}>
      <View style={[styles.permIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.permContent}>
        <Text style={styles.permTitle}>{title}</Text>
        <Text style={styles.permSub}>{subtitle}</Text>
      </View>
      <View style={[styles.permStatus, { backgroundColor: color + "20" }]}>
        <Feather name={granted ? "check" : "chevron-right"} size={14} color={color} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { monitoring, updateMonitoring, isMonitoringActive, toggleMonitoring, voiceListening } =
    useSafeGuard();

  const [locationGranted, setLocationGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [codewordInput, setCodewordInput] = useState(monitoring.codeword);
  const codewordSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    checkPermissions();
  }, []);

  // Sync local codeword input with context when it changes externally
  useEffect(() => {
    setCodewordInput(monitoring.codeword);
  }, [monitoring.codeword]);

  const checkPermissions = async () => {
    const loc = await Location.getForegroundPermissionsAsync();
    setLocationGranted(loc.granted);
    // Check mic via expo-av if available
    try {
      const { Audio } = await import("expo-av");
      const mic = await Audio.getPermissionsAsync();
      setMicGranted(mic.granted);
    } catch {}
  };

  const requestLocation = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(granted);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const requestMic = async () => {
    try {
      const { Audio } = await import("expo-av");
      const { granted } = await Audio.requestPermissionsAsync();
      setMicGranted(granted);
    } catch {}
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCodewordChange = (text: string) => {
    setCodewordInput(text);
    if (codewordSaveRef.current) clearTimeout(codewordSaveRef.current);
    codewordSaveRef.current = setTimeout(() => {
      updateMonitoring({ codeword: text.trim().toLowerCase() });
    }, 600);
  };

  const sensitivities = ["low", "medium", "high"] as const;
  const sensitivityLabels = { low: "Low", medium: "Medium", high: "High" };
  const sensitivityDesc = {
    low: "Fewer false positives, less responsive",
    medium: "Balanced detection — recommended",
    high: "Maximum sensitivity, may trigger more",
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.pageTitle}>Monitoring</Text>
        {voiceListening && (
          <View style={styles.listeningBadge}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>Listening</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Master monitoring toggle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BACKGROUND MONITORING</Text>

          <ToggleRow
            title="Enable Monitoring"
            subtitle="Smart detection for distress signals"
            value={isMonitoringActive}
            onToggle={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            onToggle={() => updateMonitoring({ enabled: !monitoring.enabled })}
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
            onToggle={() => updateMonitoring({ alwaysOn: !monitoring.alwaysOn })}
            icon="zap"
            iconColor={COLORS.warning}
          />
        </View>

        {/* Codeword */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SECRET CODEWORD</Text>
          <Text style={styles.cardSubtitle}>
            Say this word aloud to silently trigger SOS — even mid-conversation. Gemini AI listens for it.
          </Text>

          <View style={styles.codewordRow}>
            <MaterialCommunityIcons name="microphone-question" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.codewordInput}
              value={codewordInput}
              onChangeText={handleCodewordChange}
              placeholder='e.g. "pizza", "sunshine", "rainbow"'
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            {codewordInput.trim().length > 0 && (
              <Pressable
                onPress={() => {
                  setCodewordInput("");
                  updateMonitoring({ codeword: "" });
                }}
              >
                <Feather name="x-circle" size={18} color={COLORS.textMuted} />
              </Pressable>
            )}
          </View>

          {monitoring.codeword && (
            <View style={styles.codewordActive}>
              <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
              <Text style={styles.codewordActiveText}>
                Codeword "{monitoring.codeword}" is active
              </Text>
            </View>
          )}

          <Text style={styles.codewordHint}>
            Choose an innocent word unlikely to come up by accident. Works across languages.
          </Text>
        </View>

        {/* Detection signals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DETECTION SIGNALS</Text>

          <ToggleRow
            title="Keyword Spotting"
            subtitle={`"Help", "Bachao", "Save me" + codeword`}
            value={monitoring.keywordSpotting}
            onToggle={() => updateMonitoring({ keywordSpotting: !monitoring.keywordSpotting })}
            icon="mic"
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Motion Anomaly"
            subtitle="Detects sudden falls or struggle motion"
            value={monitoring.motionDetection}
            onToggle={() => updateMonitoring({ motionDetection: !monitoring.motionDetection })}
            icon="activity"
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Vibrate on Detection"
            subtitle="Subtle pulse when threat is suspected"
            value={monitoring.vibrateOnDetect}
            onToggle={() => updateMonitoring({ vibrateOnDetect: !monitoring.vibrateOnDetect })}
            icon="smartphone"
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Auto-Escalate"
            subtitle="Activate SOS if no response in 8 seconds"
            value={monitoring.autoEscalate}
            onToggle={() => updateMonitoring({ autoEscalate: !monitoring.autoEscalate })}
            icon="alert-triangle"
            iconColor={COLORS.warning}
          />
        </View>

        {/* Sensitivity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DETECTION SENSITIVITY</Text>
          <Text style={styles.sensitivityDesc}>
            {sensitivityDesc[monitoring.sensitivity]}
          </Text>
          <View style={styles.sensitivityRow}>
            {sensitivities.map((s) => (
              <Pressable
                key={s}
                style={[
                  styles.sensitivityBtn,
                  monitoring.sensitivity === s && styles.sensitivityBtnActive,
                ]}
                onPress={() => {
                  updateMonitoring({ sensitivity: s });
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text
                  style={[
                    styles.sensitivityBtnText,
                    monitoring.sensitivity === s && styles.sensitivityBtnTextActive,
                  ]}
                >
                  {sensitivityLabels[s]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PERMISSIONS</Text>

          <PermRow
            icon="map-pin"
            title="Location"
            subtitle={locationGranted ? "Granted — GPS tracking active" : "Tap to grant location access"}
            granted={locationGranted}
            onPress={requestLocation}
          />
          <View style={styles.divider} />
          <PermRow
            icon="mic"
            title="Microphone"
            subtitle={micGranted ? "Granted — voice monitoring ready" : "Tap to grant microphone access"}
            granted={micGranted}
            onPress={requestMic}
          />
          <View style={styles.divider} />
          <PermRow
            icon="bell"
            title="Notifications"
            subtitle="Used for alert confirmations"
            granted={true}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: COLORS.text },
  listeningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary + "20",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  listeningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  listeningText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  scroll: { paddingHorizontal: 20, gap: 16 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 0,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 18,
    marginTop: -6,
    marginBottom: 16,
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
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: COLORS.text },
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
  toggleActive: { backgroundColor: COLORS.primary },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  toggleKnobActive: { alignSelf: "flex-end" },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  schedulePickers: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard2,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  scheduleDivider: { paddingHorizontal: 8 },
  hourPicker: { flex: 1, gap: 4 },
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
  hourBtn: { padding: 4 },
  hourValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
    minWidth: 70,
    textAlign: "center",
  },
  codewordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: COLORS.primary + "40",
    marginBottom: 10,
  },
  codewordInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: COLORS.text,
    paddingVertical: 12,
    letterSpacing: 0.3,
  },
  codewordActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  codewordActiveText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: COLORS.success,
  },
  codewordHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  sensitivityDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginBottom: 12,
    lineHeight: 17,
  },
  sensitivityRow: { flexDirection: "row", gap: 8 },
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
  sensitivityBtnTextActive: { color: COLORS.primary },
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
  permContent: { flex: 1 },
  permTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: COLORS.text },
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
