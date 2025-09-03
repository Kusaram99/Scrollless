import React, { createContext, useState, useContext } from 'react';

// 1. Create Context
const AppUsageContext = createContext();

// 2. Create Provider
export const AppUsageProvider = ({ children }) => {
  const [usageData, setUsageData] = useState({}); // global usage state

  return (
    <AppUsageContext.Provider value={{ usageData, setUsageData }}>
      {children}
    </AppUsageContext.Provider>
  );
};

// 3. Custom hook to use context
export const useAppUsage = () => useContext(AppUsageContext);