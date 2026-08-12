import { useState } from "react";
import { Plus, MoreHorizontal, RefreshCw, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
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
    id: string;
    name: string;
}

interface Pixel {
    id: string;
    business_manager_id: string;
    name: string;
    pixel_id: string;
    created_at: string;
    business_managers: { name: string } | null;
}

export default function PixelsPage() {
    const { user, isAdmin } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newPixel, setNewPixel] = useState({
        business_manager_id: "",
        name: "",
        pixel_id: "",
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

    const { data: pixels, isLoading } = useQuery({
        queryKey: ["pixels"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("pixels")
                .select("*, business_managers(name)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as unknown as Pixel[];
        },
    });

    const addPixelMutation = useMutation({
        mutationFn: async (pixel: typeof newPixel) => {
            const { data, error } = await supabase.from("pixels").insert({
                business_manager_id: pixel.business_manager_id,
                name: pixel.name,
                pixel_id: pixel.pixel_id,
            }).select("id");
            if (error) throw error;
            garantirEscrita(data, "cadastrado");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pixels"] });
            setIsDialogOpen(false);
            setNewPixel({ business_manager_id: "", name: "", pixel_id: "" });
            toast({ title: "Pixel adicionado!" });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        },
    });

    const deletePixelMutation = useMutation({
        mutationFn: async (id: string) => {
            const { data, error } = await supabase
                .from("pixels").delete().eq("id", id).select("id");
            if (error) throw error;
            garantirEscrita(data, "excluído");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pixels"] });
            toast({ title: "Pixel excluído" });
        },
    });

    const baseColumns = [
        { key: "name", header: "Nome do Pixel" },
        { key: "pixel_id", header: "Pixel ID" },
        {
            key: "business_manager",
            header: "Business Manager",
            render: (pixel: Pixel) => pixel.business_managers?.name || "-",
        },
        {
            key: "actions",
            header: "",
            render: (pixel: Pixel) => (
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
                                    <AlertDialogTitle>Excluir pixel?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePixelMutation.mutate(pixel.id)}>
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
                title="Pixels do Facebook"
                description="Gerencie os pixels vinculados aos seus Business Managers"
                action={!isAdmin ? undefined : (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Pixel
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Pixel</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div>
                                    <Label>Business Manager *</Label>
                                    <Select
                                        value={newPixel.business_manager_id}
                                        onValueChange={(value) => setNewPixel({ ...newPixel, business_manager_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um BM" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {businessManagers?.map((bm) => (
                                                <SelectItem key={bm.id} value={bm.id}>
                                                    {bm.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="pixel_name">Nome do Pixel *</Label>
                                    <Input
                                        id="pixel_name"
                                        placeholder="Ex: Pixel Principal"
                                        value={newPixel.name}
                                        onChange={(e) => setNewPixel({ ...newPixel, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="pixel_id">Pixel ID *</Label>
                                    <Input
                                        id="pixel_id"
                                        placeholder="Ex: 1546233976446541"
                                        value={newPixel.pixel_id}
                                        onChange={(e) => setNewPixel({ ...newPixel, pixel_id: e.target.value })}
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => addPixelMutation.mutate(newPixel)}
                                    disabled={!newPixel.business_manager_id || !newPixel.name || !newPixel.pixel_id || addPixelMutation.isPending}
                                >
                                    {addPixelMutation.isPending ? "Adicionando..." : "Adicionar Pixel"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            />

            {isLoading ? (
                <div className="flex items-center justify-center p-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
            ) : (
                <DataTable columns={columns} data={pixels || []} />
            )}
        </div>
    );
}
