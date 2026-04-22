import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello from folio.e8e</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.ink,
    fontSize: 24,
    letterSpacing: -0.5,
  },
});
