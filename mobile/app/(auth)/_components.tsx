import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.brand}>
          folio<Text style={styles.brandAccent}>.e8e</Text>
        </Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function AuthTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function AuthSubtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function AuthError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function AuthField({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.inkQuiet}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  onPress,
  label,
  pending,
}: {
  onPress: () => void;
  label: string;
  pending?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      style={({ pressed }) => [
        styles.button,
        { opacity: pending ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={styles.buttonLabel}>{pending ? 'Working…' : label}</Text>
    </Pressable>
  );
}

export function GhostLink({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.ghostLink}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  card: {
    flex: 1,
    padding: theme.spacing['3xl'],
    gap: theme.spacing.xl,
    justifyContent: 'center',
  },
  brand: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  brandAccent: {
    color: theme.colors.amber,
    fontStyle: 'italic',
  },
  title: {
    color: theme.colors.ink,
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.colors.inkDim,
    fontSize: 14,
    lineHeight: 21,
  },
  field: {
    gap: 6,
  },
  label: {
    color: theme.colors.inkQuiet,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.surface2,
    borderColor: theme.colors.rule,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    color: theme.colors.ink,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hint: {
    color: theme.colors.inkQuiet,
    fontSize: 12,
  },
  error: {
    backgroundColor: theme.colors.roseBg,
    borderColor: theme.colors.rose,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: 10,
  },
  errorText: {
    color: theme.colors.rose,
    fontSize: 13,
  },
  button: {
    backgroundColor: theme.colors.amber,
    borderRadius: theme.radii.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonLabel: {
    color: theme.colors.bg,
    fontSize: 15,
    fontWeight: '600',
  },
  ghostLink: {
    color: theme.colors.amber,
    fontSize: 13,
    textAlign: 'center',
  },
});
