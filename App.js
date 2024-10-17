import React from 'react';
import { View, Button } from 'react-native';
import { useBackgroundTask } from './backgroundTaskContext';

const App = () => {
  const { isTaskRunning, startTask, stopTask } = useBackgroundTask();

  return (
    <View>
      <Button 
        title={isTaskRunning ? "Stop Background Task" : "Start Background Task"} 
        onPress={isTaskRunning ? stopTask : startTask} 
      />
    </View>
  );
};

export default App;
