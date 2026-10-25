import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { COPY } from '@shared/config/copy';

import { colors, MIN_TOUCH, radius, space } from './theme';

const SKELETON_COUNT = 3;
const PULSE_MS = 800;

type Props =
  | { kind: 'loading'; skeleton: 'cards' | 'rows' }
  | {
      kind: 'empty' | 'error';
      title: string;
      message?: string;
      actionLabel?: string;
      onAction?: () => void;
    };

const Skeleton = ({ variant }: { variant: 'cards' | 'rows' }) => {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity, gap: space.md }}
      accessibilityRole='progressbar'
      accessibilityLabel={COPY.loadingLabel}
    >
      {Array.from({ length: SKELETON_COUNT }, (_, i) =>
        variant === 'cards' ? (
          <View key={i} style={styles.skeletonCard}>
            <View style={[styles.bar, { width: '85%', height: 18 }]} />
            <View style={[styles.bar, { width: '35%' }]} />
            <View style={[styles.bar, { width: '100%' }]} />
            <View style={[styles.bar, { width: '70%' }]} />
          </View>
        ) : (
          <View key={i} style={[styles.bar, styles.skeletonRow]} />
        ),
      )}
    </Animated.View>
  );
};

export const StateView = (props: Props) => {
  if (props.kind === 'loading') return <Skeleton variant={props.skeleton} />;

  const { title, message, actionLabel, onAction } = props;
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole='button'
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  message: { fontSize: 15, lineHeight: 22, color: colors.textSub, textAlign: 'center' },
  action: {
    marginTop: space.md,
    minHeight: MIN_TOUCH,
    paddingHorizontal: space.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: colors.onAccent },
  skeletonCard: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  skeletonRow: { height: 52, width: '100%', borderRadius: radius.sm },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.skeleton },
});
