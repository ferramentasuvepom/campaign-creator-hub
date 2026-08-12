import { useState } from "react";
import { Plus, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { garantirEscrita } from "@/lib/utils";

interface BusinessManager {
  id: number;
  name: string;
}

interface AdAccount {
  id: number;
  account_id: string;
  account_name: string;
  business_manager_id: number | null;
  currency: string;
  status: "active" | "inactive" | "paused" | "error";
  business_managers: { name: string } | null;
}

export default function AdAccountsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_id: "",
    account_name: "",
    business_manager_id: "",
  });

  const { data: businessManagers } = useQuery({
    queryKey: ["business_managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_managers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as BusinessManager[];
    },
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["ad_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("*, business_managers(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as AdAccount[];
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: async (account: typeof newAccount) => {
      const { data, error } = await supabase.from("ad_accounts").insert({
        account_id: account.account_id,
        account_name: account.account_name,
        business_manager_id: account.business_manager_id ? parseInt(account.business_manager_id) : null,
      } as any).select("id");
      if (error) throw error;
      garantirEscrita(data, "cadastrado");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });
      setIsDialogOpen(false);
      setNewAccount({ account_id: "", account_name: "", business_manager_id: "" });
      toast({ title: "Conta adicionada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar conta",
        description: error.message,
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await supabase
        .from("ad_accounts").delete().eq("id", id).select("id");
      if (error) throw error;
      garantirEscrita(data, "excluído");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });
      toast({ title: "Conta excluída" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    },
  });

  const baseColumns = [
    { key: "account_name", header: "Nome" },
    { key: "account_id", header: "ID da Conta" },
    {
      key: "business_manager",
      header: "Business Manager",
      render: (account: AdAccount) => account.business_managers?.name || "-",
    },
    { key: "currency", header: "Moeda" },
    {
      key: "status",
      header: "Status",
      render: (account: AdAccount) => <StatusBadge status={account.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (account: AdAccount) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As campanhas vinculadas também serão excluídas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAccountMutation.mutate(account.id)}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // A trava real e a RLS; isto evita oferecer uma acao que o banco vai recusar.
  const columns = isAdmin ? baseColumns : baseColumns.filter((c) => c.key !== "actions");

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas de Anúncio"
        description="Visualize suas contas de anúncio do Facebook Ads"
      />

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={accounts || []} />
      )}
    </div>
  );
}
