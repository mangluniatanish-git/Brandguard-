import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getBrand,
  updateBrandGuideline,
  updateApprovedFact,
  updateTerminology,
  updateSettings as apiUpdateSettings,
} from '../api';
import { useAuth } from './AuthContext';

const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  const { currentUser } = useAuth();
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBrandData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBrand();
      setBrand(data);
    } catch (err) {
      console.error('Failed to load brand data', err);
      setError(err.message || 'Unable to load brand guidelines and configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchBrandData();
    }
  }, [currentUser?.id, currentUser?.token]);

  const saveGuideline = async (clause) => {
    setError(null);
    const updated = await updateBrandGuideline(clause);
    setBrand((prev) => ({ ...prev, guidelines: updated }));
    return updated;
  };

  const saveFact = async (fact) => {
    setError(null);
    const updated = await updateApprovedFact(fact);
    setBrand((prev) => ({ ...prev, approvedFacts: updated }));
    return updated;
  };

  const saveTerm = async (type, item, action = 'add') => {
    setError(null);
    const updated = await updateTerminology(type, item, action);
    setBrand((prev) => ({ ...prev, terminology: updated }));
    return updated;
  };

  const saveSettings = async (newSettings) => {
    setError(null);
    const updated = await apiUpdateSettings(newSettings);
    setBrand((prev) => ({ ...prev, settings: updated }));
    return updated;
  };

  return (
    <BrandContext.Provider
      value={{
        brand,
        loading,
        error,
        refreshBrand: fetchBrandData,
        saveGuideline,
        saveFact,
        saveTerm,
        saveSettings,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
