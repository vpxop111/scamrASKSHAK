import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {supabase} from '../supabase'; // Adjust the import path if necessary

const Resource = ({route}) => {
  const {stype1} = route.params;
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        // Fetch resource details where scam_type equals stype1
        const {data, error} = await supabase
          .from('resource')
          .select('scam_name, Resource, Resource_link')
          .eq('scam_type', stype1);

        if (error) {
          console.error('Error fetching resources:', error.message);
          return;
        }

        setResources(data);
      } catch (error) {
        console.error('Error fetching details:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [stype1]);

  const openResourceLink = url => {
    Linking.openURL(url).catch(err =>
      console.error('Failed to open resource link:', err),
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0D0E10]">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-5 bg-[#0D0E10]">
      <Text className="text-2xl font-bold mb-5 text-white">
        Details for {stype1}
      </Text>
      <ScrollView>
        {resources.length > 0 ? (
          <View>
            {resources.map((resource, index) => (
              <View key={index} className="mb-5">
                <Text className="text-xl mb-2 text-white">
                  Scam Name: {resource.scam_name}
                </Text>
                <Text className="text-base mb-2 text-white">
                  Resource: {resource.Resource}
                </Text>
                {resource.Resource_link && (
                  <TouchableOpacity
                    onPress={() => openResourceLink(resource.Resource_link)}>
                    <Text className="text-blue-500 underline">
                      {resource.Resource_link}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text>No details found for {stype1}</Text>
        )}
      </ScrollView>
    </View>
  );
};

export default Resource;
