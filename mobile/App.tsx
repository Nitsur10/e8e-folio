import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello from folio.e8e</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f100d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#f6f4ee',
    fontSize: 24,
    letterSpacing: -0.5,
  },
});
