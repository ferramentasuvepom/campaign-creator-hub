# Plano de Refatoração: Fluxo de Criação em Massa

Este documento detalha as alterações necessárias no arquivo `src/pages/BulkCreationPage.tsx` para adequar o fluxo de criação em massa à nova ordem solicitada pelo usuário, estruturando de forma clara a hierarquia Meta (Campanhas → Conjuntos → Anúncios).

## 1. Atualização dos Steps e Estado

**Array de Passos:**
Alterar a constante `STEPS` para refletir as novas 5 etapas + envio:
```typescript
const STEPS = ["Criativos", "Campanhas", "Conjuntos", "Anúncios", "Revisão", "Enviado"];
```

**Novo Estado de Estrutura:**
Em vez de ter a quantidade de conjuntos configurada individualmente por arquivo dinamicamente (`adSetQty` dentro de `SelectedFile`), criar uma variável de estado global para a estrutura na configuração da campanha:
```typescript
const [structureConfig, setStructureConfig] = useState({
    adSetsPerCreative: 3, // Exemplo: 3 conjuntos para cada criativo na mesma campanha
});
```
*(Nota: Certifique-se de atualizar os cálculos de `totalSets` e o `buildPreview` para usar esse novo estado em vez da soma de `file.adSetQty`.)*

---

## 2. Alterações na Tela Inicial: Criativos (Step 0)

Esta tela deve ser limpa para lidar apenas com os arquivos brutos.

- **Manter:**
  - Card "Criativos do Google Drive" (Input de link + botão carregar).
  - Listagem de arquivos carregados e seleção.
  - Input "Nome do Anúncio" em cada arquivo selecionado.

- **Remover/Mover:**
  - Remover o campo numérico "Conjuntos por campanha" da seleção individual de arquivo.
  - Mover o Card "Contas de Anúncio" (seleção de contas) para a Tela de Campanhas.
  - Mover o Card "Configurações do Anúncio" (Título, CTA, URL, etc.) para a nova Tela de Anúncios.
  - Mover o Card "Aplicar Template" preferencialmente para o topo da Tela de Campanhas ou manter fixo fora dos steps.

---

## 3. Tela 2: Campanhas (Step 1)

Essa tela reunirá as contas de anúncio, estruturas e definições de nível de campanha.

- **Adicionar:**
  - Card "Contas de Anúncio" (movido da step 0).
  - Card "Campanhas Existentes" (recuperar de `renderStep1`).
  - Card "Criar Novas Campanhas" (recuperar de `renderStep1`).

- **Nova Configuração de Estrutura:**
  - Adicionar um novo bloco/card chamado **"Estrutura da Campanha"**.
  - Incluir um input/controlador descrevendo a estrutura: "Conjuntos para cada Criativo" (onde o usuário pode definir ex: 3, formando a matriz 1x3x1 para cada criativo, onde 1 campanha roda 3 conjuntos idênticos para 1 criativo).
  - Um aviso ou prévia textual explicando como ficará (ex: "Para cada campanha, criaremos X conjuntos para cada criativo selecionado...").

---

## 4. Tela 3: Conjuntos (Step 2)

Esta continuará praticamente a mesma da versão atual na configuração do conjunto.

- **Manter:**
  - Card "Configuração do Conjunto de Anúncios" (movido do atual `renderStep2` da etapa 1 desorganizada).
  - Campos: Nome Base do conjunto, Países, Idades, Gêneros, Billing Event, Optimization Goal, Bid Strategy.

---

## 5. Tela 4: Anúncios (Step 3)

Esta é a nova tela focada inteiramente nas definições dos criativos formatados para irem ao ar.

- **Mover da Step 0 atual para cá:**
  - Card "Configurações do Anúncio".
  - Inputs: Título, Call to Action, Site de Destino, UTMs, Anunciante Multi-advertiser.
  - Card interno: "Página, Instagram e Pixel". A lógica de poder escolher a mesma página para todos ou desmembrar por criativo continuará funcional aqui.

---

## 6. Tela 5: Revisão Final (Step 4) e Live Preview

A "Revisão" e a barra lateral ("Live Preview") continuam existindo mas precisam de ajustes nos cálculos.

- **Atualização nos Cálculos Totais:**
  - `setsPerCampaign`: No modelo antigo era `selectedFiles.reduce((s, f) => s + f.adSetQty, 0)`. No modelo novo (ex 1x3x1), o valor baseia-se na multiplicação: `selectedFiles.length * structureConfig.adSetsPerCreative`.
  - Atualizar as variáveis `totalSets` e `totalAds` com base na nova matemática.

- **Live Preview (`buildPreview`):**
  - O looping `makeAdSets` hoje verifica o `file.adSetQty`. Modificar para iterar sobre `structureConfig.adSetsPerCreative`.
  - O preview continuará renderizando automaticamente à medida que as telas forem avançadas ou configuradas.

- **Webhook Submission (`submitMutation`):**
  - Alterar o `fi < selectedFiles.length` iterando junto com `si < structureConfig.adSetsPerCreative` no momento de injetar no Supabase e de montar o payload pro n8n, garantindo a criação limpa.

- **Atualizar o Switch de Renderização (`renderCurrentStep`):**
```typescript
const renderCurrentStep = () => {
    switch (step) {
        case 0: return renderStepCreatives();
        case 1: return renderStepCampaigns();
        case 2: return renderStepAdSets();
        case 3: return renderStepAds();
        case 4: return renderStepReview();
        case 5: return renderStepSent();
        default: return null;
    }
};
```

## Resumo da Ação
Basta reordenar os componentes JSX já existentes para as suas respectivas funções `renderStepX()`, extrair a variável global `adSetQty` de dentro de File para um Estado Global de Estrutura em Campanhas, e arrumar os cálculos e validações (`canGoNext`) de acordo com as novas 6 etapas (`step` varia de 0 a 5).
