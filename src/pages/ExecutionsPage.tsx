import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/integrations/supabase/client";

interface Execution {
    id: number;
    name: string;
    status: "pending" | "completed" | "error";
    total_campaigns: number;
    total_adsets: number;
    total_ads: number;
    error_message: string | null;
    created_at: string;
}

const columns = [
    {
        key: "name",
        header: "Execução",
        render: (exec: Execution) => (
            <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="font-medium">{exec.name}</span>
            </div>
        ),
    },
    {
        key: "id",
        header: "ID",
        render: (exec: Execution) => (
            <span className="text-sm font-mono text-muted-foreground">#{exec.id}</span>
        ),
    },
    {
        key: "created_at",
        header: "Data",
        render: (exec: Execution) => (
            <span className="text-sm">
                {new Date(exec.created_at).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                })}
            </span>
        ),
    },
    {
        key: "total_campaigns",
        header: "Campanhas",
        render: (exec: Execution) => <span className="font-medium">{exec.total_campaigns}</span>,
    },
    {
        key: "total_adsets",
        header: "Conjuntos",
        render: (exec: Execution) => <span className="font-medium">{exec.total_adsets}</span>,
    },
    {
        key: "total_ads",
        header: "Anúncios",
        render: (exec: Execution) => <span className="font-medium">{exec.total_ads}</span>,
    },
    {
        key: "status",
        header: "Status",
        render: (exec: Execution) => {
            const statusMap: Record<string, { status: "pending" | "active" | "error"; label: string }> = {
                pending: { status: "pending", label: "Pendente" },
                completed: { status: "active", label: "Concluído" },
                error: { status: "error", label: "Erro" },
            };
            const mapped = statusMap[exec.status] || statusMap.pending;
            return <StatusBadge status={mapped.status} label={mapped.label} />;
        },
    },
    {
        key: "error_message",
        header: "Erro",
        render: (exec: Execution) => {
            if (exec.status !== "error" || !exec.error_message) return <span className="text-sm text-muted-foreground">—</span>;
            return <ErrorMessageCell message={exec.error_message} />;
        },
    },
];

function ErrorMessageCell({ message }: { message: string }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = message.length > 80;

    return (
        <div className="max-w-xs">
            <div className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <span className={`text-sm text-red-600 ${!expanded && isLong ? "line-clamp-2" : ""}`}>
                    {message}
                </span>
                {isLong && (
                    <button onClick={() => setExpanded(!expanded)} className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground">
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ExecutionsPage() {
    const { data: executions = [], isLoading } = useQuery({
        queryKey: ["bulk_executions"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bulk_executions")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as Execution[];
        },
    });

    const pending = executions.filter((e) => e.status === "pending").length;
    const completed = executions.filter((e) => e.status === "completed").length;
    const errors = executions.filter((e) => e.status === "error").length;

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Execuções"
                description="Acompanhe as criações em massa enviadas para o n8n"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold mt-1">{executions.length}</p>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Pendentes</p>
                    </div>
                    <p className="text-2xl font-bold mt-1">{pending}</p>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <p className="text-sm text-muted-foreground">Concluídas</p>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-green-600">{completed}</p>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <p className="text-sm text-muted-foreground">Erros</p>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-red-500">{errors}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : (
                <DataTable columns={columns} data={executions} />
            )}
        </div>
    );
}
