import { useState, useEffect } from 'react';
import { JobAnalysis, JobListing } from '../lib/gemini';

export function useUpworkAgent() {
  const [connects, setConnects] = useState<number>(100);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedConnects = localStorage.getItem('upwork_connects');
    const savedHistory = localStorage.getItem('upwork_history');
    if (savedConnects) setConnects(parseInt(savedConnects));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('upwork_connects', connects.toString());
    localStorage.setItem('upwork_history', JSON.stringify(history));
  }, [connects, history]);

  const spendConnects = (amount: number) => {
    setConnects(prev => Math.max(0, prev - amount));
  };

  const addConnects = (amount: number) => {
    setConnects(prev => prev + amount);
  };

  const addToHistory = (job: any) => {
    const newJob = { ...job, id: Math.random().toString(36).substr(2, 9), status: 'bid' };
    setHistory(prev => [newJob, ...prev].slice(0, 50));
  };

  const updateJobStatus = (id: string, status: 'done') => {
    setHistory(prev => prev.map(job => job.id === id ? { ...job, status } : job));
  };

  return {
    connects,
    history,
    loading,
    setLoading,
    spendConnects,
    addConnects,
    addToHistory,
    updateJobStatus,
  };
}
