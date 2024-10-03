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
    <View className="flex-1 bg-[#0D0E10] p-5">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ddff00" />
          <Text className="text-white mt-2">Loading news...</Text>
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={item => item.url}
          renderItem={({item}) => (
            <TouchableOpacity
              className="flex-row mb-5 p-4 bg-[#1a1a1a] rounded-lg shadow-md hover:bg-[#2a2a2a] transition duration-300"
              onPress={() =>
                navigation.navigate('SpecificNews', {article: item})
              }>
              {item.image && (
                <Image
                  source={{uri: item.image}}
                  className="w-24 h-24 rounded-lg mr-4"
                />
              )}
              <View className="flex-1">
                <Text className="text-lg font-bold mb-2 text-[#ddff00]">{item.title}</Text>
                <Text className="text-base text-gray-300">
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <BottomNavigationBar /> 
    </View>
  );
};

export default Scamnews;