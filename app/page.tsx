"use client"

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/app/utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { LoadingPage } from './components/LoadingPage';
import { AuthPage } from './components/AuthPage';
import DashNetwork from './components/Dashboard';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
 
  useEffect(() => {
    if (!auth) {return;}
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingPage onLoadingComplete={() => setLoading(false)} currentVersion="1.8.1" />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DashNetwork user={user} />;
}