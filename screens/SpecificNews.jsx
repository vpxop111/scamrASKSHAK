import React from 'react';
import {View, Text, Image, ScrollView} from 'react-native';

const SpecificNews = ({route}) => {
  const {article} = route.params;

  return (
    <ScrollView className="flex-1 p-5 bg-black">
      {article.image && (
        <Image
          source={{uri: article.image}}
          className="w-full h-48 rounded-lg mb-4"
        />
      )}
      <Text className="text-2xl font-bold mb-2 text-white">
        {article.title}
      </Text>
      <Text className="text-base text-white mb-2">
        {article.content || article.description}
      </Text>
      <Text className="text-sm text-white mb-1">
        {article.author ? `By ${article.author}` : ''}
      </Text>
      <Text className="text-sm text-white">
        {new Date(article.publishedAt).toDateString()}
      </Text>
    </ScrollView>
  );
};

export default SpecificNews;
