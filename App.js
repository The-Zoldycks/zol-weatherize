import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const THEME = {
  primary: '#2F80ED',
  secondary: '#0B3A75',
  background: '#EAF4FF',
  card: '#FFFFFF',
  text: '#0D1B2A',
  muted: '#4B6584',
};

const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy rain showers',
  95: 'Thunderstorm',
};

function formatDay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Your Area');
  const [coords, setCoords] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWeather() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location needed', 'Please enable location access to view local forecast.');
          return;
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = position.coords;

        if (!isMounted) {
          return;
        }

        setCoords({ latitude, longitude });

        const [geoRes, weatherRes] = await Promise.all([
          Location.reverseGeocodeAsync({ latitude, longitude }),
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=auto`
          ),
        ]);

        if (!weatherRes.ok) {
          throw new Error('Unable to fetch weather data.');
        }

        const weatherJson = await weatherRes.json();
        const resolvedCity = geoRes?.[0]?.city || geoRes?.[0]?.subregion || 'Your Area';

        const nextWeek = weatherJson.daily.time.map((date, index) => ({
          date,
          label: formatDay(date),
          weatherCode: weatherJson.daily.weathercode[index],
          tempMax: Math.round(weatherJson.daily.temperature_2m_max[index]),
          tempMin: Math.round(weatherJson.daily.temperature_2m_min[index]),
          rainChance: weatherJson.daily.precipitation_probability_max[index],
          windSpeed: Math.round(weatherJson.daily.windspeed_10m_max[index]),
        }));

        if (isMounted) {
          setCity(resolvedCity);
          setForecast(nextWeek);
          setSelectedDay(nextWeek[0]);
        }
      } catch (error) {
        Alert.alert('Error', 'Could not load weather details. Please try again.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      isMounted = false;
    };
  }, []);

  const subtitle = useMemo(() => {
    if (!coords) {
      return 'Weekly forecast based on your location';
    }
    return `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`;
  }, [coords]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Loading your local forecast...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Weekly Weather</Text>
        <Text style={styles.city}>{city}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {selectedDay ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailDay}>{selectedDay.label}</Text>
          <Text style={styles.detailSummary}>{WEATHER_CODES[selectedDay.weatherCode] || 'Weather update'}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailMetric}>High {selectedDay.tempMax}°C</Text>
            <Text style={styles.detailMetric}>Low {selectedDay.tempMin}°C</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailMetric}>Rain {selectedDay.rainChance}%</Text>
            <Text style={styles.detailMetric}>Wind {selectedDay.windSpeed} km/h</Text>
          </View>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={forecast}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => {
          const selected = selectedDay?.date === item.date;
          return (
            <Pressable
              onPress={() => setSelectedDay(item)}
              style={[styles.dayCard, selected && styles.dayCardSelected]}
            >
              <View>
                <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>{item.label}</Text>
                <Text style={[styles.daySummary, selected && styles.daySummarySelected]}>
                  {WEATHER_CODES[item.weatherCode] || 'Forecast'}
                </Text>
              </View>
              <Text style={[styles.dayTemp, selected && styles.dayTempSelected]}>
                {item.tempMin}° / {item.tempMax}°
              </Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  loadingText: {
    marginTop: 12,
    color: THEME.secondary,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: THEME.secondary,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  city: {
    color: '#fff',
    marginTop: 4,
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    color: '#DCEBFF',
    marginTop: 2,
    fontSize: 13,
  },
  detailCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: THEME.card,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  detailDay: {
    fontSize: 18,
    color: THEME.text,
    fontWeight: '700',
  },
  detailSummary: {
    marginTop: 4,
    color: THEME.muted,
    fontSize: 15,
  },
  detailRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailMetric: {
    fontSize: 15,
    color: THEME.secondary,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  dayCard: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F6FAFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D6E9FF',
  },
  dayCardSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  dayLabelSelected: {
    color: '#fff',
  },
  daySummary: {
    marginTop: 4,
    color: THEME.muted,
    fontSize: 13,
  },
  daySummarySelected: {
    color: '#E9F2FF',
  },
  dayTemp: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.secondary,
  },
  dayTempSelected: {
    color: '#fff',
  },
});
