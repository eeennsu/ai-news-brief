import { useMutation } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { COPY } from '@shared/config/copy';
import { PushTokenError, registerForPushToken } from '@shared/lib/notifications';
import { colors, MIN_TOUCH, radius, space } from '@shared/ui/theme';

const errorCopy = (error: Error) => {
  if (!(error instanceof PushTokenError)) return COPY.pushToken.failed;
  return error.reason === 'permission'
    ? COPY.pushToken.permissionDenied
    : COPY.pushToken.missingProjectId;
};

export const PushTokenPanel = () => {
  const { mutate, data, error, isPending } = useMutation({ mutationFn: registerForPushToken });

  return (
    <View style={styles.panel}>
      <Pressable
        accessibilityRole='button'
        disabled={isPending}
        onPress={() => mutate()}
        style={({ pressed }) => [styles.button, (pressed || isPending) && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>{COPY.pushToken.action}</Text>
      </Pressable>
      {isPending ? (
        <ActivityIndicator color={colors.accent} accessibilityLabel={COPY.pushToken.loadingLabel} />
      ) : null}
      {data ? (
        <Text selectable style={styles.token}>
          {data}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{errorCopy(error)}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { marginTop: space.xl, gap: space.sm },
  button: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: space.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  buttonLabel: { fontSize: 15, fontWeight: '600', color: colors.onAccent },
  token: { fontSize: 14, lineHeight: 20, color: colors.text },
  error: { fontSize: 15, lineHeight: 22, color: colors.textSub },
});
