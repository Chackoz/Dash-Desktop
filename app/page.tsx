"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

import { currentDASHVersion } from "./data/data";
import { firebaseService } from "./services/firebase";
import LoadingPage from "./components/pages/LoadingPage";
import AuthPage from "./components/pages/AuthPage";
import DashNetwork from "./components/pages/Dashboard";

const auth = firebaseService.auth;

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <LoadingPage
        onLoadingComplete={() => setLoading(false)}
        currentVersion={currentDASHVersion}
      />
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DashNetwork user={user} />;
}
