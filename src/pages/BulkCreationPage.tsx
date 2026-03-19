import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ArrowRight, Send, Loader2, ChevronRight,
    Megaphone, Layers, FileImage, CheckCircle2, XCircle, FolderOpen, Save, FileStack,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CAMPAIGN_OBJECTIVES = [
    { value: "OUTCOME_AWARENESS", label: "Reconhecimento" },
    { value: "OUTCOME_TRAFFIC", label: "Tráfego" },
    { value: "OUTCOME_ENGAGEMENT", label: "Engajamento" },
    { value: "OUTCOME_LEADS", label: "Cadastros (Leads)" },
    { value: "OUTCOME_SALES", label: "Vendas" },
];
const CTA_OPTIONS = [
    { value: "LEARN_MORE", label: "Saiba Mais" },
    { value: "SHOP_NOW", label: "Comprar Agora" },
    { value: "SIGN_UP", label: "Cadastre-se" },
    { value: "CONTACT_US", label: "Fale Conosco" },
    { value: "DOWNLOAD", label: "Baixar" },
    { value: "WATCH_MORE", label: "Assistir" },
];
const STEPS = ["Criativos", "Conjuntos", "Campanhas", "Revisão", "Enviado"];

interface AdAccount { id: string; account_id: string; account_name: string; business_manager_id: string | null; }
interface Pixel { id: string; name: string; pixel_id: string; }
interface AdPage { id: string; page_id: string; name: string; business_manager_id: string | null; }
interface InstagramAccount { id: string; instagram_actor_id: string; name: string; business_manager_id: string | null; }
interface Website { id: string; name: string; url: string; }
interface DriveFile { name: string; id: string; mimeType: string; thumbnailLink: string | null; size: string | null; }
interface SelectedFile { driveFileId: string; fileName: string; adName: string; adSetQty: number; }
interface ExistingCampaign { id: string; name: string; objective: string; status: string; ad_account_id: string; }
interface BulkTemplate { id: string; name: string; description: string | null; config: any; created_at: string; }

const formatFileSize = (bytes: string | null) => {
    if (!bytes) return "";
    return `${(parseInt(bytes) / (1024 * 1024)).toFixed(1)} MB`;
};

export default function BulkCreationPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [step, setStep] = useState(0);
    const [executionId, setExecutionId] = useState<string | null>(null);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [templateDesc, setTemplateDesc] = useState("");

    // ── Drive ──
    const [driveUrl, setDriveUrl] = useState("");
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);

    // ── Shared ad config ──
    const [adConfig, setAdConfig] = useState({
        headline: "", call_to_action: "SHOP_NOW", website_id: "",
        utm_params: "", enable_multi_advertiser: false,
    });

    // ── Per-account page mapping ──
    const [accountPageMap, setAccountPageMap] = useState<
        Record<string, { ad_page_id: string; instagram_account_id: string }>
    >({});

    const updateAccountPage = (accountId: string, field: string, value: string) => {
        setAccountPageMap((prev) => ({
            ...prev,
            [accountId]: { ...prev[accountId], [field]: value },
        }));
    };

    // ── Campaigns: existing + new ──
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
    const [createNewCampaigns, setCreateNewCampaigns] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [accountSearch, setAccountSearch] = useState("");
    const [newCampaignConfig, setNewCampaignConfig] = useState({
        name: "Campanha {{i}}", quantity: 1,
        objective: "OUTCOME_SALES", daily_budget: "20",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    });

    // ── Ad set shared config ──
    const [adSetConfig, setAdSetConfig] = useState({
        name: "{{creative}} - Conjunto {{i}}",
        age_min: "18", age_max: "65", genders: "0", countries: "BR", pixel_id: "",
        billing_event: "IMPRESSIONS", optimization_goal: "OFFSITE_CONVERSIONS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    });

    // ── Queries ──
    const { data: adAccounts } = useQuery({
        queryKey: ["ad_accounts"], queryFn: async () => {
            const { data, error } = await supabase.from("ad_accounts").select("id, account_id, account_name, business_manager_id").eq("status", "active");
            if (error) throw error; return data as AdAccount[];
        },
    });
    const { data: existingCampaigns } = useQuery({
        queryKey: ["existing_campaigns"], queryFn: async () => {
            const { data, error } = await supabase.from("campaigns").select("id, name, objective, status, ad_account_id").order("created_at", { ascending: false });
            if (error) throw error; return data as ExistingCampaign[];
        },
    });
    const { data: pixels } = useQuery({ queryKey: ["pixels"], queryFn: async () => { const { data, error } = await supabase.from("pixels").select("id, name, pixel_id"); if (error) throw error; return data as Pixel[]; } });
    const { data: adPages } = useQuery({ queryKey: ["ad_pages"], queryFn: async () => { const { data, error } = await supabase.from("ad_pages").select("id, page_id, name, business_manager_id"); if (error) throw error; return data as AdPage[]; } });
    const { data: instagramAccounts } = useQuery({ queryKey: ["instagram_accounts"], queryFn: async () => { const { data, error } = await supabase.from("instagram_accounts").select("id, instagram_actor_id, name, business_manager_id"); if (error) throw error; return data as InstagramAccount[]; } });
    const { data: websites } = useQuery({ queryKey: ["websites"], queryFn: async () => { const { data, error } = await supabase.from("websites").select("id, name, url"); if (error) throw error; return data as Website[]; } });
    const { data: templates } = useQuery({
        queryKey: ["bulk_templates"], queryFn: async () => {
            const { data, error } = await supabase.from("bulk_templates").select("*").order("created_at", { ascending: false });
            if (error) throw error; return data as BulkTemplate[];
        },
    });

    // ── Template functions ──
    const applyTemplate = (tpl: BulkTemplate) => {
        const c = tpl.config;
        if (c.ad_config) setAdConfig(c.ad_config);
        if (c.campaign_config) setNewCampaignConfig(c.campaign_config);
        if (c.adset_config) setAdSetConfig(c.adset_config);
        if (c.selected_account_ids) setSelectedAccounts(c.selected_account_ids);
        if (c.selected_campaign_ids) setSelectedCampaignIds(c.selected_campaign_ids);
        if (c.account_page_map) setAccountPageMap(c.account_page_map);
        setCreateNewCampaigns(c.create_new_campaigns ?? false);
        if (c.default_adset_qty && selectedFiles.length > 0) {
            setSelectedFiles((prev) => prev.map((f) => ({ ...f, adSetQty: c.default_adset_qty })));
        }
        toast({ title: `Template "${tpl.name}" aplicado` });
    };

    const saveTemplateMutation = useMutation({
        mutationFn: async () => {
            const config = {
                ad_config: adConfig,
                campaign_config: newCampaignConfig,
                adset_config: adSetConfig,
                default_adset_qty: selectedFiles.length > 0 ? selectedFiles[0].adSetQty : 1,
                create_new_campaigns: createNewCampaigns,
                selected_account_ids: selectedAccounts,
                selected_campaign_ids: selectedCampaignIds,
                account_page_map: accountPageMap,
            };
            const { error } = await supabase.from("bulk_templates").insert({
                name: templateName, description: templateDesc || null, config,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Template salvo!" });
            setShowSaveDialog(false);
            setTemplateName(""); setTemplateDesc("");
            queryClient.invalidateQueries({ queryKey: ["bulk_templates"] });
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
    });

    // Auto-apply template from URL param
    useEffect(() => {
        const tplId = searchParams.get("template");
        if (tplId && templates) {
            const tpl = templates.find((t) => t.id === tplId);
            if (tpl) { applyTemplate(tpl); setSearchParams({}); }
        }
    }, [templates, searchParams]);

    // ── Drive helpers ──
    const loadDriveFiles = async () => {
        setIsLoadingDrive(true);
        try {
            const res = await fetch(import.meta.env.VITE_N8N_WEBHOOK_LIST_DRIVE, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folder_url: driveUrl }),
            });
            const data = await res.json();
            const files: DriveFile[] = data.files || [];
            setDriveFiles(files);
            setSelectedFiles(files.map((f) => ({ driveFileId: f.id, fileName: f.name, adName: f.name.replace(/\.[^/.]+$/, ""), adSetQty: 1 })));
            toast({ title: `${files.length} arquivo(s) encontrado(s)` });
        } catch {
            toast({ variant: "destructive", title: "Erro ao carregar", description: "Verifique a URL da pasta." });
        }
        setIsLoadingDrive(false);
    };

    const toggleFile = (file: DriveFile) => {
        setSelectedFiles((prev) => {
            if (prev.find((f) => f.driveFileId === file.id)) return prev.filter((f) => f.driveFileId !== file.id);
            return [...prev, { driveFileId: file.id, fileName: file.name, adName: file.name.replace(/\.[^/.]+$/, ""), adSetQty: 1 }];
        });
    };
    const updateFile = (id: string, field: keyof SelectedFile, value: any) => {
        setSelectedFiles((prev) => prev.map((f) => f.driveFileId === id ? { ...f, [field]: value } : f));
    };
    const toggleAccount = (id: string) => {
        setSelectedAccounts((prev) => {
            const next = prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id];
            // Sync accountPageMap: add entry for new accounts, keep existing ones
            setAccountPageMap((prevMap) => {
                const newMap = { ...prevMap };
                if (!prev.includes(id)) {
                    // Adding account — initialize with empty values
                    if (!newMap[id]) newMap[id] = { ad_page_id: "", instagram_account_id: "" };
                } else {
                    // Removing account
                    delete newMap[id];
                }
                return newMap;
            });
            return next;
        });
    };
    const toggleCampaign = (id: string) => setSelectedCampaignIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

    // ── Totals ──
    const newCampaignCount = createNewCampaigns ? newCampaignConfig.quantity * selectedAccounts.length : 0;
    const totalCampaigns = selectedCampaignIds.length + newCampaignCount;
    const setsPerCampaign = selectedFiles.reduce((s, f) => s + f.adSetQty, 0);
    const totalSets = totalCampaigns * setsPerCampaign;
    const totalAds = totalSets;

    const resolveName = (tpl: string, creative: string, i: number) =>
        tpl.replace(/\{\{creative\}\}/g, creative).replace(/\{\{i\}\}/g, String(i + 1));

    // ── Preview ──
    const buildPreview = () => {
        type CampaignPreview = { name: string; isExisting: boolean; objective: string; adSets: { name: string; ads: { name: string }[] }[] };
        type AccountPreview = { accountId: string; accountName: string; accountAdId: string; pageName: string | null; instaName: string | null; campaigns: CampaignPreview[] };
        const result: AccountPreview[] = [];

        const makeAdSets = () => selectedFiles.flatMap((file) =>
            Array.from({ length: file.adSetQty }, (_, si) => ({
                name: resolveName(adSetConfig.name, file.adName, si), ads: [{ name: file.adName }],
            })),
        );

        for (const accId of selectedAccounts) {
            const acc = adAccounts?.find((a) => a.id === accId);
            const mapping = accountPageMap[accId];
            const page = mapping ? adPages?.find((p) => p.id === mapping.ad_page_id) : null;
            const insta = mapping ? instagramAccounts?.find((i) => i.id === mapping.instagram_account_id) : null;

            const campaigns: CampaignPreview[] = [];

            // Existing campaigns belonging to this account
            for (const campId of selectedCampaignIds) {
                const c = existingCampaigns?.find((x) => x.id === campId && x.ad_account_id === accId);
                if (c) campaigns.push({ name: c.name, isExisting: true, objective: c.objective, adSets: makeAdSets() });
            }

            // New campaigns
            if (createNewCampaigns) {
                for (let ci = 0; ci < newCampaignConfig.quantity; ci++) {
                    campaigns.push({ name: newCampaignConfig.name.replace(/\{\{i\}\}/g, String(ci + 1)), isExisting: false, objective: newCampaignConfig.objective, adSets: makeAdSets() });
                }
            }

            if (campaigns.length > 0) {
                result.push({
                    accountId: accId,
                    accountName: acc?.account_name || accId,
                    accountAdId: acc?.account_id || "",
                    pageName: page?.name || null,
                    instaName: insta?.name || null,
                    campaigns,
                });
            }
        }
        return result;
    };

    // ── Submit ──
    const submitMutation = useMutation({
        mutationFn: async () => {
            const selectedWebsite = websites?.find((w) => w.id === adConfig.website_id);
            const selectedPixel = pixels?.find((p) => p.id === adSetConfig.pixel_id);
            const gendersArray = adSetConfig.genders === "0" ? [0] : adSetConfig.genders === "1" ? [1] : [2];
            const countriesArray = adSetConfig.countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
            const baseUrl = selectedWebsite?.url || "";

            // Phase 0: Create execution record BEFORE webhook so we have the ID
            const now = new Date();
            const execName = `Bulk ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
            const { data: exec, error: execError } = await supabase.from("bulk_executions").insert({
                name: execName,
                status: "pending",
                total_campaigns: totalCampaigns,
                total_adsets: totalSets,
                total_ads: totalAds,
            }).select("id").single();
            if (execError) throw execError;
            const currentExecutionId = exec.id;
            setExecutionId(String(currentExecutionId));

            // Phase 1: Collect all campaigns
            const allCampaigns: { id: string; ad_account_id: string; name: string; isExisting: boolean }[] = [];

            for (const campId of selectedCampaignIds) {
                const c = existingCampaigns?.find((x) => x.id === campId);
                if (c) allCampaigns.push({ id: c.id, ad_account_id: c.ad_account_id, name: c.name, isExisting: true });
            }

            if (createNewCampaigns) {
                for (const accountId of selectedAccounts) {
                    for (let ci = 0; ci < newCampaignConfig.quantity; ci++) {
                        const campName = newCampaignConfig.name.replace(/\{\{i\}\}/g, String(ci + 1));
                        const { data: campaign, error: campError } = await supabase
                            .from("campaigns").insert({
                                ad_account_id: accountId, name: campName,
                                objective: newCampaignConfig.objective,
                                daily_budget: Math.round(parseFloat(newCampaignConfig.daily_budget) * 100),
                                bid_strategy: newCampaignConfig.bid_strategy,
                                status: "DRAFT", sync_status: "pending",
                                execution_id: currentExecutionId,
                            }).select("id").single();
                        if (campError) throw campError;
                        allCampaigns.push({ id: campaign.id, ad_account_id: accountId, name: campName, isExisting: false });
                    }
                }
            }

            // Phase 2: For each campaign, create ad sets per creative (with indices)
            const webhookCampaigns: any[] = [];
            let globalAdSetIndex = 0;
            let globalAdIndex = 0;

            for (let campIdx = 0; campIdx < allCampaigns.length; campIdx++) {
                const camp = allCampaigns[campIdx];
                const webhookAdSets: any[] = [];

                for (let fi = 0; fi < selectedFiles.length; fi++) {
                    const file = selectedFiles[fi];
                    for (let si = 0; si < file.adSetQty; si++) {
                        globalAdSetIndex++;
                        globalAdIndex++;
                        const setName = resolveName(adSetConfig.name, file.adName, si);

                        const { data: adSet, error: setError } = await supabase
                            .from("ad_sets").insert({
                                campaign_id: camp.id, name: setName,
                                age_min: parseInt(adSetConfig.age_min), age_max: parseInt(adSetConfig.age_max),
                                genders: gendersArray, targeting_countries: countriesArray,
                                execution_id: currentExecutionId,
                            }).select("id").single();
                        if (setError) throw setError;

                        const { data: ad, error: adError } = await supabase
                            .from("ads").insert({
                                ad_set_id: adSet.id, name: file.adName,
                                headline: adConfig.headline || null, call_to_action: adConfig.call_to_action,
                                link_url: baseUrl || null, video_drive_url: driveUrl || null,
                                execution_id: currentExecutionId,
                            }).select("id").single();
                        if (adError) throw adError;

                        webhookAdSets.push({
                            adset_index: globalAdSetIndex,
                            adset_id: adSet.id, campaign_id: camp.id, name: setName,
                            age_min: parseInt(adSetConfig.age_min), age_max: parseInt(adSetConfig.age_max),
                            genders: gendersArray, countries: countriesArray,
                            pixel_id: selectedPixel?.pixel_id || null,
                            billing_event: adSetConfig.billing_event, optimization_goal: adSetConfig.optimization_goal,
                            bid_strategy: adSetConfig.bid_strategy,
                            promoted_object: selectedPixel ? { pixel_id: selectedPixel.pixel_id, custom_event_type: "PURCHASE" } : undefined,
                            targeting_automation: { advantage_audience: 1 },
                            ads: [{
                                ad_index: globalAdIndex,
                                ad_id: ad.id, adset_id: adSet.id, campaign_id: camp.id,
                                name: file.adName, headline: adConfig.headline || null,
                                call_to_action: adConfig.call_to_action,
                                page_id: (() => { const m = accountPageMap[camp.ad_account_id]; const p = adPages?.find((x) => x.id === m?.ad_page_id); return p?.page_id || null; })(),
                                instagram_actor_id: (() => { const m = accountPageMap[camp.ad_account_id]; const i = instagramAccounts?.find((x) => x.id === m?.instagram_account_id); return i?.instagram_actor_id || null; })(),
                                video_index: fi + 1, video_drive_id: file.driveFileId,
                                video_drive_url: driveUrl || null, video_file_name: file.fileName,
                                link_url: baseUrl || null, url_tags: adConfig.utm_params || null,
                                enable_multi_advertiser: adConfig.enable_multi_advertiser,
                            }],
                        });
                    }
                }

                webhookCampaigns.push({
                    campaign_index: campIdx + 1,
                    campaign_id: camp.id, ad_account_id: camp.ad_account_id,
                    name: camp.name, is_existing: camp.isExisting,
                    objective: camp.isExisting ? undefined : newCampaignConfig.objective,
                    daily_budget: camp.isExisting ? undefined : Math.round(parseFloat(newCampaignConfig.daily_budget) * 100),
                    bid_strategy: camp.isExisting ? undefined : newCampaignConfig.bid_strategy,
                    ad_sets: webhookAdSets,
                });
            }

            const res = await fetch(import.meta.env.VITE_N8N_WEBHOOK_BULK, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ execution_id: currentExecutionId, campaigns: webhookCampaigns, user_id: user?.id, total_campaigns: totalCampaigns, total_adsets: totalSets, total_ads: totalAds, total_videos: selectedFiles.length }),
            });
            if (!res.ok) throw new Error("Webhook falhou");
            return webhookCampaigns;
        },
        onSuccess: async () => {
            toast({ title: "Enviado com sucesso!", description: `${totalCampaigns} campanhas, ${totalSets} conjuntos e ${totalAds} anúncios.` });
            setStep(4);
        },
        onError: (error: any) => toast({ variant: "destructive", title: "Erro ao criar", description: error.message }),
    });

    const canGoNext = () => {
        if (step === 0) return selectedFiles.length > 0 && adConfig.website_id && selectedAccounts.length > 0 && selectedAccounts.every((id) => accountPageMap[id]?.ad_page_id);
        if (step === 1) return adSetConfig.name && adSetConfig.countries;
        if (step === 2) return selectedCampaignIds.length > 0 || (createNewCampaigns && newCampaignConfig.name);
        return true;
    };

    // ════════════════════════════════════════
    // Step 0: Criativos
    // ════════════════════════════════════════
    const renderStep0 = () => (
        <div className="space-y-6">
            {/* Account selection */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">📊 Contas de Anúncio *</CardTitle>
                        {adAccounts && adAccounts.length > 0 && (
                            <Badge variant="secondary">{selectedAccounts.length}/{adAccounts.length} selecionada(s)</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(!adAccounts || adAccounts.length === 0) ? (
                        <p className="text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
                    ) : (
                        <>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Buscar por nome ou ID da conta..."
                                        value={accountSearch}
                                        onChange={(e) => setAccountSearch(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 whitespace-nowrap"
                                    onClick={() => {
                                        const filtered = adAccounts.filter((acc) => {
                                            const q = accountSearch.toLowerCase();
                                            return !q || acc.account_name.toLowerCase().includes(q) || acc.account_id.toLowerCase().includes(q);
                                        });
                                        const filteredIds = filtered.map((a) => a.id);
                                        const allSelected = filteredIds.every((id) => selectedAccounts.includes(id));
                                        if (allSelected) {
                                            setSelectedAccounts((prev) => prev.filter((id) => !filteredIds.includes(id)));
                                            setAccountPageMap((prev) => {
                                                const newMap = { ...prev };
                                                filteredIds.forEach((id) => delete newMap[id]);
                                                return newMap;
                                            });
                                        } else {
                                            setSelectedAccounts((prev) => [...new Set([...prev, ...filteredIds])]);
                                            setAccountPageMap((prev) => {
                                                const newMap = { ...prev };
                                                filteredIds.forEach((id) => {
                                                    if (!newMap[id]) newMap[id] = { ad_page_id: "", instagram_account_id: "" };
                                                });
                                                return newMap;
                                            });
                                        }
                                    }}
                                >
                                    {(() => {
                                        const filtered = adAccounts.filter((acc) => {
                                            const q = accountSearch.toLowerCase();
                                            return !q || acc.account_name.toLowerCase().includes(q) || acc.account_id.toLowerCase().includes(q);
                                        });
                                        return filtered.every((a) => selectedAccounts.includes(a.id)) ? "Desmarcar todos" : "Marcar todos";
                                    })()}
                                </Button>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {adAccounts
                                    .filter((acc) => {
                                        const q = accountSearch.toLowerCase();
                                        return !q || acc.account_name.toLowerCase().includes(q) || acc.account_id.toLowerCase().includes(q);
                                    })
                                    .map((acc) => (
                                        <div key={acc.id} className="flex items-center gap-3">
                                            <Checkbox checked={selectedAccounts.includes(acc.id)} onCheckedChange={() => toggleAccount(acc.id)} />
                                            <label className="text-sm cursor-pointer">{acc.account_name} <span className="text-muted-foreground">({acc.account_id})</span></label>
                                        </div>
                                    ))}
                                {adAccounts.filter((acc) => {
                                    const q = accountSearch.toLowerCase();
                                    return !q || acc.account_name.toLowerCase().includes(q) || acc.account_id.toLowerCase().includes(q);
                                }).length === 0 && (
                                        <p className="text-sm text-muted-foreground py-2">Nenhuma conta encontrada para "{accountSearch}"</p>
                                    )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FolderOpen className="w-5 h-5" />Criativos do Google Drive</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Label>Pasta do Drive *</Label>
                            <Input placeholder="https://drive.google.com/drive/folders/..." value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={loadDriveFiles} disabled={!driveUrl || isLoadingDrive}>
                                {isLoadingDrive ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Carregando...</> : "Carregar"}
                            </Button>
                        </div>
                    </div>
                    {/* Template selector — between URL and file list */}
                    {driveFiles.length > 0 && templates && templates.length > 0 && (
                        <div className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-center gap-3">
                                <FileStack className="w-4 h-4 text-muted-foreground shrink-0" />
                                <Select onValueChange={(id) => { const t = templates.find((x) => x.id === id); if (t) applyTemplate(t); }}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Aplicar template..." /></SelectTrigger>
                                    <SelectContent>
                                        {templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name}{t.description ? ` — ${t.description}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    {driveFiles.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">{driveFiles.length} arquivo(s)</Label>
                                <Button variant="ghost" size="sm" onClick={() => {
                                    if (selectedFiles.length === driveFiles.length) setSelectedFiles([]);
                                    else setSelectedFiles(driveFiles.map((f) => ({ driveFileId: f.id, fileName: f.name, adName: f.name.replace(/\.[^/.]+$/, ""), adSetQty: 1 })));
                                }}>
                                    {selectedFiles.length === driveFiles.length ? "Desmarcar todos" : "Selecionar todos"}
                                </Button>
                            </div>
                            {driveFiles.map((file) => {
                                const sel = selectedFiles.find((f) => f.driveFileId === file.id);
                                return (
                                    <div key={file.id} className={`border rounded-lg p-4 transition-colors ${sel ? "border-primary/40 bg-primary/5" : ""}`}>
                                        <div className="flex items-start gap-3">
                                            <Checkbox checked={!!sel} onCheckedChange={() => toggleFile(file)} className="mt-1" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium break-all leading-relaxed">🎬 {file.name}</p>
                                                {file.size && <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>}
                                            </div>
                                        </div>
                                        {sel && (
                                            <div className="mt-3 ml-9 space-y-3">
                                                <div>
                                                    <Label className="text-xs">Nome do Anúncio</Label>
                                                    <Input className="h-8 text-sm" value={sel.adName} onChange={(e) => updateFile(file.id, "adName", e.target.value)} />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Conjuntos por campanha</Label>
                                                    <Input type="number" min={1} max={50} className="h-8 text-sm w-24" value={sel.adSetQty}
                                                        onChange={(e) => updateFile(file.id, "adSetQty", Math.max(1, parseInt(e.target.value) || 1))} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>


            {/* Per-account page mapping */}
            {selectedAccounts.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2">📘 Páginas por Conta *</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* Apply to all */}
                        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                            <p className="text-sm font-medium">🔗 Aplicar para todas as contas</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs">Página de Anúncio</Label>
                                    <Select onValueChange={(v) => {
                                        setAccountPageMap((prev) => {
                                            const newMap = { ...prev };
                                            selectedAccounts.forEach((id) => { newMap[id] = { ...newMap[id], ad_page_id: v }; });
                                            return newMap;
                                        });
                                    }}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar página para todas..." /></SelectTrigger>
                                        <SelectContent>{adPages?.map((p) => (<SelectItem key={p.id} value={p.id}>📘 {p.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Conta Instagram</Label>
                                    <Select onValueChange={(v) => {
                                        setAccountPageMap((prev) => {
                                            const newMap = { ...prev };
                                            selectedAccounts.forEach((id) => { newMap[id] = { ...newMap[id], instagram_account_id: v }; });
                                            return newMap;
                                        });
                                    }}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar Instagram para todas..." /></SelectTrigger>
                                        <SelectContent>{instagramAccounts?.map((i) => (<SelectItem key={i.id} value={i.id}>📸 {i.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        {selectedAccounts.map((accId) => {
                            const acc = adAccounts?.find((a) => a.id === accId);
                            const bmId = acc?.business_manager_id;
                            const filteredPages = adPages?.filter((p) => !bmId || p.business_manager_id === bmId) || [];
                            const filteredInstas = instagramAccounts?.filter((i) => !bmId || i.business_manager_id === bmId) || [];
                            const mapping = accountPageMap[accId] || { ad_page_id: "", instagram_account_id: "" };
                            return (
                                <div key={accId} className="border rounded-lg p-4 space-y-3">
                                    <p className="text-sm font-medium">{acc?.account_name} <span className="text-muted-foreground">({acc?.account_id})</span></p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs">Página de Anúncio *</Label>
                                            <Select value={mapping.ad_page_id} onValueChange={(v) => updateAccountPage(accId, "ad_page_id", v)}>
                                                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a página" /></SelectTrigger>
                                                <SelectContent>{filteredPages.map((p) => (<SelectItem key={p.id} value={p.id}>📘 {p.name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Conta Instagram</Label>
                                            <Select value={mapping.instagram_account_id} onValueChange={(v) => updateAccountPage(accId, "instagram_account_id", v)}>
                                                <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma (opcional)" /></SelectTrigger>
                                                <SelectContent>{filteredInstas.map((i) => (<SelectItem key={i.id} value={i.id}>📸 {i.name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle className="text-lg">Configurações do Anúncio</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Título *</Label><Input placeholder="Ex: Oferta Imperdível!" value={adConfig.headline} onChange={(e) => setAdConfig({ ...adConfig, headline: e.target.value })} /></div>
                        <div>
                            <Label>Call to Action</Label>
                            <Select value={adConfig.call_to_action} onValueChange={(v) => setAdConfig({ ...adConfig, call_to_action: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{CTA_OPTIONS.map((cta) => (<SelectItem key={cta.value} value={cta.value}>{cta.label}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Site de Destino *</Label>
                            <Select value={adConfig.website_id} onValueChange={(v) => setAdConfig({ ...adConfig, website_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>{websites?.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name} ({w.url})</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div><Label>UTMs</Label><Input placeholder="utm_source=fb&utm_campaign=promo" value={adConfig.utm_params} onChange={(e) => setAdConfig({ ...adConfig, utm_params: e.target.value })} /></div>
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div><Label htmlFor="bulk_multi_adv" className="text-sm">Anunciar com vários anunciantes</Label><p className="text-xs text-muted-foreground">Seu anúncio pode aparecer junto a outros</p></div>
                            <Switch id="bulk_multi_adv" checked={adConfig.enable_multi_advertiser} onCheckedChange={(checked) => setAdConfig({ ...adConfig, enable_multi_advertiser: checked })} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // ════════════════════════════════════════
    // Step 1: Conjuntos
    // ════════════════════════════════════════
    const renderStep1 = () => (
        <div className="space-y-6">
            {/* Existing campaigns */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Campanhas Existentes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {(() => {
                        const filtered = existingCampaigns?.filter((c) => selectedAccounts.includes(c.ad_account_id)) || [];
                        if (filtered.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma campanha encontrada para as contas selecionadas.</p>;
                        return filtered.map((camp) => {
                            const acc = adAccounts?.find((a) => a.id === camp.ad_account_id);
                            return (
                                <div key={camp.id} className="flex items-center gap-3">
                                    <Checkbox checked={selectedCampaignIds.includes(camp.id)} onCheckedChange={() => toggleCampaign(camp.id)} />
                                    <div className="flex-1 text-sm">
                                        <span className="font-medium">{camp.name}</span>
                                        <Badge variant="outline" className="ml-2 text-xs">{CAMPAIGN_OBJECTIVES.find((o) => o.value === camp.objective)?.label}</Badge>
                                        <Badge variant={camp.status === "ACTIVE" ? "default" : "secondary"} className="ml-1 text-xs">{camp.status}</Badge>
                                        {acc && <span className="text-muted-foreground ml-2">— {acc.account_name}</span>}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </CardContent>
            </Card>

            {/* Create new campaigns */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Criar Novas Campanhas</CardTitle>
                        <Switch checked={createNewCampaigns} onCheckedChange={setCreateNewCampaigns} />
                    </div>
                </CardHeader>
                {createNewCampaigns && (
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">As novas campanhas serão criadas nas {selectedAccounts.length} conta(s) selecionada(s) no passo 1.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nome Base *</Label>
                                <Input value={newCampaignConfig.name} onChange={(e) => setNewCampaignConfig({ ...newCampaignConfig, name: e.target.value })} />
                                <p className="text-xs text-muted-foreground mt-1">Use {"{{i}}"} para índice</p>
                            </div>
                            <div>
                                <Label>Quantidade *</Label>
                                <Input type="number" min={1} max={50} value={newCampaignConfig.quantity} onChange={(e) => setNewCampaignConfig({ ...newCampaignConfig, quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Objetivo *</Label>
                                <Select value={newCampaignConfig.objective} onValueChange={(v) => setNewCampaignConfig({ ...newCampaignConfig, objective: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{CAMPAIGN_OBJECTIVES.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Orçamento Diário (R$) *</Label>
                                <Input type="number" min={5} value={newCampaignConfig.daily_budget} onChange={(e) => setNewCampaignConfig({ ...newCampaignConfig, daily_budget: e.target.value })} />
                            </div>
                            <div>
                                <Label>Bid Strategy</Label>
                                <Select value={newCampaignConfig.bid_strategy} onValueChange={(v) => setNewCampaignConfig({ ...newCampaignConfig, bid_strategy: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOWEST_COST_WITHOUT_CAP">Menor Custo</SelectItem>
                                        <SelectItem value="COST_CAP">Custo Alvo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );

    // ════════════════════════════════════════
    // Step 2: Campanhas
    // ════════════════════════════════════════
    const renderStep2 = () => (
        <div className="space-y-6"><Card>
            <CardHeader><CardTitle className="text-lg">Configuração do Conjunto de Anúncios</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Nome Base *</Label>
                    <Input value={adSetConfig.name} onChange={(e) => setAdSetConfig({ ...adSetConfig, name: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Use {"{{creative}}"} para o nome do criativo e {"{{i}}"} para o índice</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div><Label>Pixel</Label><Select value={adSetConfig.pixel_id} onValueChange={(v) => setAdSetConfig({ ...adSetConfig, pixel_id: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{pixels?.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select></div>
                    <div><Label>Países *</Label><Input value={adSetConfig.countries} onChange={(e) => setAdSetConfig({ ...adSetConfig, countries: e.target.value })} placeholder="BR, US, PT" /></div>
                    <div><Label>Gênero</Label><Select value={adSetConfig.genders} onValueChange={(v) => setAdSetConfig({ ...adSetConfig, genders: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Todos</SelectItem><SelectItem value="1">Masculino</SelectItem><SelectItem value="2">Feminino</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Idade Mínima</Label><Input type="number" min={13} max={65} value={adSetConfig.age_min} onChange={(e) => setAdSetConfig({ ...adSetConfig, age_min: e.target.value })} /></div>
                    <div><Label>Idade Máxima</Label><Input type="number" min={13} max={65} value={adSetConfig.age_max} onChange={(e) => setAdSetConfig({ ...adSetConfig, age_max: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div><Label>Billing Event</Label><Select value={adSetConfig.billing_event} onValueChange={(v) => setAdSetConfig({ ...adSetConfig, billing_event: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="IMPRESSIONS">Impressões</SelectItem></SelectContent></Select></div>
                    <div><Label>Optimization Goal</Label><Select value={adSetConfig.optimization_goal} onValueChange={(v) => setAdSetConfig({ ...adSetConfig, optimization_goal: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OFFSITE_CONVERSIONS">Conversões</SelectItem><SelectItem value="LINK_CLICKS">Cliques no Link</SelectItem><SelectItem value="LANDING_PAGE_VIEWS">Visualizações da Página</SelectItem></SelectContent></Select></div>
                    <div><Label>Bid Strategy</Label><Select value={adSetConfig.bid_strategy} onValueChange={(v) => setAdSetConfig({ ...adSetConfig, bid_strategy: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LOWEST_COST_WITHOUT_CAP">Menor Custo</SelectItem><SelectItem value="COST_CAP">Custo Alvo</SelectItem></SelectContent></Select></div>
                </div>
            </CardContent>
        </Card></div>
    );

    // ════════════════════════════════════════
    // Step 3: Revisão
    // ════════════════════════════════════════
    const renderStep3 = () => {
        const preview = buildPreview();
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    <Card><CardContent className="pt-6 text-center"><Badge variant="secondary" className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-lg p-0">📊</Badge><p className="text-3xl font-bold">{selectedAccounts.length}</p><p className="text-sm text-muted-foreground">Contas</p></CardContent></Card>
                    <Card><CardContent className="pt-6 text-center"><Megaphone className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{totalCampaigns}</p><p className="text-sm text-muted-foreground">Campanhas</p></CardContent></Card>
                    <Card><CardContent className="pt-6 text-center"><Layers className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{totalSets}</p><p className="text-sm text-muted-foreground">Conjuntos</p></CardContent></Card>
                    <Card><CardContent className="pt-6 text-center"><FileImage className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{totalAds}</p><p className="text-sm text-muted-foreground">Anúncios</p></CardContent></Card>
                </div>

                {/* Accounts summary */}
                <Card>
                    <CardHeader><CardTitle className="text-lg">Estrutura</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4 text-sm font-mono">
                            {preview.map((account, ai) => (
                                <div key={ai} className="border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="font-bold text-base">📊 {account.accountName} <span className="text-muted-foreground font-normal">({account.accountAdId})</span></p>
                                        {account.pageName && <Badge variant="outline" className="text-xs font-sans">📘 {account.pageName}</Badge>}
                                        {account.instaName && <Badge variant="outline" className="text-xs font-sans">📸 {account.instaName}</Badge>}
                                    </div>
                                    {account.campaigns.map((camp, ci) => (
                                        <div key={ci} className="ml-4 mb-2">
                                            <p className="font-semibold">
                                                📂 {camp.name}
                                                <Badge variant={camp.isExisting ? "secondary" : "default"} className="ml-2 text-xs font-sans">{camp.isExisting ? "Existente" : "Nova"}</Badge>
                                                <Badge variant="outline" className="ml-1 text-xs font-sans">{CAMPAIGN_OBJECTIVES.find((o) => o.value === camp.objective)?.label}</Badge>
                                            </p>
                                            {camp.adSets.map((as_item, asi) => (
                                                <div key={asi} className="ml-4">
                                                    <p>📁 {as_item.name}</p>
                                                    {as_item.ads.map((ad, adi) => (
                                                        <p key={adi} className="ml-4 text-muted-foreground">📄 {ad.name}</p>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button className="flex-1" size="lg" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                        {submitMutation.isPending
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando e enviando ao n8n...</>
                            : <><Send className="w-4 h-4 mr-2" />Criar Tudo ({totalCampaigns + totalSets + totalAds} itens)</>}
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setShowSaveDialog(true)}>
                        <Save className="w-4 h-4 mr-2" />Salvar Template
                    </Button>
                </div>
                {submitMutation.isSuccess && <div className="flex items-center gap-2 text-green-600 justify-center"><CheckCircle2 className="w-5 h-5" /><span>Criado e enviado com sucesso!</span></div>}
                {submitMutation.isError && <div className="flex items-center gap-2 text-red-500 justify-center"><XCircle className="w-5 h-5" /><span>Erro ao criar. Tente novamente.</span></div>}

                {/* Save Template Dialog */}
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Salvar como Template</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                            <div><Label>Nome *</Label><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex: Black Friday Vendas" /></div>
                            <div><Label>Descrição</Label><Input value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="Ex: 3 conjuntos por campanha, CBO vendas" /></div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
                            <Button onClick={() => saveTemplateMutation.mutate()} disabled={!templateName || saveTemplateMutation.isPending}>
                                {saveTemplateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Salvar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    };

    // ════════════════════════════════════════
    // Step 4: Enviado (Summary + Redirect)
    // ════════════════════════════════════════
    // Auto-redirect after 4 seconds
    useEffect(() => {
        if (step === 4) {
            const timer = setTimeout(() => navigate("/executions"), 4000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const renderStep4 = () => (
        <div className="space-y-6 text-center py-8">
            <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
            </div>
            <div>
                <h2 className="text-xl font-bold">Criação enviada com sucesso!</h2>
                <p className="text-muted-foreground mt-1">Os itens foram salvos e enviados para o n8n</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <Card><CardContent className="pt-6 text-center"><Megaphone className="w-6 h-6 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{totalCampaigns}</p><p className="text-xs text-muted-foreground">Campanhas</p></CardContent></Card>
                <Card><CardContent className="pt-6 text-center"><Layers className="w-6 h-6 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{totalSets}</p><p className="text-xs text-muted-foreground">Conjuntos</p></CardContent></Card>
                <Card><CardContent className="pt-6 text-center"><FileImage className="w-6 h-6 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{totalAds}</p><p className="text-xs text-muted-foreground">Anúncios</p></CardContent></Card>
            </div>

            <p className="text-sm text-muted-foreground animate-pulse">Redirecionando para execuções...</p>
        </div>
    );

    const renderCurrentStep = () => { switch (step) { case 0: return renderStep0(); case 1: return renderStep2(); case 2: return renderStep1(); case 3: return renderStep3(); case 4: return renderStep4(); default: return null; } };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Criação em Massa</h1>
                <p className="text-muted-foreground">Crie campanhas, conjuntos e anúncios em um único disparo</p>
            </div>
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((label, i) => (
                    <div key={label} className="flex items-center gap-2 flex-1">
                        <button onClick={() => i < step && setStep(i)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30" : "bg-muted text-muted-foreground"}`}>
                            <span className="w-6 h-6 rounded-full bg-background/20 flex items-center justify-center text-xs">{i < step ? "✓" : i + 1}</span>{label}
                        </button>
                        {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                ))}
            </div>
            {renderCurrentStep()}
            {step < 3 && (
                <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{selectedFiles.length} criativos · {totalCampaigns} campanhas · {totalSets} conjuntos · {totalAds} anúncios</span>
                        <Button onClick={() => setStep(step + 1)} disabled={!canGoNext()}>Próximo<ArrowRight className="w-4 h-4 ml-2" /></Button>
                    </div>
                </div>
            )}
        </div>
    );
}
