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
      console.log('saveApp function: ', newData);
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
    console.log('updateApp function: ', packageName); 

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
  const updateUsedTime = async updatedData => {
    try {
      const newData = { ...updatedData };
      console.log('updateUsedTime function: ', newData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
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
      console.log('deleteApp function: ', packageName);
      // get all apps
      const apps = await getApps();
      // Remove the app from the object
      const { [packageName]: _, ...rest } = apps;
      // await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
      // const filtered = apps.filter(app => app.packageName !== packageName);
      await updateFilteredData(rest);
    } catch (e) {
      console.error('Error in deleteApp: ', e);
      return;
    }
  };

  return {
    saveApps,
    getApps,
    updateApp,
    deleteApp,
    updateUsedTime,
  };
};
