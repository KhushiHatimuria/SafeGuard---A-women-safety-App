import { Feather } from "@expo/vector-icons";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";

export default function VideoRecorderScreen() {
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      dotOpacity.value = withRepeat(withTiming(0.1, { duration: 500 }), -1, true);

      const video = await cameraRef.current.recordAsync({ maxDuration: 300 });
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      dotOpacity.value = 1;

      if (video?.uri) {
        if (mediaPermission?.granted) {
          await MediaLibrary.saveToLibraryAsync(video.uri);
          setSavedUri(video.uri);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          Alert.alert(
            "Video Saved",
            "Your evidence video has been saved to your photo library.",
            [{ text: "OK", onPress: () => router.back() }]
          );
        } else {
          setSavedUri(video.uri);
          Alert.alert(
            "Video Recorded",
            "Video recorded. Grant media library permission to save it permanently.",
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      }
    } catch (e) {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      dotOpacity.value = 1;
      console.warn("Recording error:", e);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cameraRef.current.stopRecording();
  };

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.unsupportedCard}>
          <Feather name="camera-off" size={48} color={COLORS.textMuted} />
          <Text style={styles.unsupportedTitle}>Camera Not Available</Text>
          <Text style={styles.unsupportedText}>
            Video recording is available on iOS and Android devices only.
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#fff" />
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!cameraPermission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Checking camera permissions...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.permCard}>
          <Feather name="camera" size={48} color={COLORS.primary} />
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permText}>
            SafeGuard needs camera access to record video evidence during an emergency.
          </Text>
          <Pressable style={styles.grantBtn} onPress={async () => {
            await requestCameraPermission();
            if (!mediaPermission?.granted) await requestMediaPermission();
          }}>
            <Text style={styles.grantBtnText}>Grant Camera Access</Text>
          </Pressable>
          <Pressable style={styles.backBtnOutline} onPress={() => router.back()}>
            <Text style={styles.backBtnOutlineText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        videoQuality="720p"
      />

      <View style={[styles.overlay, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topBar}>
          <Pressable
            style={styles.closeBtn}
            onPress={() => {
              if (isRecording) stopRecording();
              else router.back();
            }}
          >
            <Feather name="x" size={20} color="#fff" />
          </Pressable>

          {isRecording && (
            <View style={styles.recBadge}>
              <Animated.View style={[styles.recDot, dotStyle]} />
              <Text style={styles.recText}>REC {formatTime(elapsed)}</Text>
            </View>
          )}

          <Pressable
            style={styles.flipBtn}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          >
            <Feather name="refresh-cw" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.evidenceLabel}>EVIDENCE RECORDING</Text>
        <Text style={styles.evidenceHint}>
          {isRecording ? "Recording in progress — tap to stop" : "Tap to start recording"}
        </Text>

        <Pressable
          style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
          onPress={handleRecordPress}
        >
          {isRecording ? (
            <View style={styles.stopIcon} />
          ) : (
            <View style={styles.recordIcon} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { alignItems: "center", justifyContent: "center", padding: 24 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(200,0,0,0.8)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  recText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  flipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  evidenceLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
    letterSpacing: 2,
  },
  evidenceHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  recordBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  recordBtnActive: {
    borderColor: COLORS.primary,
  },
  recordIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  unsupportedCard: {
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 32,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: "100%",
  },
  unsupportedTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  unsupportedText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
  },
  permCard: {
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 32,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: "100%",
  },
  permTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
    textAlign: "center",
  },
  permText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 20,
  },
  grantBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
    alignItems: "center",
  },
  grantBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  backBtnOutline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: "100%",
    alignItems: "center",
  },
  backBtnOutlineText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSub,
  },
});
