import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { COLORS } from "@/constants/colors";

type Props = {
  onPress: () => void;
  isActive?: boolean;
  size?: number;
};

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    const timeout = setTimeout(() => {
      scale.value = withRepeat(
        withTiming(2.2, { duration: 2000, easing: Easing.out(Easing.exp) }),
        -1,
        false
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.exp) }),
        -1,
        false
      );
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: COLORS.primary,
        },
      ]}
    />
  );
}

export function SOSButton({ onPress, isActive = false, size = 180 }: Props) {
  const pressScale = useSharedValue(1);
  const innerSize = size * 0.78;

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.94, { duration: 100 });
  };

  const handlePressOut = () => {
    pressScale.value = withSequence(
      withTiming(1.04, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {!isActive && (
        <>
          <PulseRing delay={0} size={size} />
          <PulseRing delay={700} size={size} />
          <PulseRing delay={1400} size={size} />
        </>
      )}
      <Animated.View style={[pressStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.button,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: isActive ? "#8B0000" : COLORS.primary,
              shadowColor: COLORS.primary,
            },
          ]}
        >
          <Text style={styles.label}>SOS</Text>
          <Text style={styles.sublabel}>{isActive ? "ACTIVE" : "Hold to trigger"}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    gap: 4,
  },
  label: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  sublabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
