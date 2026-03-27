import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
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

import { COLORS } from "@/constants/colors";

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  countdownSeconds?: number;
};

export function VerificationModal({
  visible,
  onConfirm,
  onCancel,
  countdownSeconds = 8,
}: Props) {
  const [remaining, setRemaining] = useState(countdownSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      setRemaining(countdownSeconds);
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRemaining(countdownSeconds);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const progress = (remaining / countdownSeconds) * 100;

  const handleCancel = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onCancel();
  };

  const handleConfirm = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Animated.View style={[styles.alertBadge, pulseStyle]}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={28}
              color={COLORS.primary}
            />
          </Animated.View>

          <Text style={styles.title}>Threat Detected</Text>
          <Text style={styles.subtitle}>
            SOS will activate automatically in
          </Text>

          <View style={styles.countdownContainer}>
            <Text style={styles.countdown}>{remaining}</Text>
            <Text style={styles.countdownSub}>seconds</Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: `${progress}%` as any },
              ]}
            />
          </View>

          <Text style={styles.instructions}>
            Shake your phone 3 times or press SEND NOW to activate immediately
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnCancel]}
              onPress={handleCancel}
            >
              <Feather name="x" size={18} color={COLORS.textSub} />
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnConfirm]}
              onPress={handleConfirm}
            >
              <MaterialCommunityIcons name="send" size={18} color="#fff" />
              <Text style={styles.btnConfirmText}>Send Now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  alertBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginBottom: 20,
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  countdown: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
    lineHeight: 72,
  },
  countdownSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSub,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  instructions: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  btnCancel: {
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textSub,
  },
  btnConfirm: {
    backgroundColor: COLORS.primary,
  },
  btnConfirmText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
