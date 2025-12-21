"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

// Define context shape
interface UserProfile {
    displayName?: string;
    companyName?: string;
    hasOnboarded?: boolean;
    inventoryUrl?: string;
    salesUrl?: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchProfile = async (uid: string) => {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
                return docSnap.data() as UserProfile;
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
        return null;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const userProfile = await fetchProfile(currentUser.uid);

                // Onboarding Check Logic
                const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname === "/";

                if (!isAuthPage) {
                    if (!userProfile?.hasOnboarded && pathname !== "/settings") {
                        console.log("Redirecting to settings for onboarding...");
                        router.push("/settings");
                    }
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [pathname, router]); // Dependency on pathname to re-check on nav

    const signOut = async () => {
        await firebaseSignOut(auth);
        setProfile(null);
        router.push("/login");
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.uid);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
