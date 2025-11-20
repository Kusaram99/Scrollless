// hooks/useAppStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const STORAGE_KEY = 'importedApps';

export const useAppStorage = () => {
  // Save all apps ================ Done
  const saveApps = async newData => {
    try {
      if (!newData['packageName']) {
        Alert.alert('No data to save');
        return;
      }
      // console.log('saveApp function: ', newData);
      const json = (await AsyncStorage.getItem(STORAGE_KEY)) || '{}';
      const { packageName } = newData;
      const updatedData = { ...JSON.parse(json), [packageName]: newData };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    } catch (e) {
      console.error('Failed to save apps', e);
    }
  };

  // Get all apps ================ Done
  const getApps = async () => {
    try {
      // await AsyncStorage.clear();
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json != null ? JSON.parse(json) : {};
    } catch (e) {
      console.error('Failed to fetch apps', e);
      return {};
    }
  };

  // Update specific app by packageName =============== pending....
  const updateApp = async (packageName, changedData) => {
    // console.log('updateApp function: ', packageName);

    try {
      // check if packageName exists
      if (!packageName) {
        Alert.alert('No data to save');
        return;
      }
      // get all apps
      const allApps = await getApps();

      const updatedData = { ...allApps, [packageName]: changedData };
      // update the specific app's fields
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    } catch (e) {
      console.error('Failed to save apps', e);
    }
  };

  // update used time of imported apps
  const updateUsedTime = async (packageName, dataFromBackground) => {
    try {
      const allApps = await getApps();
      if (!allApps || Object.keys(allApps).length === 0) {
        // console.log('No apps found in storage');
        Alert.alert('No apps found to update used time');
        return false;
      }
      // extract current app data (to update changed time in UI if needed)
      const currentAppFromBackground = dataFromBackground[packageName]; // extract from dataFromBackground
      const currentAppFromStorage = allApps[packageName]; // extract from storage

      // check if app exists in either source
      if (!currentAppFromBackground || !currentAppFromStorage) {
        // console.log('No app found with packageName: ', packageName);
        Alert.alert('No app found to update used time');
        return false;
      }

      // merge data: keep timeLimitInMinutes from storage, other fields from background
      const timeLimitInMinutesFromStorage = currentAppFromStorage
        ? currentAppFromStorage.timeLimitInMinutes
        : null;
      const mixedDataFromStorageAndBackground = {
        ...currentAppFromBackground,
        timeLimitInMinutes: timeLimitInMinutesFromStorage,
      };

      // update the specific app's used time
      const updatedData = {
        ...allApps,
        [packageName]: mixedDataFromStorageAndBackground,
      };
      // console.log('updateUsedTime function console: ', updatedData);
      // set updated data to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      // if data saved succefully
      return true;
    } catch (e) {
      console.error('Failed to update used time', e);
    }
  };

  // update storage when user will filter apps data ====== Done
  const updateFilteredData = async data => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save apps', e);
    }
  };

  // Delete an app by packageName =========== Done
  const deleteApp = async packageName => {
    try {
      if (!packageName) {
        Alert.alert('No packageName to delete');
        return;
      }
      // console.log('deleteApp function: ', packageName);
      // get all apps
      const apps = await getApps();
      // Remove the app from the object
      const { [packageName]: _, ...rest } = apps;
      // console.log('rest after delete: ', rest);
      // await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
      // const filtered = apps.filter(app => app.packageName !== packageName);
      await updateFilteredData(rest);
    } catch (e) {
      console.error('Error in deleteApp: ', e);
      return;
    }
  };

  // getData for chart
  const getDataForChart = async _ => {
    try {
      const allApps = await getApps();
      const updatedData = {};

      // Loop through each app
      for (const packageName in allApps) {
        if (allApps.hasOwnProperty(packageName)) {
          const appData = allApps[packageName];
          const usageHistory = appData.usageHistory;

          // Get all dates
          const dates = Object.keys(usageHistory);

          // Sort dates (oldest → latest)
          dates.sort((a, b) => new Date(a) - new Date(b));

          // Keep only last 4 dates
          const last4Dates = dates.slice(-4);

          // Make new usageHistory with only last 4 days
          const newUsageHistory = {};
          last4Dates.forEach(date => {
            newUsageHistory[date] = usageHistory[date];
          });

          // Save back in same structure
          updatedData[packageName] = {
            ...appData,
            usageHistory: newUsageHistory,
          };
        }
      }

      return updatedData;
    } catch (e) {
      console.error('Failed to get data for chart', e);
      return null;
    }
  };

  return {
    saveApps,
    getApps,
    updateApp,
    deleteApp,
    updateUsedTime,
    getDataForChart,
  };
};
