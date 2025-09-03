import { NativeModules } from 'react-native';

const { InstalledApps } = NativeModules;

export const getInstalledApps = async () => {
  try {
    const apps = await InstalledApps.getAllInstalledApps();
    return apps;
  } catch (error) {
    console.error('Error fetching apps', error);
    return [];
  }
};

