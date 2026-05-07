import { Feather } from "@expo/vector-icons";
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import React, { useRef, useState, useCallback } from "react";
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
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [facing, setFacing] = useState<CameraType>("back");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  const dotOpacity = useSharedValue(1);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Save video to library — handles Expo Go limitations gracefully
  const trySaveToLibrary = async (uri: string) => {
    try {
      // Request full write access (true = writeOnly is false, we need read+write)
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        await MediaLibrary.saveToLibraryAsync(uri);
        return "saved";
      }
      if (!canAskAgain) return "settings";
    } catch (e: any) {
      // Expo Go on Android 13+ cannot access full media library — this is expected
      console.warn("[video] Could not save to library:", e?.message);
    }
    return "failed";
  };

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isRecordingRef.current) return;
    try {
      if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      isRecordingRef.current = true;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      dotOpacity.value = withRepeat(withTiming(0.1, { duration: 500 }), -1, true);

      const video = await cameraRef.current.recordAsync({ maxDuration: 300 });

      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      dotOpacity.value = 1;
      isRecordingRef.current = false;
      setIsRecording(false);

      if (video?.uri) {
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const saveResult = await trySaveToLibrary(video.uri);
        if (saveResult === "saved") {
          Alert.alert(
            "Video Saved",
            "Evidence video saved permanently to your photo library.",
            [{ text: "OK", onPress: () => router.back() }]
          );
        } else if (saveResult === "settings") {
          Alert.alert(
            "Permission Required",
            "Media Library access was denied. Go to Settings → SafeGuard → Photos and enable access to save videos.",
            [
              { text: "Cancel", onPress: () => router.back() },
              { text: "Open Settings", onPress: () => {
                const { Linking } = require("react-native");
                Linking.openSettings();
              }},
            ]
          );
        } else {
          Alert.alert(
            "Video Recorded",
            "Recording complete. Grant Media Library access to save videos permanently to your device.",
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      }
    } catch (e: any) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      dotOpacity.value = 1;
      isRecordingRef.current = false;
      setIsRecording(false);
      // Suppress expected "recording stopped" error
      if (!String(e?.message).toLowerCase().includes("cancel") &&
          !String(e?.message).toLowerCase().includes("stop")) {
        console.warn("[video] Recording error:", e?.message);
      }
    }
  }, [isCameraReady]);

  const stopRecording = useCallback(() => {
    if (!cameraRef.current || !isRecordingRef.current) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cameraRef.current.stopRecording();
  }, []);

  const handleRequestPermissions = async () => {
    await requestCameraPermission();
    await requestMicPermission();
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.card}>
          <Feather name="camera-off" size={48} color={COLORS.textMuted} />
          <Text style={styles.cardTitle}>Camera Not Available</Text>
          <Text style={styles.cardText}>Video recording requires iOS or Android.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!cameraPermission || !micPermission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.card}>
          <Feather name="camera" size={48} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Permissions Required</Text>
          <Text style={styles.cardText}>
            Camera and microphone access are needed to record emergency evidence.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={handleRequestPermissions}>
            <Text style={styles.primaryBtnText}>Grant Permissions</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>Go Back</Text>
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
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.iconBtn} onPress={() => { if (isRecording) stopRecording(); else router.back(); }}>
          <Feather name="x" size={20} color="#fff" />
        </Pressable>

        {isRecording && (
          <View style={styles.recBadge}>
            <Animated.View style={[styles.recDot, dotStyle]} />
            <Text style={styles.recText}>REC {formatTime(elapsed)}</Text>
          </View>
        )}

        <Pressable style={styles.iconBtn} onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}>
          <Feather name="refresh-cw" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.evidenceLabel}>EVIDENCE RECORDING</Text>
        <Text style={styles.evidenceHint}>
          {!isCameraReady ? "Camera initialising..." : isRecording ? "Recording — tap to stop" : "Tap to start recording"}
        </Text>
        <Pressable
          style={[styles.recordBtn, isRecording && styles.recordBtnActive, !isCameraReady && styles.recordBtnDisabled]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={!isCameraReady}
        >
          {isRecording ? <View style={styles.stopIcon} /> : <View style={styles.recordIcon} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textMuted },
  card: {
    alignItems: "center", backgroundColor: COLORS.bgCard, borderRadius: 20,
    padding: 32, gap: 16, borderWidth: 1, borderColor: COLORS.border, width: "100%",
  },
  cardTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: COLORS.text, textAlign: "center" },
  cardText: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center", lineHeight: 20 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: "100%", justifyContent: "center",
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  secondaryBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28, width: "100%", alignItems: "center" },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.textSub },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  recBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(180,0,0,0.85)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  recText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", gap: 8, paddingTop: 20, backgroundColor: "rgba(0,0,0,0.55)" },
  evidenceLabel: { fontSize: 11, fontFamily: "Inter_700Bold", color: COLORS.primary, letterSpacing: 2 },
  evidenceHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 8 },
  recordBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  recordBtnActive: { borderColor: COLORS.primary },
  recordBtnDisabled: { opacity: 0.4 },
  recordIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary },
  stopIcon: { width: 28, height: 28, borderRadius: 6, backgroundColor: COLORS.primary },
});
