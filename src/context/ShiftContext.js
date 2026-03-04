import React, { createContext, useState, useContext } from 'react';

// Context erstellen
const ShiftContext = createContext();

// Provider-Komponente
export const ShiftProvider = ({ children }) => {
  const [shiftData, setShiftData] = useState({
    selectedLine: '',
    selectedLeader: '',
    selectedShift: '',
    selectedBereich: '',
  });

  const updateShiftData = (data) => {
    setShiftData(prevData => ({
      ...prevData,
      ...data
    }));
  };

  const resetShiftData = () => {
    setShiftData({
      selectedLine: '',
      selectedLeader: '',
      selectedShift: '',
      selectedBereich: '',
    });
  };

  return (
    <ShiftContext.Provider value={{ shiftData, updateShiftData, resetShiftData }}>
      {children}
    </ShiftContext.Provider>
  );
};

// Custom Hook für einfacheren Zugriff
export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift muss innerhalb eines ShiftProvider verwendet werden');
  }
  return context;
};
