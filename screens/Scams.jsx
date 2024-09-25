import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabase'; // Adjust the import path if necessary
import { TouchableOpacity } from 'react-native-gesture-handler';
import BottomNavigationBar from './BottomNavigation';
import { useTheme } from '../ThemeContext'; // Import your theme context

export default function Scams() {
  const [scams, setScams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const { isDarkMode } = useTheme(); // Access dark mode state

  useEffect(() => {
    const getScams = async () => {
      try {
        const { data, error } = await supabase.from('scam').select();

        if (error) {
          console.error('Error fetching scams:', error.message);
          return;
        }

        if (data) {
          // Filter out duplicate scam types
          const uniqueScams = Array.from(
            new Set(data.map(scam => scam.scam_type)),
          ).map(scam_type => data.find(scam => scam.scam_type === scam_type));
          setScams(uniqueScams);
        }
      } catch (error) {
        console.error('Error fetching scams:', error.message);
      } finally {
        setLoading(false);
      }
    };

    getScams();
  }, []);

  return (
<<<<<<< HEAD
    <View className="flex-1 bg-[#0D0E10] dark:bg-[#0D0E10]"> 
=======
    <View className="flex-1 bg-[#0D0E10]">
>>>>>>> 9f3ab90... bugfix
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-white">Loading...</Text>
        </View>
      ) : scams.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-white">No scams found</Text>
        </View>
      ) : (
        <View className="flex-1 p-5">
          <Text className="text-2xl font-bold mb-5 text-white">Scam List</Text>
          <FlatList
            data={scams}
            keyExtractor={item => item.id.toString()}
<<<<<<< HEAD
            renderItem={({ item }) => (
              <View className="py-4 border-b border-gray-300 dark:border-gray-600">
=======
            renderItem={({item}) => (
              <View className="py-4 border-b border-gray-300">
>>>>>>> 9f3ab90... bugfix
                <TouchableOpacity
                  className="bg-[#ddff00] p-5 rounded-lg"
                  onPress={() =>
                    navigation.navigate('mscam', {
                      stype: item.scam_type,
                      s_id: item.id,
                    })
<<<<<<< HEAD
                  }
                >
                  <Text className={`text-xl font-bold ${isDarkMode ? 'text-black' : 'text-black'}`}>
=======
                  }>
                  <Text className="text-black text-xl font-bold">
>>>>>>> 9f3ab90... bugfix
                    {item.scam_type}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}
      <BottomNavigationBar /> 
    </View>
  );
}
