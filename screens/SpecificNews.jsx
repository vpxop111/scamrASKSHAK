import React from 'react';
import {View, Text, Image, ScrollView, StyleSheet} from 'react-native';

const SpecificNews = ({route}) => {
  const {article} = route.params;

  return (
    <ScrollView style={styles.container}>
      {article.image && (
        <Image source={{uri: article.image}} style={styles.image} />
      )}
      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.content}>
        {article.content || article.description}
      </Text>
      <Text style={styles.author}>
        {article.author ? `By ${article.author}` : ''}
      </Text>
      <Text style={styles.publishedAt}>
        {new Date(article.publishedAt).toDateString()}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  content: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  author: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  publishedAt: {
    fontSize: 14,
    color: '#666',
  },
});

export default SpecificNews;
