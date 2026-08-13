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
    roleLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    isAdmin: false,
    loading: true,
    roleLoading: true,
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
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        let ativo = true;

        // O papel vem da app_users. A RLS deixa cada um ler a propria linha,
        // entao esta consulta funciona com a anon key.
        //
        // NUNCA chamar o supabase de dentro do callback do onAuthStateChange:
        // o listener segura um lock e a consulta fica esperando esse mesmo lock,
        // o await nunca resolve e a tela trava em "Carregando...". Por isso o
        // papel e buscado fora do callback, via setTimeout(0).
        const carregarPapel = async (u: User | null) => {
            if (!u) {
                if (ativo) {
                    setRole(null);
                    setRoleLoading(false);
                }
                return;
            }
            if (ativo) setRoleLoading(true);
            try {
                const { data, error } = await supabase
                    .from("app_users")
                    .select("role, active")
                    .eq("id", u.id)
                    .maybeSingle();
                if (!ativo) return;
                // Usuario inativo ou sem linha nao recebe papel — a RLS ja o bloqueia
                // no banco; aqui e so para a interface nao oferecer o que ele nao pode.
                setRole(error || !data || !(data as any).active ? null : ((data as any).role as AppRole));
            } catch {
                if (ativo) setRole(null);
            } finally {
                if (ativo) setRoleLoading(false);
            }
        };

        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!ativo) return;
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            setTimeout(() => carregarPapel(session?.user ?? null), 0);
        });

        // Listen for changes on auth state (sing in, sign out, etc.)
        // Callback SINCRONO de proposito — ver o comentario acima.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            setTimeout(() => carregarPapel(session?.user ?? null), 0);
        });

        return () => {
            ativo = false;
            subscription.unsubscribe();
        };
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
        roleLoading,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
