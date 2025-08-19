import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundService from 'react-native-background-actions';

const { ForegroundApp } = NativeModules;
const getTodayKey = () => new Date().toISOString().split('T')[0];

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [appUsage, setAppUsage] = useState(null);
  const [apps, setApps] = useState('null hello');
  const lastAppRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const [count, setCount] = useState(0);

  // current app vi
  const [currentAppInfo, setCurrentAppInfo] = useState(null);
  const [previousAppInfo, setPreviousAppInfo] = useState(null);
  const appUsageRef = useRef(null);

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const initializeImportedApps = useCallback(async () => {
    const todayKey = getTodayKey();
    const usageObj = {
      'com.whatsapp': {
        appName: 'WhatsApp',
        packageName: 'com.whatsapp',
        timeLimitInMinutes: 1,
        usageHistory: { [todayKey]: 0 },
        lastNotifiedAt: null,
      },
      'com.test_background': {
        appName: 'com.test_background',
        packageName: 'com.test_background',
        timeLimitInMinutes: 2,
        usageHistory: { [todayKey]: 0 },
        lastNotifiedAt: null,
      },
    };

    // ✅ update state
    // setAppUsage('Hello usageApp');
    // setApps(usageObj);
    appUsageRef.current = usageObj; // Store in ref for quick access

    // ✅ log local object directly
    console.log('✅ usageObj created:', usageObj);

    startBackgroundService();
    Alert.alert('🎉 Setup Done', 'Imported dummy apps for testing.');
  }, []);

  // const loadAppUsage = useCallback(async () => {
  //   const stored = await AsyncStorage.getItem('@importedAppsUsage');
  //   if (stored) {
  //     setAppUsage(JSON.parse(stored));
  //   } else {
  //     initializeImportedApps();
  //   }
  // }, [initializeImportedApps]);

  // -----------------

  const saveAppUsage = useCallback(async updated => {
    setAppUsage(prev => ({ ...prev, ...updated }));
    // await AsyncStorage.setItem('@importedAppsUsage', JSON.stringify(updated));
  }, []);

  // Function to show blocking alert when time limit is exceeded
  const showBlockingAlert = useCallback(
    (appName, updatedAppData, packageName) => {
      console.log('blockAlert: ==============: ', appName);
      const now = Date.now();
      const lastNotified = updatedAppData.lastNotifiedAt || 0;

      if (now - lastNotified > 10000) {
        // show alert every 10s max
        // Alert.alert(
        //   '⚠️ Time Limit Exceeded',
        //   `You've exceeded your screen time limit for ${appName}.`,
        // );
        ForegroundApp.showOverlay(appName);

        console.log('showBlockingAlert: ', packageName);
        // Update last notified time
        updatedAppData.lastNotifiedAt = now;
      }

      return updatedAppData;
    },
    [],
  );

  // Define a memoized function to track foreground app usage time.
  // It uses useCallback to avoid unnecessary re-creations of the function.
  const getCurrentAppUsageDuration = useCallback(async () => {
    try {
      // 1️⃣ Check if the screen is ON using native module
      const isScreenOn = await ForegroundApp.isScreenOn();
      console.log('isScreenOn:', isScreenOn);
      // console.log('appUsageRef: ', appUsageRef);

      // 2️⃣ If screen is OFF, skip tracking logic and reset references
      if (!isScreenOn) {
        console.log('Screen is off. Skipping usage tracking.');

        // Reset last known app and timestamp to avoid counting incorrect time
        lastAppRef.current = null;
        lastTimestampRef.current = null;

        // Debug log: print current app usage state
        // console.log('AppUsage: ', appUsage);
        return; // Exit early since there's nothing to track when screen is off
      }

      // 3️⃣ Debug: Log the last tracked app and how long it's been since last check
      // console.log('lastAppRef: ', lastAppRef.current);
      // console.log('lastTimestampRef: ', lastTimestampRef.current);

      // 4️⃣ Get the currently open foreground app from native code
      const packageName = await ForegroundApp.getCurrentForegroundApp();
      lastAppRef.current = packageName; // Update last known app
      console.log('Current foreground app:', packageName);
      updatePackageTracking(); // Call to update package tracking

      // update lastAppRef
    } catch (err) {
      // 2️⃣1️⃣ Catch and log any errors from native calls or logic
      console.warn(err.code);
      // check app is still in foreground
      if (err.code === 'NO_APP') {
        await updatePackageTracking();
      }
      console.log('Error in foreground detection:', err.message);
    }
  }, []);
  // }, [appUsage, saveAppUsage, showBlockingAlert]);

  // update current package tracking
  const updatePackageTracking = async _ => {
    // 5️⃣ Get the current time in milliseconds
    const currentTime = Date.now();

    // 6️⃣ Retrieve the previously stored app and its timestamp
    const lastApp = lastAppRef.current;
    const lastTimestamp = lastTimestampRef.current;
    const appUsage = appUsageRef.current || {};
    console.log('appUsage===: ', appUsage);

    // 7️⃣ If we were tracking the same app and timestamp is valid
    if (appUsage[lastApp] && lastTimestamp) {
      // 8️⃣ Calculate time spent in this app since the last check (in seconds)
      const deltaSeconds = Math.floor((currentTime - lastTimestamp) / 1000);
      console.log('deltaSeconds: ', deltaSeconds);

      if (deltaSeconds > 0) {
        // 9️⃣ Make a copy of the app usage object to update it
        const updated = { ...appUsage };

        // 🔟 Get today's date key to store daily usage (e.g., "2025-08-07")
        const todayKey = getTodayKey();

        // 1️⃣1️⃣ If this app is in the tracked list
        if (updated[lastApp]) {
          // 1️⃣2️⃣ Get existing usage or 0 if not present for today
          const currentUsage = updated[lastApp].usageHistory[todayKey] || 0;

          // 1️⃣3️⃣ Add the new duration to existing usage
          updated[lastApp].usageHistory[todayKey] = currentUsage + deltaSeconds;

          // 1️⃣4️⃣ Get usage limit in seconds (limit is stored in minutes)
          const limit = updated[lastApp].timeLimitInMinutes * 60;

          // 1️⃣5️⃣ If user has crossed the time limit
          console.log(
            `Time limit is exceeded for ${lastApp}: `,
            updated[lastApp].usageHistory[todayKey],
          );
          if (updated[lastApp].usageHistory[todayKey] >= limit) {
            // 1️⃣6️⃣ Show a blocking alert and update that app’s data
            updated[lastApp] = showBlockingAlert(
              updated[lastApp].appName,
              updated[lastApp],
              lastApp,
            );
          }

          // 1️⃣7️⃣ Save updated app usage to storage (e.g., AsyncStorage or SQLite)
          // await saveAppUsage(prev => ({ ...updated }));
          appUsageRef.current = updated; // Update the ref with new data
          console.log('Updated app usage:', updated);
        }

        // 1️⃣8️⃣ Update UI state with the previous app's name and usage duration
        // setPreviousAppInfo(prev => ({
        //   ...prev,
        //   packageName: lastApp,
        //   duration: deltaSeconds,
        // }));
      }
    }

    // 1️⃣9️⃣ Update last known app and timestamp for the next run
    // lastAppRef.current = packageName;
    console.log('appUsage[lastApp]: ', appUsage[lastApp]);
    if (appUsage[lastApp]) {
      lastTimestampRef.current = currentTime;
      console.log(
        'lastTimestampRef (if last) ----: ',
        lastTimestampRef.current,
      );
    } else {
      lastTimestampRef.current = null;
      console.log(
        'lastTimestampRef (else last) ----: ',
        lastTimestampRef.current,
      );
    }
  };

  // check current app-------------------------
  // const checkCurrentApp = useCallback(packageName => {
  //   // 1️⃣ If packageName is not in the appUsage list, return false
  //   if (!appUsage[packageName]) {
  //     console.log(`App ${packageName} is not being tracked.`);
  //     return false;
  //   }

  //   return true; // 2️⃣ If packageName is in the appUsage list, return true
  // }, []);

  // start background service
  const backgroundTask = async ({ delay }) => {
    await new Promise(async () => {
      while (BackgroundService.isRunning()) {
        await getCurrentAppUsageDuration();
        await sleep(delay);
      }
    });
  };

  const serviceOptions = {
    taskName: 'App Tracker',
    taskTitle: 'Tracking Foreground Apps',
    taskDesc: 'Running background service to monitor app usage.',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#ff00ff',
    parameters: {
      delay: 5000,
    },
  };

  // check usage access---------------
  const checkUsageAccess = useCallback(async () => {
    const granted = await ForegroundApp.isUsageAccessGranted();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Please grant Usage Access Permission Or Make sure it is Allowed.',
        [
          {
            text: 'Open Settings',
            onPress: () => ForegroundApp.openUsageSettings(),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, []);

  const startBackgroundService = useCallback(async () => {
    // await checkUsageAccess();
    const isRunning = await BackgroundService.isRunning();
    if (!isRunning) {
      await BackgroundService.start(backgroundTask, serviceOptions);
    }
  }, []);

  useEffect(() => {
    // const loadAppUsage = async () => {
    // }

    initializeImportedApps();
    checkUsageAccess();
    // startBackgroundService();
    // loadAppUsage();
    // Linking.openURL('android.settings.ACCESSIBILITY_SETTINGS');
  }, []);

  return (
    <View style={styles.container}>
      <Pressable style={styles.startButton} onPress={checkUsageAccess}>
        <Text style={[styles.buttonText, isDarkMode && styles.darkText]}>
          Check Usage Access
        </Text>
      </Pressable>
      <Text style={{ marginTop: 5 }}>
        <Text style={{ fontWeight: 'bold' }}>Previous App:</Text>{' '}
        {previousAppInfo?.packageName || '-'} used for{' '}
        {previousAppInfo?.duration ? `${previousAppInfo.duration}s` : '-'}
      </Text>
      <Pressable onPress={() => setCount(count + 1)}>
        <Text>Increase</Text>
      </Pressable>
      <Pressable onPress={() => setCount(count - 1)}>
        <Text>Decrease</Text>
      </Pressable>
      <Text>Count: {count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    gap: 10,
  },
  startButton: {
    padding: 12,
    backgroundColor: 'blue',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  darkText: {
    color: '#fff',
  },
});

export default App;

// =======================================================

// check current app is in list and manage time
// 1. If app is not in list then do nothing
// 2. if foreground app is in list then update timestamp that for do next task 3
// 3. If foreground app is new then update last app and timestamp from start
// 4. after this return true
// 5. do next process of updatePackageTracking()

// CASE:
// 1. In first time it returns package name
// 2. In second time it rreturns "NO_APP" error
// 3. Again app changes it returns package name and again "NO_APP" error
// 4. If screen is off then lastAppRef.current = null; lastTimestampRef.current = null;
// When screen is on then again getCurrentAppUsageDuration() will call and it will return package name
// and again return "NO_APP" error

// TASK:
// 1. Update the current app usage duration from opening to closing
// 2. If current package is in list then start counting time then whenever
// getCurrentAppUsageDuration() return 'NO_APP' error till app does not change
// - So count time continue till app does not change
// - If app change and current package is not in list then set lastAppRef.current = null; lastTimestampRef.current = null;

// Solution:
//

// ============ It is OK
// If foreground app is not in list then do nothing
// If foreground app is new and it is in list then update timestamp with current time else don't update timestamp
// If foreground app is in list then update timestamp with current time ===> (Wrong logic)
// -  If I do this then time count will be 0 or wrong
// previous package and current package is same and it is in list
// update current app timestamp

// =======================================================================

// console.log('Current foreground app:', packageName);

// lastAppRef.current = packageName;
// calling updatePackageTracking
// If foreground app is new
// when screen will off then lastAppRef.current = null; // tow way to set null, 1. in app starting, 2. when screen is off
// lastTimestampRef.current = null; // two way to set null, 1. in app starting, 2. when screen is off

// case 1: when app start Then getCurrentForegroundApp() returns current foreground app 2 times after returns "NO_APP" Error
// case 2: When foreground app is changed then again getCurrentForegroundApp() returns current foreground app 2 times after returns "NO_APP" Error
// case 3: when screen will off: lastAppRef.current = null; lastTimestampRef.current = null; in screen on case 1.

// DO
// You have to manage timeStamp of app in only Try
// Assume after ruterning package name 2 times When
// -"NO_APP" error will come that time consider your current foreground app is still in foreground.
// When screen off:
// - Do lastAppRef.current = null; lastTimestampRef.current = null;
// - because we want to check again current app again

//  it is in list then update timestamp with current time else don't update timestamp
// if (checkCurrentApp(packageName)) {

// }
// await updatePackageTracking();

// =================================================================================

// =============== goal
// if app in list then add used time in its data
// update last used time
// when screen is off:     lastAppRef.current = null;
// lastTimestampRef.current = 0;

// Updated App.js with full usage tracking, limits, AsyncStorage, and popup alert logic

// import React, { useEffect, useState, useCallback, useRef } from 'react';
// import {
//   Alert,
//   Pressable,
//   StyleSheet,
//   Text,
//   useColorScheme,
//   View,
//   NativeModules,
//   NativeEventEmitter,
//   Linking,
//   Platform,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import BackgroundService from 'react-native-background-actions';

// const { ForegroundApp } = NativeModules;

// const getTodayKey = () => new Date().toISOString().split('T')[0];

// const App = () => {
//   const isDarkMode = useColorScheme() === 'dark';
//   const [appUsage, setAppUsage] = useState({});
//   const usageRef = useRef({});

//   const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

//   const cleanupOldData = useCallback(data => {
//     const oneWeekAgo = new Date();
//     oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
//     const limitDateKey = oneWeekAgo.toISOString().split('T')[0];

//     const cleaned = {};
//     for (const key in data) {
//       cleaned[key] = {
//         ...data[key],
//         usageHistory: Object.fromEntries(
//           Object.entries(data[key].usageHistory).filter(
//             ([date]) => date >= limitDateKey,
//           ),
//         ),
//       };
//     }
//     return cleaned;
//   }, []);

//   const initializeImportedApps = useCallback(async () => {
//     const todayKey = getTodayKey();
//     const usageObj = {
//       'com.whatsapp': {
//         appName: 'WhatsApp',
//         packageName: 'com.whatsapp',
//         timeLimitInMinutes: 1,
//         usageHistory: { [todayKey]: 0 },
//         lastNotifiedAt: null,
//       },
//       'com.instagram.android': {
//         appName: 'Instagram',
//         packageName: 'com.instagram.android',
//         timeLimitInMinutes: 2,
//         usageHistory: { [todayKey]: 0 },
//         lastNotifiedAt: null,
//       },
//     };
//     await AsyncStorage.setItem('@importedAppsUsage', JSON.stringify(usageObj));
//     setAppUsage(prev => ({ ...prev, ...usageObj }));
//     Alert.alert('🎉 Setup Done', 'Imported dummy apps for testing.');
//   }, []);

//   const loadAppUsage = useCallback(async () => {
//     const stored = await AsyncStorage.getItem('@importedAppsUsage');
//     if (stored) {
//       const parsed = cleanupOldData(JSON.parse(stored));
//       console.log('Loaded app usage from storage: ', parsed);
//       setAppUsage(parsed);
//     } else {
//       initializeImportedApps();
//     }
//   }, [initializeImportedApps, cleanupOldData]);

//   const saveAppUsage = useCallback(async updated => {
//     setAppUsage(prev => ({ ...prev, ...updated }));
//     await AsyncStorage.setItem('@importedAppsUsage', JSON.stringify(updated));
//   }, []);

//   // Function to get current app usage duration
//   const getCurrentAppUsageDuration = useCallback(async () => {
//     try {
//       console.log('Fetching current app usage duration...');
//       const result = await ForegroundApp.getCurrentForegroundApp();
//       console.log('Current app usage duration fetched:', result);
//     } catch (err) {
//       console.log(err);
//       console.warn('Error fetching current app usage:', err.message || err);
//     }
//   }, [appUsage, saveAppUsage]);

//   const backgroundTask = async ({ delay }) => {
//     await new Promise(async () => {
//       while (BackgroundService.isRunning()) {
//         await getCurrentAppUsageDuration();
//         await sleep(delay);
//       }
//     });
//   };

//   const serviceOptions = {
//     taskName: 'Test_Background',
//     taskTitle: 'Tracking Foreground Activity',
//     taskDesc: 'Monitoring selected apps to help you save screen time.',
//     taskIcon: {
//       name: 'ic_launcher',
//       type: 'mipmap',
//     },
//     color: '#ff00ff',
//     linkingURI: 'yourSchemeHere://chat/jane',
//     parameters: {
//       delay: 5000,
//     },
//   };

//   // To check app permission
//   const checkUsageAccess = useCallback(async () => {
//     try {
//       const granted = await ForegroundApp.isUsageAccessGranted();
//       if (!granted) {
//         Alert.alert(
//           'Permission Required',
//           'Usage access is not granted. Please enable it in settings.',
//           [
//             {
//               text: 'Open Settings',
//               onPress: () => ForegroundApp.openUsageSettings(),
//             },
//             { text: 'Cancel', style: 'cancel' },
//           ],
//         );
//       }
//     } catch (error) {
//       console.error('Error checking usage access:', error);
//     }
//   }, []);

//   // Start the background service
//   const startBackgroundService = useCallback(async () => {
//     await checkUsageAccess();
//     await BackgroundService.start(backgroundTask, serviceOptions);
//   }, []);

//   // overlay permition luncher
//   // const checkOverlayPermission = async () => {
//   //   const granted = await NativeModules.FOREGROUND_PERMISSION_CHECK?.();
//   //   if (!granted) {
//   //     Linking.openSettings(); // or open overlay settings directly
//   //   }
//   // };

//   useEffect(() => {
//     // loadAppUsage();
//     initializeImportedApps();
//     startBackgroundService();
//     Linking.openURL('android.settings.ACCESSIBILITY_SETTINGS');
//     // ForegroundApp.showOverlay('WhatsApp');
//   }, []);

//   // useEffect(() => {
//   //   // Optional: ask for overlay permission on launch
//   //   if (Platform.OS === 'android') {
//   //     checkOverlayPermission();
//   //     console.log('Checking overlay permission on launch');
//   //   }
//   // }, []);

//   return (
//     <View style={styles.container}>
//       <Pressable style={styles.startButton} onPress={checkUsageAccess}>
//         <Text style={[styles.buttonText, isDarkMode && styles.darkText]}>
//           Initialize Demo Apps
//         </Text>
//       </Pressable>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F5FCFF',
//     gap: 10,
//   },
//   startButton: {
//     padding: 12,
//     backgroundColor: 'blue',
//     borderRadius: 8,
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   darkText: {
//     color: '#fff',
//   },
// });

// export default App;

// import React, { useEffect, useState, useCallback } from 'react';
// import {
//   Alert,
//   Pressable,
//   StyleSheet,
//   Text,
//   useColorScheme,
//   View,
//   NativeModules,
// } from 'react-native';
// import BackgroundService from 'react-native-background-actions';

// const { ForegroundApp } = NativeModules;

// const tempApp = [
//   {packageName: 'com.instagram.barcelona'},
//   {packageName: 'com.scrollless'},
//   {packageName: 'com.vivo.notes'},
//   {packageName: 'com.whatsapp'},
// ]

// const App = () => {
//   const isDarkMode = useColorScheme() === 'dark';
//   // const [isUsageAccessGranted, setIsUsageAccessGranted] = useState(false);

//   const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

//   // Background task that runs indefinitely while the service is active
//   const backgroundTask = async ({ delay }) => {
//     await new Promise(async () => {
//       while (BackgroundService.isRunning()) {
//         // await checkForegroundApp();
//         await getCurrentAppUsageDuration();
//         await sleep(delay);
//       }
//     });
//   };

//   // Options for the background service
//   const serviceOptions = {
//     taskName: 'ScrollLess',
//     taskTitle: 'Tracking Foreground Activity',
//     taskDesc: 'Monitoring selected apps to help you save screen time.',
//     taskIcon: {
//       name: 'ic_launcher',
//       type: 'mipmap',
//     },
//     color: '#ff00ff',
//     linkingURI: 'yourSchemeHere://chat/jane',
//     parameters: {
//       delay: 5000,
//     },
//   };

//   // Function to check the foreground app
//   const checkForegroundApp = useCallback(async () => {
//     try {
//       const app = await ForegroundApp.getForegroundApp();
//       console.log('Foreground App:', app);
//     } catch (e) {
//       // if (e.code === 'NO_PERMISSION') {
//       //   console.warn('Usage access not granted. Opening settings...');
//       //   ForegroundApp.openUsageSettings();
//       // } else {
//       //   console.error('Error fetching foreground app:', e);
//       // }
//       console.warn('Error fetching foreground app:', e);
//     }
//   }, []);

//   // Function to check if usage access is granted
//   const checkUsageAccess = useCallback(async () => {
//     try {
//       const granted = await ForegroundApp.isUsageAccessGranted();
//       // setIsUsageAccessGranted(granted);
//       console.log('Usage Access Granted:', granted);
//       if (!granted) {
//         Alert.alert(
//           'Permission Required',
//           'Usage access is not granted. Please enable it in settings.',
//           [
//             {
//               text: 'Open Settings',
//               onPress: () => ForegroundApp.openUsageSettings(),
//             },
//             { text: 'Cancel', style: 'cancel' },
//           ],
//         );
//       }
//     } catch (error) {
//       console.error('Error checking usage access:', error);
//     }
//   }, []);

//   // Start the background service
//   const startBackgroundService = useCallback(async () => {
//     try {
//       await checkUsageAccess();
//       await BackgroundService.start(backgroundTask, serviceOptions);
//       console.log('Background service started.');
//     } catch (e) {
//       console.error('Failed to start background service:', e);
//     }
//   }, [checkUsageAccess]);

//   // Stop the background service
//   const stopBackgroundService = useCallback(async () => {
//     try {
//       await BackgroundService.stop();
//       console.log('Background service stopped.');
//     } catch (e) {
//       console.error('Failed to stop background service:', e);
//     }
//   }, []);

//   // Get the current app usage duration
//   const getCurrentAppUsageDuration = useCallback(async () => {
//     // Check if usage access is granted when the app starts
//     // checkUsageAccess();
//     ForegroundApp.getCurrentAppUsageDuration()
//       .then(({ packageName, duration }) => {
//         console.log(
//           `Current app: ${packageName}, Used for: ${duration.toFixed(
//             2,
//           )} seconds`,
//         );
//       })
//       .catch(err => {
//         // if (err.code === 'NO_PERMISSION') {
//         //   ForegroundApp.openUsageSettings();
//         // } else {
//         // }
//         console.log("ERRor: ",err.message);
//         console.warn('Error:', err.message || err);
//       });
//   }, []);

//   // Effect to start the background service on mount
//   useEffect(() => {
//     // Start the service on mount
//     startBackgroundService();

//     // Stop service on unmount
//     // return () => {
//     //   stopBackgroundService();
//     // };
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Pressable
//         style={styles.startButton}
//         onPress={() => Alert.alert('Hello Start', 'This is a test alert!')}
//       >
//         <Text style={[styles.buttonText, isDarkMode && styles.darkText]}>
//           Start Background Service
//         </Text>
//       </Pressable>

//       <Pressable
//         style={styles.stopButton}
//         onPress={() => Alert.alert('Hello Stop', 'This is a test alert!')}
//       >
//         <Text style={[styles.buttonText, isDarkMode && styles.darkText]}>
//           Stop Background Service
//         </Text>
//       </Pressable>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F5FCFF',
//     gap: 10,
//   },
//   startButton: {
//     padding: 12,
//     backgroundColor: 'blue',
//     borderRadius: 8,
//   },
//   stopButton: {
//     padding: 12,
//     backgroundColor: 'red',
//     borderRadius: 8,
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   darkText: {
//     color: '#fff',
//   },
// });

// export default App;

/*

// App.js
import React, { useEffect, useCallback } from 'react';
import { Alert, Button, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ForegroundApp from './ForegroundAppModule'; // 👈 Native module for getting current app info

// 🔹 Utility: Returns today's date in YYYY-MM-DD format
const getTodayKey = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// 🔹 Utility: Keeps only the last 7 days of usage data
const pruneOldUsageData = usageHistory => {
  const today = new Date();
  const pruned = {};
  Object.entries(usageHistory || {}).forEach(([key, value]) => {
    const diff = Math.floor((today - new Date(key)) / (1000 * 3600 * 24));
    if (diff <= 7) pruned[key] = value;
  });
  return pruned;
};

// 🔹 Update usage data for a given app
const updateUsageData = async (packageName, duration) => {
  try {
    const stored = await AsyncStorage.getItem('@importedAppsUsage');
    if (!stored) return;

    const data = JSON.parse(stored);
    const app = data[packageName];
    if (!app) return; // App not being tracked

    const todayKey = getTodayKey();
    const usageHistory = pruneOldUsageData(app.usageHistory || {});
    const todayUsage = usageHistory[todayKey] || 0;

    const totalUsage = todayUsage + duration;
    usageHistory[todayKey] = totalUsage;
    data[packageName].usageHistory = usageHistory;

    // 🔸 Check if usage has exceeded the limit and show an alert once every 5 sec
    const limitSeconds = (app.timeLimitInMinutes || 0) * 60;
    const lastNotified = app.lastNotifiedAt || 0;
    const now = Date.now();
    if (limitSeconds > 0 && totalUsage >= limitSeconds && now - lastNotified > 5000) {
      Alert.alert('⛔ Time Limit Reached', `${app.appName} usage limit exceeded.`);
      data[packageName].lastNotifiedAt = now;
    }

    await AsyncStorage.setItem('@importedAppsUsage', JSON.stringify(data));
  } catch (err) {
    console.error('Update usage error:', err);
  }
};

// 🔹 Call native module to get the foreground app and its duration
const getCurrentAppUsageDuration = useCallback(async () => {
  try {
    const result = await ForegroundApp.getForegroundApp(); // native call
    const { packageName, duration } = result;
    if (packageName && duration) {
      await updateUsageData(packageName, duration);
    }
  } catch (err) {
    console.warn('Error fetching foreground app:', err.message);
  }
}, []);

// 🔹 Resets today's usage to 0 for all tracked apps
const resetUsageData = async () => {
  const stored = await AsyncStorage.getItem('@importedAppsUsage');
  if (!stored) return;

  const data = JSON.parse(stored);
  const todayKey = getTodayKey();

  Object.keys(data).forEach(pkg => {
    data[pkg].usageHistory = { [todayKey]: 0 };
    data[pkg].lastNotifiedAt = null;
  });

  await AsyncStorage.setItem('@importedAppsUsage', JSON.stringify(data));
  Alert.alert("✅ Reset", "Today's usage has been reset.");
};

// 🔹 Initializes tracking data with dummy apps
const initializeImportedApps = async () => {
  const todayKey = getTodayKey();
  const usageObj = {
    'com.whatsapp': {
      appName: 'WhatsApp',
      packageName: 'com.whatsapp',
      timeLimitInMinutes: 1, // 1 minute limit for test
      usageHistory: { [todayKey]: 0 },
      lastNotifiedAt: null,
    },
    'com.instagram.android': {
      appName: 'Instagram',
      packageName: 'com.instagram.android',
      timeLimitInMinutes: 2,
      usageHistory: { [todayKey]: 0 },
      lastNotifiedAt: null,
    }
  };

  await AsyncStorage.setItem('@importedAppsUsage', JSON.stringify(usageObj));
  Alert.alert("🎉 Setup Done", "Imported dummy apps for testing.");
};

// 🔹 Main component
const App = () => {
  useEffect(() => {
    // 🕐 Track app usage every 5 seconds
    const interval = setInterval(() => {
      getCurrentAppUsageDuration();
    }, 5000);

    return () => clearInterval(interval); // Cleanup
  }, [getCurrentAppUsageDuration]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="🧪 Init Dummy Apps" onPress={initializeImportedApps} />
      <Button title="🔄 Reset Usage" onPress={resetUsageData} />
    </View>
  );
};

export default App;


*/
