import React, {createContext, useState, useContext} from 'react';

// Create a context for task management
const TaskContext = createContext();

// Custom hook to use the TaskContext
export const useTask = () => useContext(TaskContext);

// Provider component to wrap the app with TaskContext
export const TaskProvider = ({children}) => {
  const [taskStarted, setTaskStarted] = useState(false); // Manage task state

  // Function to start the task
  const startTask = () => setTaskStarted(true);

  // Function to stop the task
  const stopTask = () => setTaskStarted(false);

  return (
    <TaskContext.Provider value={{taskStarted, startTask, stopTask}}>
      {children}
    </TaskContext.Provider>
  );
};
