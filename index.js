import {AppRegistry} from 'react-native';
import App from './App'; // Path to your main App component
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
