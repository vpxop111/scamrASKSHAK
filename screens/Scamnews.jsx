import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import BottomNavigationBar from './BottomNavigation';

// Replace with your GNews API key
const GNEWS_API_KEY = '4e7471e098930c7d98dc3495a9752490';

const Scamnews = ({ navigation }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    try {
      const response = await axios.get('https://gnews.io/api/v4/search', {
        params: {
          q: 'scam news',
          lang: 'en',
          country: 'in',
          max: 10,
          apikey: GNEWS_API_KEY,
        },
      });
      setNews(response.data.articles);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <View className="flex-1 bg-[#0D0E10]">
      {loading ? (
        <View className="flex-1 justify-center items-center bg-gray-100">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={item => item.url}
<<<<<<< HEAD
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row mb-5 p-4 bg-white rounded-lg shadow-md"
              onPress={() =>
                navigation.navigate('SpecificNews', { article: item })
              }
            >
              {item.image && (
                <Image
                  source={{ uri: item.image }}
=======
          renderItem={({item}) => (
            <TouchableOpacity
              className="flex-row mb-5 p-4 bg-white rounded-lg shadow-md"
              onPress={() =>
                navigation.navigate('SpecificNews', {article: item})
              }>
              {item.image && (
                <Image
                  source={{uri: item.image}}
>>>>>>> 9f3ab90... bugfix
                  className="w-24 h-24 rounded-lg mr-4"
                />
              )}
              <View className="flex-1">
<<<<<<< HEAD
                <Text className="text-lg font-bold mb-2 text-black"> 
                  {item.title}
                </Text>
                <Text className="text-base text-gray-800"> 
=======
                <Text className="text-lg font-bold mb-2">{item.title}</Text>
                <Text className="text-base text-gray-600">
>>>>>>> 9f3ab90... bugfix
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
<<<<<<< HEAD
      <BottomNavigationBar />
=======
      <BottomNavigationBar /> 
>>>>>>> 9f3ab90... bugfix
    </View>
  );
};

export default Scamnews;
