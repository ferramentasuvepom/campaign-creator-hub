import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Pencil, Loader2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BulkTemplate {
  id: string;
  name: string;
  description: string | null;
  config: any;
  created_at: string;
}

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

export default function TemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<BulkTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editConfig, setEditConfig] = useState<any>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["bulk_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bulk_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as BulkTemplate[];
    },
  });

  // Fetch reference data for labels
  const { data: adPages } = useQuery({ queryKey: ["ad_pages"], queryFn: async () => { const { data } = await supabase.from("ad_pages").select("id, page_id, name"); return data || []; } });
  const { data: websites } = useQuery({ queryKey: ["websites"], queryFn: async () => { const { data } = await supabase.from("websites").select("id, name, url"); return data || []; } });
  const { data: pixels } = useQuery({ queryKey: ["pixels"], queryFn: async () => { const { data } = await supabase.from("pixels").select("id, name, pixel_id"); return data || []; } });
  const { data: instagramAccounts } = useQuery({ queryKey: ["instagram_accounts"], queryFn: async () => { const { data } = await supabase.from("instagram_accounts").select("id, instagram_actor_id, name"); return data || []; } });
  const { data: adAccounts } = useQuery({ queryKey: ["ad_accounts"], queryFn: async () => { const { data } = await supabase.from("ad_accounts").select("id, account_id, account_name"); return data || []; } });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("bulk_templates").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast({ title: "Template excluído" }); queryClient.invalidateQueries({ queryKey: ["bulk_templates"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editTemplate) return;
      const { error } = await supabase.from("bulk_templates").update({
        name: editName, description: editDesc || null, config: editConfig,
      }).eq("id", editTemplate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template atualizado" });
      setEditTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["bulk_templates"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const openEdit = (tpl: BulkTemplate) => {
    setEditTemplate(tpl);
    setEditName(tpl.name);
    setEditDesc(tpl.description || "");
    setEditConfig(JSON.parse(JSON.stringify(tpl.config)));
  };

  const updateConfig = (section: string, field: string, value: any) => {
    setEditConfig((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const summarizeConfig = (config: any) => {
    const parts: string[] = [];
    if (config.create_new_campaigns) parts.push(`${config.campaign_config?.quantity || 1} campanha(s) nova(s)`);
    if (config.selected_campaign_ids?.length) parts.push(`${config.selected_campaign_ids.length} campanha(s) existente(s)`);
    parts.push(`${config.default_adset_qty || 1} conjunto(s)/campanha`);
    const obj = CAMPAIGN_OBJECTIVES.find((o) => o.value === config.campaign_config?.objective);
    if (obj) parts.push(obj.label);
    return parts.join(" · ");
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-muted-foreground">Modelos pré-configurados para criação em massa</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!templates || templates.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Save className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-1">Nenhum template salvo</h3>
            <p className="text-sm text-muted-foreground">
              Templates são criados na tela de criação em massa, no passo de revisão.
            </p>
          </CardContent>
        </Card>
      )}

      {templates && templates.length > 0 && (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">{tpl.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {new Date(tpl.created_at).toLocaleDateString("pt-BR")}
                      </Badge>
                      {expandedId === tpl.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    {tpl.description && <p className="text-sm text-muted-foreground mb-1">{tpl.description}</p>}
                    <p className="text-xs text-muted-foreground">{summarizeConfig(tpl.config)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(tpl)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Excluir template?")) deleteMutation.mutate(tpl.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Expanded details */}
                {expandedId === tpl.id && (
                  <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                    <ConfigSection title="Contas" items={[
                      ["Contas selecionadas", (() => {
                        const ids = tpl.config.selected_account_ids || [];
                        if (ids.length === 0) return "—";
                        return ids.map((id: string) => {
                          const acc = adAccounts?.find((a: any) => String(a.id) === String(id));
                          return acc ? acc.account_name : id;
                        }).join(", ");
                      })()],
                    ]} />
                    <ConfigSection title="Estrutura" items={[
                      ["Campanhas", tpl.config.campaign_config?.quantity || 1],
                      ["Conjuntos / campanha", tpl.config.default_adset_qty || 1],
                      ["Anúncios / conjunto", tpl.config.default_ad_qty || 1],
                    ]} />
                    <ConfigSection title="Campanha" items={[
                      ["Nome", tpl.config.campaign_config?.name],
                      ["Objetivo", CAMPAIGN_OBJECTIVES.find((o) => o.value === tpl.config.campaign_config?.objective)?.label],
                      ["Orçamento", `R$ ${tpl.config.campaign_config?.daily_budget || "—"}`],
                      ["Bid Strategy", tpl.config.campaign_config?.bid_strategy === "COST_CAP" ? "Custo Alvo" : "Menor Custo"],
                      ["Criar novas", tpl.config.create_new_campaigns ? "Sim" : "Não"],
                    ]} />
                    <ConfigSection title="Conjunto" items={[
                      ["Nome", tpl.config.adset_config?.name],
                      ["Países", tpl.config.adset_config?.countries],
                      ["Idade", `${tpl.config.adset_config?.age_min || 18} – ${tpl.config.adset_config?.age_max || 65}`],
                      ["Gênero", tpl.config.adset_config?.genders === "1" ? "Masculino" : tpl.config.adset_config?.genders === "2" ? "Feminino" : "Todos"],
                      ["Otimização", tpl.config.adset_config?.optimization_goal],
                      ["Billing", tpl.config.adset_config?.billing_event || "IMPRESSIONS"],
                      ["Bid Strategy", tpl.config.adset_config?.bid_strategy === "COST_CAP" ? "Custo Alvo" : "Menor Custo"],
                    ]} />
                    <ConfigSection title="Anúncio" items={[
                      ["Título", tpl.config.ad_config?.headline || "—"],
                      ["CTA", CTA_OPTIONS.find((c) => c.value === tpl.config.ad_config?.call_to_action)?.label],
                      ["Site de Destino", (() => { const w = websites?.find((x: any) => String(x.id) === String(tpl.config.ad_config?.website_id)); return w ? `${w.name} (${w.url})` : "—"; })()],
                      ["UTMs", tpl.config.ad_config?.utm_params || "—"],
                      ["Página", (() => { const p = adPages?.find((x: any) => String(x.id) === String(tpl.config.ad_config?.ad_page_id)); return p ? `📘 ${p.name}` : "—"; })()],
                      ["Instagram", (() => { const i = instagramAccounts?.find((x: any) => String(x.id) === String(tpl.config.ad_config?.instagram_account_id)); return i ? `📸 ${i.name}` : "—"; })()],
                      ["Pixel", (() => { const px = pixels?.find((x: any) => String(x.id) === String(tpl.config.adset_config?.pixel_id)); return px ? `🎯 ${px.name}` : "—"; })()],
                      ["Multi-anunciante", tpl.config.ad_config?.enable_multi_advertiser ? "Sim" : "Não"],
                      ["Replicar em todos criativos", (tpl.config.use_same_pages ?? true) ? "Sim" : "Não"],
                    ]} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog — full config */}
      <Dialog open={!!editTemplate} onOpenChange={(o) => { if (!o) setEditTemplate(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Template</DialogTitle></DialogHeader>
          <div className="space-y-6 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome *</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div><Label>Descrição</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
            </div>

            {/* Structure */}
            <fieldset className="border rounded-lg p-4 space-y-3">
              <legend className="text-sm font-semibold px-2">Estrutura</legend>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Campanhas</Label><Input type="number" min={1} className="h-8 text-sm" value={editConfig.campaign_config?.quantity || 1} onChange={(e) => updateConfig("campaign_config", "quantity", Math.max(1, parseInt(e.target.value) || 1))} /></div>
                <div><Label className="text-xs">Conjuntos / campanha</Label><Input type="number" min={1} className="h-8 text-sm" value={editConfig.default_adset_qty || 1} onChange={(e) => setEditConfig((p: any) => ({ ...p, default_adset_qty: Math.max(1, parseInt(e.target.value) || 1) }))} /></div>
                <div><Label className="text-xs">Anúncios / conjunto</Label><Input type="number" min={1} className="h-8 text-sm" value={editConfig.default_ad_qty || 1} onChange={(e) => setEditConfig((p: any) => ({ ...p, default_ad_qty: Math.max(1, parseInt(e.target.value) || 1) }))} /></div>
              </div>
            </fieldset>

            {/* Campaign config */}
            <fieldset className="border rounded-lg p-4 space-y-3">
              <legend className="text-sm font-semibold px-2">Campanha</legend>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nome Base</Label><Input className="h-8 text-sm" value={editConfig.campaign_config?.name || ""} onChange={(e) => updateConfig("campaign_config", "name", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Objetivo</Label>
                  <Select value={editConfig.campaign_config?.objective || ""} onValueChange={(v) => updateConfig("campaign_config", "objective", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{CAMPAIGN_OBJECTIVES.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Orçamento (R$)</Label><Input type="number" min={5} className="h-8 text-sm" value={editConfig.campaign_config?.daily_budget || ""} onChange={(e) => updateConfig("campaign_config", "daily_budget", e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Bid Strategy</Label>
                  <Select value={editConfig.campaign_config?.bid_strategy || ""} onValueChange={(v) => updateConfig("campaign_config", "bid_strategy", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="LOWEST_COST_WITHOUT_CAP">Menor Custo</SelectItem><SelectItem value="COST_CAP">Custo Alvo</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editConfig.create_new_campaigns ?? false} onCheckedChange={(v) => setEditConfig((p: any) => ({ ...p, create_new_campaigns: v }))} />
                <Label className="text-xs">Criar novas campanhas por padrão</Label>
              </div>
            </fieldset>

            {/* Ad set config */}
            <fieldset className="border rounded-lg p-4 space-y-3">
              <legend className="text-sm font-semibold px-2">Conjunto de Anúncios</legend>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nome Base</Label><Input className="h-8 text-sm" value={editConfig.adset_config?.name || ""} onChange={(e) => updateConfig("adset_config", "name", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Países</Label><Input className="h-8 text-sm" value={editConfig.adset_config?.countries || ""} onChange={(e) => updateConfig("adset_config", "countries", e.target.value)} /></div>
                <div><Label className="text-xs">Idade Mín</Label><Input type="number" className="h-8 text-sm" value={editConfig.adset_config?.age_min || "18"} onChange={(e) => updateConfig("adset_config", "age_min", e.target.value)} /></div>
                <div><Label className="text-xs">Idade Máx</Label><Input type="number" className="h-8 text-sm" value={editConfig.adset_config?.age_max || "65"} onChange={(e) => updateConfig("adset_config", "age_max", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Gênero</Label>
                  <Select value={editConfig.adset_config?.genders || "0"} onValueChange={(v) => updateConfig("adset_config", "genders", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="0">Todos</SelectItem><SelectItem value="1">Masculino</SelectItem><SelectItem value="2">Feminino</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Otimização</Label>
                  <Select value={editConfig.adset_config?.optimization_goal || ""} onValueChange={(v) => updateConfig("adset_config", "optimization_goal", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="OFFSITE_CONVERSIONS">Conversões</SelectItem><SelectItem value="LINK_CLICKS">Cliques</SelectItem><SelectItem value="LANDING_PAGE_VIEWS">Views da Página</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Billing Event</Label>
                  <Select value={editConfig.adset_config?.billing_event || "IMPRESSIONS"} onValueChange={(v) => updateConfig("adset_config", "billing_event", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="IMPRESSIONS">Impressões</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Bid Strategy</Label>
                  <Select value={editConfig.adset_config?.bid_strategy || ""} onValueChange={(v) => updateConfig("adset_config", "bid_strategy", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="LOWEST_COST_WITHOUT_CAP">Menor Custo</SelectItem><SelectItem value="COST_CAP">Custo Alvo</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            {/* Ad config */}
            <fieldset className="border rounded-lg p-4 space-y-3">
              <legend className="text-sm font-semibold px-2">Anúncio</legend>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Página</Label>
                  <Select value={editConfig.ad_config?.ad_page_id || ""} onValueChange={(v) => updateConfig("ad_config", "ad_page_id", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{adPages?.map((p: any) => (<SelectItem key={p.id} value={p.id}>📘 {p.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Instagram</Label>
                  <Select value={editConfig.ad_config?.instagram_account_id || ""} onValueChange={(v) => updateConfig("ad_config", "instagram_account_id", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>{instagramAccounts?.map((i: any) => (<SelectItem key={i.id} value={i.id}>📸 {i.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Pixel</Label>
                  <Select value={editConfig.adset_config?.pixel_id || ""} onValueChange={(v) => updateConfig("adset_config", "pixel_id", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>{pixels?.map((p: any) => (<SelectItem key={p.id} value={p.id}>🎯 {p.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Título</Label><Input className="h-8 text-sm" value={editConfig.ad_config?.headline || ""} onChange={(e) => updateConfig("ad_config", "headline", e.target.value)} /></div>
                <div>
                  <Label className="text-xs">CTA</Label>
                  <Select value={editConfig.ad_config?.call_to_action || ""} onValueChange={(v) => updateConfig("ad_config", "call_to_action", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{CTA_OPTIONS.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Site de Destino</Label>
                  <Select value={editConfig.ad_config?.website_id || ""} onValueChange={(v) => updateConfig("ad_config", "website_id", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{websites?.map((w: any) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">UTMs</Label><Input className="h-8 text-sm" value={editConfig.ad_config?.utm_params || ""} onChange={(e) => updateConfig("ad_config", "utm_params", e.target.value)} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editConfig.ad_config?.enable_multi_advertiser ?? false} onCheckedChange={(v) => updateConfig("ad_config", "enable_multi_advertiser", v)} />
                <Label className="text-xs">Multi-anunciante</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editConfig.use_same_pages ?? true} onCheckedChange={(v) => setEditConfig((p: any) => ({ ...p, use_same_pages: v }))} />
                <Label className="text-xs">Replicar página/IG/pixel em todos os criativos</Label>
              </div>
            </fieldset>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancelar</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!editName || updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfigSection({ title, items }: { title: string; items: [string, any][] }) {
  return (
    <div>
      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
