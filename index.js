/**
 * @format
 */
 
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
// import React from 'react';
// import { AppUsageProvider } from ''; // your context provider
// import { AppUsageProvider } from './src/contextAPI/contextapi'; // your context provider

// Wrap App with provider here
// const Root = () => (
//   <AppUsageProvider>
//     <App />
//   </AppUsageProvider>
// );

AppRegistry.registerComponent(appName, () => App);
