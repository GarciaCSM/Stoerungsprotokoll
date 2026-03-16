import { registerRootComponent } from 'expo';

// Hintergrund-Task muss vor dem App-Start importiert/definiert werden
import './src/tasks/backgroundSyncTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
