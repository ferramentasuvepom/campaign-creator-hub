# Guia de Deploy — Campaign Creator Hub

## Repositórios

| Nome | URL |
|------|-----|
| Original | `github.com/anabeatrizpelajo/campaign-creator-hub` |
| Fork | `github.com/ferramentasuvepom/campaign-creator-hub` |

---

## Parte 1: Merge da Branch (GitHub)

1. Acesse o fork: `github.com/ferramentasuvepom/campaign-creator-hub`
2. Vá em **Pull Requests** → **New Pull Request**
3. Configure: `feature-index` (fork) → `main` (fork)
4. Clique em **Create Pull Request**
5. Revise e clique em **Merge Pull Request** → **Confirm Merge**

> Agora a branch `main` do fork tem o código atualizado.

---

## Parte 2: Deploy no Servidor (Termius/SSH)

### 2.1 — Conectar no servidor
```bash
ssh usuario@ip-do-servidor
```

### 2.2 — Remover a stack antiga (se existir)
```bash
docker stack rm ads-uvepom
```
> Este comando remove **apenas** a stack `ads-uvepom`. Nenhuma outra stack é afetada.

### 2.3 — Clonar o repositório (1ª vez) ou atualizar

**Se é a primeira vez:**
```bash
cd /opt
git clone https://github.com/ferramentasuvepom/campaign-creator-hub.git
cd campaign-creator-hub
```

**Se já existe:**
```bash
cd /opt/campaign-creator-hub
git pull origin main
```

### 2.4 — Criar o arquivo `.env`
```bash
nano .env
```

Conteúdo (troque pelos valores corretos deste servidor):
```env
VITE_SUPABASE_PROJECT_ID="SEU_PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_KEY"
VITE_SUPABASE_URL="https://SEU_PROJETO.supabase.co"

VITE_N8N_WEBHOOK_CREATE="https://SEU-WEBHOOK/webhook/create-campaign"
VITE_N8N_WEBHOOK_EDIT="https://SEU-WEBHOOK/webhook/edit-campaign"
VITE_N8N_WEBHOOK_DELETE="https://SEU-WEBHOOK/webhook/delete-campaign"
VITE_N8N_WEBHOOK_CREATE_AD="https://SEU-WEBHOOK/webhook/create-ad"
VITE_N8N_WEBHOOK_CREATE_ADSET="https://SEU-WEBHOOK/webhook/create-adset"
VITE_N8N_WEBHOOK_BULK="https://SEU-WEBHOOK/webhook/create-bulk"
VITE_N8N_WEBHOOK_LIST_DRIVE="https://SEU-WEBHOOK/webhook/list-drive-files"
```

> Salvar: `Ctrl+O` → `Enter` → `Ctrl+X`

### 2.5 — Buildar a imagem Docker

Como o servidor usa **Docker Swarm**, a imagem precisa ser construída antes do deploy.

```bash
cd /opt/campaign-creator-hub

docker build \
  --build-arg VITE_SUPABASE_PROJECT_ID="$(grep VITE_SUPABASE_PROJECT_ID .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_SUPABASE_URL="$(grep VITE_SUPABASE_URL .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_CREATE="$(grep VITE_N8N_WEBHOOK_CREATE .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_EDIT="$(grep VITE_N8N_WEBHOOK_EDIT .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_DELETE="$(grep VITE_N8N_WEBHOOK_DELETE .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_BULK="$(grep VITE_N8N_WEBHOOK_BULK .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_LIST_DRIVE="$(grep VITE_N8N_WEBHOOK_LIST_DRIVE .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_CREATE_AD="$(grep VITE_N8N_WEBHOOK_CREATE_AD .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_CREATE_ADSET="$(grep VITE_N8N_WEBHOOK_CREATE_ADSET .env | cut -d= -f2 | tr -d '"')" \
  -t campaign-creator-hub:latest .
```

> Este comando lê o `.env` e injeta as variáveis no build. O resultado é uma imagem local chamada `campaign-creator-hub:latest`.

### 2.6 — Ajustar o `docker-compose.yml`
```bash
nano docker-compose.yml
```

Substituir o conteúdo por:
```yaml
version: "3.8"

services:
  campaign-creator-hub:
    image: campaign-creator-hub:latest
    deploy:
      restart_policy:
        condition: any
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.admanager.rule=Host(`SEU-DOMINIO-AQUI`)"
        - "traefik.http.routers.admanager.entrypoints=websecure"
        - "traefik.http.routers.admanager.tls.certresolver=letsencrypt"
        - "traefik.http.services.admanager.loadbalancer.server.port=80"
    networks:
      - uvepom_net

networks:
  uvepom_net:
    external: true
```

> **Troque** `SEU-DOMINIO-AQUI` pelo domínio real (sem https, sem aspas, entre crases).

> **Nota:** No Swarm, as labels ficam dentro de `deploy:` (não no nível do container).

### 2.7 — Subir a stack
```bash
docker stack deploy -c docker-compose.yml ads-uvepom
```

> Este comando cria **apenas** a stack `ads-uvepom`. Nenhuma outra stack é afetada.

### 2.8 — Verificar
```bash
# Ver se o serviço está rodando
docker service ls | grep ads

# Ver logs do serviço
docker service logs ads-uvepom_campaign-creator-hub -f
```

> `Ctrl+C` para sair dos logs.

---

## Parte 3: Atualizações Futuras (novas features)

### No seu PC (VS Code):

```bash
# 1. Voltar para a main e atualizar
git checkout main
git pull origin main

# 2. Criar nova branch
git checkout -b feature-nome-da-feature

# 3. Fazer as alterações no código...

# 4. Commitar
git add .
git commit -m "feat: descrição da alteração"

# 5. Enviar para o fork
git push fork feature-nome-da-feature
```

### No GitHub:
1. Abrir **Pull Request** no fork (`feature-xxx` → `main`)
2. Revisar e dar **Merge**

### No servidor (SSH/Termius):
```bash
cd /opt/campaign-creator-hub

# 1. Puxar código atualizado
git pull origin main

# 2. Rebuildar a imagem (mesmo comando do passo 2.5)
docker build \
  --build-arg VITE_SUPABASE_PROJECT_ID="$(grep VITE_SUPABASE_PROJECT_ID .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_SUPABASE_URL="$(grep VITE_SUPABASE_URL .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_CREATE="$(grep VITE_N8N_WEBHOOK_CREATE .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_EDIT="$(grep VITE_N8N_WEBHOOK_EDIT .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_DELETE="$(grep VITE_N8N_WEBHOOK_DELETE .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_BULK="$(grep VITE_N8N_WEBHOOK_BULK .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_LIST_DRIVE="$(grep VITE_N8N_WEBHOOK_LIST_DRIVE .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_CREATE_AD="$(grep VITE_N8N_WEBHOOK_CREATE_AD .env | cut -d= -f2 | tr -d '"')" \
  --build-arg VITE_N8N_WEBHOOK_CREATE_ADSET="$(grep VITE_N8N_WEBHOOK_CREATE_ADSET .env | cut -d= -f2 | tr -d '"')" \
  -t campaign-creator-hub:latest .

# 3. Atualizar a stack (Swarm vai detectar a imagem nova)
docker service update --force ads-uvepom_campaign-creator-hub
```

> O `.env` já está no servidor e não é alterado.

---

## Segurança: O que NÃO é afetado

| ✅ Afetado | ❌ Não afetado |
|---|---|
| Stack `ads-uvepom` | Outras stacks (n8n, etc.) |
| Imagem `campaign-creator-hub:latest` | Outros containers |
| Código JS/HTML/CSS | Banco de dados (Supabase) |
| | `.env` do servidor |
| | Rede `uvepom_net` (apenas usa) |
| | Volumes de outros serviços |
