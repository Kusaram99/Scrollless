import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { useAppStorage } from '../../Hooks/useAppStorage';

const { width: screenWidth } = Dimensions.get('window');

const Home = () => {
  const [appsData, setAppsData] = useState({});
  const { getDataForChart } = useAppStorage();
  // const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          // setLoading(true);
          const data = await getDataForChart();
          // console.log('Chart data: ', data);
          setAppsData(data || {});
        } catch (error) {
          console.error('Error fetching chart data:', error);
        } finally {
          // setLoading(false);
        }
      };
      fetchData();
    }, []),
  );

  // convert time in hours, minutes and sconds
  const countTodayScreenTimes = _ => {
    let seconds = 0;
    const todayKey = new Date().toISOString().split('T')[0];
    Object.values(appsData).forEach(app => {
      if (app.usageHistory && app.usageHistory[todayKey]) {
        seconds += app.usageHistory[todayKey];
      }
    });

    if (seconds < 60) {
      return `${seconds}s`;
    }

    // convert to minutes
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      if (remainingSeconds === 0) {
        return `${minutes}m`;
      }
      return `${minutes}m ${remainingSeconds}s`;
    }

    // convert to hours
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  };

  // each application time counter
  const eachApppTimeCounter = app => {
    let seconds = 0;
    // generate today key
    const todayKey = new Date().toISOString().split('T')[0];
    // check if todayKey is present in usageHistory
    if (app.usageHistory && app.usageHistory[todayKey]) {
      seconds = app.usageHistory[todayKey];
    } else {
      return '0s';
    }

    if (seconds < 60) {
      return `${seconds}s`;
    }

    // convert to minutes
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      if (remainingSeconds === 0) {
        return `${minutes}m`;
      }
      return `${minutes}m ${remainingSeconds}s`;
    }

    // convert to hours
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  };

  const appArray = Object.values(appsData);

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <Text style={{ textAlign: 'center', fontWeight: '500' }}>
        Today toatal used time: {countTodayScreenTimes()}
      </Text>

      {/* =================== imported app icons and name ==================== */}
      <View style={styles.headerAppList}>
        {appArray.map(app => (
          <View key={app.packageName} style={styles.headerAppItem}>
            <Image
              source={{ uri: app.iconBase64 }}
              style={styles.appIconSmall}
            />
            <Text style={styles.appNameSmall}>{eachApppTimeCounter(app)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerWrapper}>
      {appArray.map((app, index) => {
        const dates = Object.keys(app.usageHistory);
        const secondsValues = Object.values(app.usageHistory);

        // Check if any day >= 1 hour
        const hasHours = secondsValues.some(s => s >= 3600);

        // Convert seconds → minutes or hours
        const convertedValues = secondsValues.map(s =>
          hasHours ? Math.round(s / 3600) : Math.round(s / 60),
        );

        const unit = hasHours ? 'h' : 'm';

        return (
          <View key={app.packageName} style={styles.chartCard}>
            {/* App Info */}
            <View style={styles.appInfo}>
              <Image
                source={{ uri: app.iconBase64 }}
                style={styles.appIconLarge}
              />
              <Text style={styles.appNameLarge}>{app.appName}</Text>
            </View>

            {/* Line Chart */}
            <LineChart
              data={{
                labels: dates,
                datasets: [
                  {
                    data: convertedValues,
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // white line
                  },
                ],
              }}
              width={screenWidth - 55}
              height={220}
              yAxisSuffix={unit}
              chartConfig={
                (index + 1) % 2 === 0
                  ? {
                      backgroundColor: '#E0F7FA', // soft teal background
                      backgroundGradientFrom: '#CFD8DC', // pastel green
                      backgroundGradientTo: '#dee1e2ff', // soft green
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(45, 49, 66, ${opacity})`, // muted gray-blue line
                      labelColor: (opacity = 1) =>
                        `rgba(33, 33, 33, ${opacity})`, // dark gray labels
                      propsForDots: {
                        r: '5',
                        strokeWidth: '2',
                        stroke: '#2D3142', // subtle outline
                      },
                    }
                  : {
                      backgroundColor: '#ffffff', // clean white
                      backgroundGradientFrom: '#ECEFF1', // soft gray-blue
                      backgroundGradientTo: '#CFD8DC', // light slate
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, // calm blue line
                      labelColor: (opacity = 1) =>
                        `rgba(38, 50, 56, ${opacity})`, // dark teal-gray
                      propsForDots: {
                        r: '5',
                        strokeWidth: '2',
                        stroke: '#607D8B', // subtle bluish outline
                      },
                    }
              }
              bezier
              style={styles.chartStyle}
            />
          </View>
        );
      })}
    </View>
  );

  // LOADER
  // if (loading) {
  //   return <Text style={styles.loading}>Loading...</Text>;
  // }

  return (
    <React.Fragment>
      <Text style={styles.heading}>Home</Text>
      <FlatList
        data={[]} // using header & footer only
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        renderItem={null}
        keyExtractor={() => 'dummy'}
        contentContainerStyle={styles.container}
      />
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F5F7FA', // soft pastel grey-blue background
  },
  heading: {
    fontWeight: '700',
    fontSize: 18,
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 30,
  },
  headerWrapper: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerAppList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    paddingVertical: 15,
  },
  headerAppItem: {
    alignItems: 'center',
    width: 70,
  },
  appIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 5,
  },
  appNameSmall: {
    fontSize: 12,
    textAlign: 'center',
    color: '#4A5568', // softer text
  },
  footerWrapper: {
    marginTop: 20,
  },
  chartCard: {
    marginBottom: 25,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appIconLarge: {
    width: 55,
    height: 55,
    borderRadius: 12,
    marginRight: 12,
  },
  appNameLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3142',
  },
  chartStyle: {
    borderRadius: 12,
    marginTop: 10,
  },
  loading: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 100,
  },
});

export default Home;
