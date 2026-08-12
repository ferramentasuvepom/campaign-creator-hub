import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, User as UserIcon, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AppUser {
    id: string;
    email: string | null;
    full_name: string;
    role: "admin" | "operador";
    active: boolean;
    created_at: string;
}

export default function UsersPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery({
        queryKey: ["app_users"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("app_users")
                .select("id, email, full_name, role, active, created_at")
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data as unknown as AppUser[];
        },
    });

    const adminCount = users?.filter((u) => u.role === "admin" && u.active).length ?? 0;

    const updateUser = useMutation({
        mutationFn: async ({ id, patch }: { id: string; patch: Partial<AppUser> }) => {
            const { error } = await supabase.from("app_users").update(patch as any).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["app_users"] });
            toast({ title: "Usuário atualizado" });
        },
        onError: (error: any) =>
            toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message }),
    });

    // Trava de segurança: nao deixar a plataforma ficar sem nenhum admin ativo.
    const seriaUltimoAdmin = (u: AppUser) => u.role === "admin" && u.active && adminCount <= 1;

    const columns = [
        {
            key: "full_name",
            header: "Nome",
            render: (u: AppUser) => (
                <div className="flex items-center gap-2">
                    {u.role === "admin" ? (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                    ) : (
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{u.full_name || "—"}</span>
                    {u.id === user?.id && <Badge variant="outline" className="text-xs">você</Badge>}
                </div>
            ),
        },
        { key: "email", header: "E-mail" },
        {
            key: "role",
            header: "Papel",
            render: (u: AppUser) => (
                <Select
                    value={u.role}
                    disabled={seriaUltimoAdmin(u) || updateUser.isPending}
                    onValueChange={(role) => updateUser.mutate({ id: u.id, patch: { role: role as AppUser["role"] } })}
                >
                    <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="operador">Operador</SelectItem>
                    </SelectContent>
                </Select>
            ),
        },
        {
            key: "active",
            header: "Ativo",
            render: (u: AppUser) => (
                <Switch
                    checked={u.active}
                    disabled={seriaUltimoAdmin(u) || updateUser.isPending}
                    onCheckedChange={(active) => updateUser.mutate({ id: u.id, patch: { active } })}
                />
            ),
        },
        {
            key: "created_at",
            header: "Criado em",
            render: (u: AppUser) => new Date(u.created_at).toLocaleDateString("pt-BR"),
        },
    ];

    return (
        <div className="animate-fade-in">
            <PageHeader title="Usuários" description="Quem acessa a plataforma e o que cada um pode fazer" />

            <div className="mb-4 flex gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div className="text-xs leading-relaxed text-blue-900 dark:text-blue-200">
                    <p>
                        <span className="font-semibold">Para adicionar alguém:</span> crie a conta no painel do
                        Supabase em <span className="font-medium">Authentication → Users → Add user</span>. A pessoa
                        aparece aqui automaticamente como <span className="font-medium">Operador</span> e você ajusta
                        o papel nesta tela.
                    </p>
                    <p className="mt-1">
                        <span className="font-medium">Admin</span> gere usuários, Business Managers e contas de
                        anúncio. <span className="font-medium">Operador</span> consulta tudo e sobe campanha, mas não
                        altera cadastros.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : (
                <DataTable columns={columns} data={users || []} />
            )}

            {adminCount <= 1 && (
                <p className="mt-3 text-xs text-muted-foreground">
                    Só existe um admin ativo — o papel e o acesso dele ficam travados para a plataforma não ficar sem
                    ninguém que possa administrar. Promova outra pessoa para liberar.
                </p>
            )}
        </div>
    );
}
