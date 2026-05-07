import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FAKE_CALLER = {
  name: "Dad",
  number: "+1 (555) 847-2031",
};

const DELAY_OPTIONS: { label: string; seconds: number }[] = [
  { label: "Now", seconds: 0 },
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
];

const CONVERSATION: { text: string; delay: number }[] = [
  { text: "Hey, where are you? I'm waiting downstairs.", delay: 500 },
  { text: "Hello? Can you hear me?", delay: 5500 },
  {
    text: "I've been waiting for 10 minutes. I'm coming up to get you, okay? Just stay where you are.",
    delay: 10000,
  },
  { text: "I can see the entrance. Are you near the door?", delay: 18000 },
  {
    text: "Okay I see you. I'm coming right now. Just stay on the line.",
    delay: 24000,
  },
];

type CallState = "scheduling" | "countdown" | "ringing" | "active";

export default function FakeCallScreen() {
  const insets = useSafeAreaInsets();
  const [callState, setCallState] = useState<CallState>("scheduling");
  const [selectedDelay, setSelectedDelay] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [duration, setDuration] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const vibIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRinging = useCallback(() => {
    setCallState("ringing");

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    pulse.start();

    const rippleAnim = (ripple: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(ripple, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(ripple, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    rippleAnim(ripple1, 0).start();
    rippleAnim(ripple2, 900).start();

    if (Platform.OS !== "web") {
      vibIntervalRef.current = setInterval(() => {
        Vibration.vibrate(600);
      }, 2500);
    }
  }, [pulseAnim, ripple1, ripple2]);

  const scheduleCall = useCallback(
    (delaySecs: number) => {
      setSelectedDelay(delaySecs);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      if (delaySecs === 0) {
        startRinging();
      } else {
        setCountdown(delaySecs);
        setCallState("countdown");
      }
    },
    [startRinging]
  );

  useEffect(() => {
    if (callState !== "countdown") return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          startRinging();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [callState, startRinging]);

  const endCall = useCallback(() => {
    Speech.stop();
    Vibration.cancel();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (vibIntervalRef.current) clearInterval(vibIntervalRef.current);
    speechTimersRef.current.forEach(clearTimeout);
    router.back();
  }, []);

  const answerCall = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.cancel();
    }
    if (vibIntervalRef.current) clearInterval(vibIntervalRef.current);
    setCallState("active");

    CONVERSATION.forEach(({ text, delay }) => {
      const t = setTimeout(() => {
        Speech.speak(text, { language: "en-US", pitch: 0.72, rate: 0.88 });
      }, delay);
      speechTimersRef.current.push(t);
    });

    callTimerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
      Vibration.cancel();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (vibIntervalRef.current) clearInterval(vibIntervalRef.current);
      speechTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  const fmtCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m > 0) return `${m}:${sec.toString().padStart(2, "0")}`;
    return `${sec}s`;
  };

  const rippleStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.25, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  });

  const topPad = insets.top + (Platform.OS === "web" ? 80 : 40);
  const botPad = insets.bottom + (Platform.OS === "web" ? 40 : 24);

  if (callState === "scheduling") {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
        <View style={styles.scheduleHeader}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="x" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <MaterialCommunityIcons name="phone-incoming" size={52} color="#22c55e" />
          <Text style={styles.scheduleTitle}>Schedule Fake Call</Text>
          <Text style={styles.scheduleSubtitle}>
            "Dad" will call you after the selected delay — put your phone away and act natural
          </Text>
        </View>

        <View style={styles.delayGrid}>
          {DELAY_OPTIONS.map(({ label, seconds }) => (
            <Pressable
              key={label}
              style={styles.delayCard}
              onPress={() => scheduleCall(seconds)}
            >
              <Text style={styles.delayLabel}>{label}</Text>
              {seconds > 0 && (
                <Text style={styles.delayHint}>Ring in {label}</Text>
              )}
              {seconds === 0 && (
                <Text style={styles.delayHint}>Ring immediately</Text>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.scheduleFooter}>
          <MaterialCommunityIcons name="shield-check" size={14} color="rgba(255,255,255,0.3)" />
          <Text style={styles.footerText}>
            Audio plays in a deep male voice to deter attackers
          </Text>
        </View>
      </View>
    );
  }

  if (callState === "countdown") {
    return (
      <View style={[styles.container, styles.countdownContainer, { paddingTop: topPad, paddingBottom: botPad }]}>
        <View style={styles.countdownInner}>
          <Text style={styles.countdownLabel}>Call ringing in</Text>
          <Text style={styles.countdownNumber}>{fmtCountdown(countdown)}</Text>
          <Text style={styles.countdownSub}>Put your phone away and act natural</Text>
        </View>
        <Pressable style={styles.cancelCountdownBtn} onPress={endCall}>
          <Feather name="x" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.cancelCountdownText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.callerSection}>
        <Text style={styles.statusText}>
          {callState === "ringing" ? "Incoming Call" : fmt(duration)}
        </Text>

        <View style={styles.avatarContainer}>
          {callState === "ringing" && (
            <>
              <Animated.View style={[styles.ripple, rippleStyle(ripple1)]} />
              <Animated.View style={[styles.ripple, rippleStyle(ripple2)]} />
            </>
          )}
          <Animated.View
            style={[
              styles.avatarRing,
              callState === "ringing" && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={72} color="#c8d8f0" />
            </View>
          </Animated.View>
        </View>

        <Text style={styles.callerName}>{FAKE_CALLER.name}</Text>
        <Text style={styles.callerNumber}>{FAKE_CALLER.number}</Text>
        <Text style={styles.callerSub}>Mobile</Text>

        {callState === "active" && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Speaking...</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        {callState === "ringing" ? (
          <>
            <View style={styles.actionItem}>
              <Pressable style={[styles.actionBtn, styles.declineBtn]} onPress={endCall}>
                <Feather name="phone-off" size={30} color="#fff" />
              </Pressable>
              <Text style={styles.actionLabel}>Decline</Text>
            </View>
            <View style={styles.actionItem}>
              <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={answerCall}>
                <Feather name="phone" size={30} color="#fff" />
              </Pressable>
              <Text style={styles.actionLabel}>Accept</Text>
            </View>
          </>
        ) : (
          <View style={styles.actionItem}>
            <Pressable style={[styles.actionBtn, styles.declineBtn]} onPress={endCall}>
              <Feather name="phone-off" size={30} color="#fff" />
            </Pressable>
            <Text style={styles.actionLabel}>End Call</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
  },
  scheduleHeader: {
    alignItems: "center",
    gap: 14,
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  backBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  scheduleTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  scheduleSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  delayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  delayCard: {
    width: "46%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.25)",
  },
  delayLabel: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#22c55e",
  },
  delayHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  scheduleFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    flex: 1,
  },
  countdownContainer: {
    justifyContent: "center",
    gap: 40,
  },
  countdownInner: {
    alignItems: "center",
    gap: 12,
  },
  countdownLabel: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
  },
  countdownNumber: {
    fontSize: 88,
    fontFamily: "Inter_700Bold",
    color: "#22c55e",
    lineHeight: 96,
    letterSpacing: -2,
  },
  countdownSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  cancelCountdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cancelCountdownText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },
  callerSection: {
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  ripple: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#4ade80",
  },
  avatarRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  callerName: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  callerNumber: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  callerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(74,222,128,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    marginTop: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  activeText: {
    color: "#4ade80",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionItem: {
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptBtn: {
    backgroundColor: "#22c55e",
  },
  declineBtn: {
    backgroundColor: "#ef4444",
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.65)",
  },
});
