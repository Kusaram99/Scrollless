import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import { useAppStorage } from "../../Hooks/useAppStorage";

const screenWidth = Dimensions.get("window").width;

const Home = () => {
  const [appsData, setAppsData] = useState({});
  const { getDataForChart } = useAppStorage();

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const data = await getDataForChart();
          console.log("Chart data: ", data);
          setAppsData(data || {});
        } catch (error) {
          console.error("Error fetching chart data:", error);
        }
      };
      fetchData();
    }, [])
  );

  // Convert object to array for FlatList
  const appArray = Object.values(appsData);

  // ----- Header component -----
  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <Text style={styles.heading}>Imported Apps</Text>
      <View style={styles.headerAppList}>
        {appArray.map((app) => (
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

  // ----- Footer component -----
  const renderFooter = () => (
    <View style={styles.footerWrapper}>
      {appArray.map((app) => {
        const dates = Object.keys(app.usageHistory);
        const values = Object.values(app.usageHistory);

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
                labels: dates.map((d) =>
                  new Date(d).toLocaleDateString("en-US", { day: "2-digit" })
                ), // Show day only
                datasets: [
                  {
                    data: values,
                    color: (opacity = 1) => `rgba(34, 128, 176, ${opacity})`, // line color
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              yAxisSuffix="m"
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#f8f9fa",
                backgroundGradientTo: "#f8f9fa",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: "#1d72b8",
                },
              }}
              style={styles.chartStyle}
            />
          </View>
        );
      })}
    </View>
  );

  return (
    <FlatList
      data={[]} // Only to use FlatList header & footer
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      renderItem={null}
      keyExtractor={() => "dummy"}
      contentContainerStyle={styles.container}
    />
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  heading: {
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 12,
  },
  headerWrapper: {
    marginBottom: 20,
  },
  headerAppList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  headerAppItem: {
    alignItems: "center",
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
    textAlign: "center",
  },
  footerWrapper: {
    marginTop: 20,
  },
  chartCard: {
    marginBottom: 25,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  appInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  appIconLarge: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 10,
  },
  appNameLarge: {
    fontSize: 16,
    fontWeight: "600",
  },
  chartStyle: {
    borderRadius: 10,
    marginTop: 10,
  },
});
