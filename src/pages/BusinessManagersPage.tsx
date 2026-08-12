import { MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { garantirEscrita } from "@/lib/utils";

interface BusinessManager {
  id: number;
  name: string;
  business_manager_id: string;
  access_token: string | null;
  ad_accounts: { id: number; account_name: string }[];
}

export default function BusinessManagersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: businessManagers, isLoading } = useQuery({
    queryKey: ["business_managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_managers")
        .select("*, ad_accounts(id, account_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as BusinessManager[];
    },
  });



  const deleteBMMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await supabase
        .from("business_managers").delete().eq("id", id).select("id");
      if (error) throw error;
      garantirEscrita(data, "excluído");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_managers"] });
      toast({ title: "Business Manager excluído" });
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
    { key: "name", header: "Nome" },
    { key: "business_manager_id", header: "BM ID" },
    {
      key: "access_token",
      header: "Token",
      render: (bm: BusinessManager) =>
        bm.access_token ? (
          <Badge className="bg-green-500">Configurado</Badge>
        ) : (
          <Badge variant="outline">Sem token</Badge>
        ),
    },
    {
      key: "ad_accounts_count",
      header: "Contas",
      render: (bm: BusinessManager) => {
        const count = bm.ad_accounts?.length || 0;
        return (
          <Badge variant="outline" title={bm.ad_accounts?.map(a => a.account_name).join(", ") || "Nenhuma conta"}>
            {count} {count === 1 ? "conta" : "contas"}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (bm: BusinessManager) => (
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
                  <AlertDialogTitle>Excluir Business Manager?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As contas de anúncio vinculadas perderão a referência.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteBMMutation.mutate(bm.id)}>
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
        title="Business Managers"
        description="Visualize seus Business Managers do Meta"
      />

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={businessManagers || []} />
      )}
    </div>
  );
}
