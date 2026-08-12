import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "operador";

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: AppRole | null;
    isAdmin: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    isAdmin: false,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // O papel vem da app_users. A RLS deixa cada um ler a propria linha,
        // entao esta consulta funciona com a anon key.
        const loadRole = async (u: User | null) => {
            if (!u) {
                setRole(null);
                return;
            }
            const { data, error } = await supabase
                .from("app_users")
                .select("role, active")
                .eq("id", u.id)
                .maybeSingle();

            // Usuario inativo ou sem linha nao recebe papel — a RLS ja o bloqueia
            // no banco; aqui e so para a interface nao oferecer o que ele nao pode.
            setRole(error || !data || !(data as any).active ? null : ((data as any).role as AppRole));
        };

        // Check active sessions and sets the user
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            await loadRole(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes on auth state (sing in, sign out, etc.)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            await loadRole(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        session,
        user,
        role,
        isAdmin: role === "admin",
        loading,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
