import { StyleSheet } from 'react-native';

const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row', // Adjust layout for landscape mode
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  title: {
    fontSize: 32, // Larger font size for tablet
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default globalStyles;