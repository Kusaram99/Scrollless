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

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const data = await getDataForChart();
          console.log('Chart data: ', data);
          setAppsData(data || {});
        } catch (error) {
          console.error('Error fetching chart data:', error);
        }
      };
      fetchData();
    }, []),
  );

  const countTodayScreenTimes = _ => {
    let total = 0;
    const todayKey = new Date().toISOString().split('T')[0];
    Object.values(appsData).forEach(app => {
      if (app.usageHistory && app.usageHistory[todayKey]) {
        total += app.usageHistory[todayKey];
      }
    });
    return total;
  };

  const appArray = Object.values(appsData);

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <Text style={styles.heading}>Imported Apps</Text>
      <Text style={styles.heading}>
        Today toatal screen time: {countTodayScreenTimes()}
      </Text>

      <View style={styles.headerAppList}>
        {appArray.map(app => (
          <View key={app.packageName} style={styles.headerAppItem}>
            <Image
              source={{ uri: app.iconBase64 }}
              style={styles.appIconSmall}
            />
            <Text style={styles.appNameSmall}>{app.appName}</Text>
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
                labels: dates.map(d =>
                  new Date(d).toLocaleDateString('en-US', { day: '2-digit' }),
                ),
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

  return (
    <FlatList
      data={[]} // using header & footer only
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      renderItem={null}
      keyExtractor={() => 'dummy'}
      contentContainerStyle={styles.container}
    />
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F5F7FA', // soft pastel grey-blue background
  },
  heading: {
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
    color: '#2D3142', // deep calm gray-blue instead of harsh black
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
});
