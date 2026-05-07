import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Accelerometer } from "expo-sensors";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";

type PermissionStatus = "granted" | "denied" | "undetermined";

type PermissionItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  status: PermissionStatus;
  required: boolean;
};

export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>("undetermined");
  const [micStatus, setMicStatus] = useState<PermissionStatus>("undetermined");
  const [notifStatus, setNotifStatus] = useState<PermissionStatus>("undetermined");
  const [motionStatus, setMotionStatus] = useState<PermissionStatus>("undetermined");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const cameraStatus: PermissionStatus = cameraPermission?.granted
    ? "granted"
    : cameraPermission?.status === "denied"
    ? "denied"
    : "undetermined";

  useEffect(() => {
    checkAll();
  }, []);

  const checkMotionStatus = async (): Promise<PermissionStatus> => {
    try {
      if (Platform.OS === "web") {
        if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
          return "undetermined";
        }
        return "granted";
      }
      const { status } = await Accelerometer.getPermissionsAsync();
      return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
    } catch {
      return "undetermined";
    }
  };

  const checkAll = async () => {
    const safeCheck = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch {
        return fallback;
      }
    };

    const [loc, mic, motion] = await Promise.all([
      safeCheck(() => Location.getForegroundPermissionsAsync(), { granted: false, status: "undetermined" as const }),
      safeCheck(() => Audio.getPermissionsAsync(), { granted: false, status: "undetermined" as const }),
      safeCheck(() => checkMotionStatus(), "undetermined" as PermissionStatus),
    ]);

    setLocationStatus(loc.granted ? "granted" : (loc.status as PermissionStatus) === "denied" ? "denied" : "undetermined");
    setMicStatus(mic.granted ? "granted" : (mic.status as PermissionStatus) === "denied" ? "denied" : "undetermined");
    setMotionStatus(motion);

    // Check notification permission — available on iOS/Android via expo-notifications
    // gracefully skip on web or if not installed
    if (Platform.OS !== "web") {
      try {
        const Notifications = await import("expo-notifications");
        const notif = await Notifications.getPermissionsAsync();
        setNotifStatus(notif.granted ? "granted" : (notif.status as PermissionStatus));
      } catch {
        setNotifStatus("undetermined");
      }
    }
  };

  const permissions: PermissionItem[] = [
    {
      id: "location",
      title: "Location Access",
      description:
        "Required to send your live GPS coordinates in emergency alerts so trusted contacts can find you.",
      icon: "map-pin",
      iconColor: COLORS.success,
      status: locationStatus,
      required: true,
    },
    {
      id: "microphone",
      title: "Microphone",
      description:
        "Used for audio distress detection (keyword spotting) and silent audio evidence recording during SOS.",
      icon: "mic",
      iconColor: "#9C27B0",
      status: micStatus,
      required: false,
    },
    {
      id: "notifications",
      title: "Notifications",
      description:
        "Allows SafeGuard to send you status alerts and confirm when emergency messages are dispatched.",
      icon: "bell",
      iconColor: COLORS.primary,
      status: notifStatus,
      required: false,
    },
    {
      id: "camera",
      title: "Camera",
      description:
        "Attempts silent video recording during active emergency for evidence. Falls back gracefully if unavailable.",
      icon: "camera",
      iconColor: "#1565C0",
      status: cameraStatus,
      required: false,
    },
    {
      id: "motion",
      title: "Motion & Activity",
      description:
        "Accelerometer data helps detect sudden falls or struggle patterns to trigger the verification phase.",
      icon: "activity",
      iconColor: COLORS.warning,
      status: motionStatus,
      required: false,
    },
  ];

  const handleGrant = async (id: string) => {
    if (Platform.OS !== "web") {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }

    if (id === "location") {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        setLocationStatus(granted ? "granted" : "denied");
      } catch {
        setLocationStatus("denied");
      }
    } else if (id === "microphone") {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        setMicStatus(granted ? "granted" : "denied");
      } catch {
        setMicStatus("denied");
      }
    } else if (id === "notifications") {
      if (Platform.OS !== "web") {
        try {
          const Notifications = await import("expo-notifications");
          const { granted } = await Notifications.requestPermissionsAsync();
          setNotifStatus(granted ? "granted" : "denied");
        } catch {
          setNotifStatus("denied");
        }
      }
    } else if (id === "camera") {
      if (cameraPermission?.canAskAgain === false) {
        Linking.openSettings();
      } else {
        await requestCameraPermission();
      }
    } else if (id === "motion") {
      try {
        if (Platform.OS === "web") {
          if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
            const result = await (DeviceMotionEvent as any).requestPermission();
            setMotionStatus(result === "granted" ? "granted" : "denied");
          } else {
            setMotionStatus("granted");
          }
        } else {
          const { status } = await Accelerometer.requestPermissionsAsync();
          setMotionStatus(status === "granted" ? "granted" : "denied");
        }
      } catch {
        setMotionStatus("denied");
      }
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color={COLORS.textSub} />
        </Pressable>
        <Text style={styles.title}>Permissions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          SafeGuard requests these permissions to protect you effectively. You
          can grant or revoke them at any time from your device settings.
        </Text>

        <View style={styles.list}>
          {permissions.map((perm) => (
            <View key={perm.id} style={styles.permCard}>
              <View style={styles.permTop}>
                <View
                  style={[
                    styles.permIcon,
                    { backgroundColor: perm.iconColor + "18" },
                  ]}
                >
                  <Feather
                    name={perm.icon as any}
                    size={22}
                    color={perm.iconColor}
                  />
                </View>
                <View style={styles.permInfo}>
                  <View style={styles.permTitleRow}>
                    <Text style={styles.permTitle}>{perm.title}</Text>
                    {perm.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.permDesc}>{perm.description}</Text>
                </View>
              </View>

              <View style={styles.permBottom}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        perm.status === "granted"
                          ? COLORS.success + "18"
                          : perm.status === "denied"
                          ? COLORS.danger + "18"
                          : COLORS.bgCard2,
                    },
                  ]}
                >
                  <Feather
                    name={
                      perm.status === "granted"
                        ? "check-circle"
                        : perm.status === "denied"
                        ? "x-circle"
                        : "circle"
                    }
                    size={13}
                    color={
                      perm.status === "granted"
                        ? COLORS.success
                        : perm.status === "denied"
                        ? COLORS.danger
                        : COLORS.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          perm.status === "granted"
                            ? COLORS.success
                            : perm.status === "denied"
                            ? COLORS.danger
                            : COLORS.textMuted,
                      },
                    ]}
                  >
                    {perm.status === "granted"
                      ? "Granted"
                      : perm.status === "denied"
                      ? "Denied"
                      : "Not Requested"}
                  </Text>
                </View>

                {perm.status !== "granted" && (
                  <Pressable
                    style={[styles.grantBtn, perm.status === "denied" && styles.grantBtnSettings]}
                    onPress={() => {
                      if (perm.status === "denied" && perm.id !== "camera") {
                        Linking.openSettings();
                      } else {
                        handleGrant(perm.id);
                      }
                    }}
                  >
                    <Text style={styles.grantBtnText}>
                      {perm.status === "denied" ? "Open Settings" : "Grant"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.privacyNote}>
          <MaterialCommunityIcons
            name="shield-lock-outline"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.privacyText}>
            All data remains on your device. Permissions are only used when
            monitoring is active or SOS is triggered.
          </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  intro: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  permCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  permIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  permInfo: {
    flex: 1,
    gap: 5,
  },
  permTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  permTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
  },
  requiredBadge: {
    backgroundColor: COLORS.danger + "18",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.danger + "30",
  },
  requiredText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.danger,
  },
  permDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 18,
  },
  permBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  grantBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  grantBtnSettings: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  grantBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 17,
  },
});
