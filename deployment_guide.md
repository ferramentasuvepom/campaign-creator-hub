# Guia de Deploy: Campaign Creator Hub (Docker + Portainer)

Este documento detalha o passo a passo para configurar e fazer o deploy da aplicação em um novo servidor utilizando Docker, Portainer e Traefik como proxy reverso.

## 1. Pré-requisitos do Servidor

Antes de subir a aplicação, o novo servidor precisa ter:
- Docker e Docker Compose instalados.
- Portainer rodando.
- **Traefik** configurado como proxy reverso (para o gerenciamento de certificados SSL e roteamento de domínios).
- Uma rede Docker (network) criada para a comunicação entre o Traefik e os containers.

### Para conectar a uma rede já existente
Se o seu novo servidor já possui o Traefik rodando ou outra rede configurada que os containers devam usar (ex: `proxy_network`):
1. Verifique o nome exato da rede rodando no servidor:
   ```bash
   docker network ls
   ```
2. Você precisará alterar o nome dessa rede no arquivo [docker-compose.yml](file:///c:/Users/Ana%20Beatriz/campaign-creator-hub/docker-compose.yml) (na etapa B) para o nome da rede existente. No restante do guia, usaremos `traefik` como exemplo.

## 2. Variáveis de Ambiente Necessárias

A aplicação é construída em React (Vite) de forma estática, o que significa que **todas as variáveis de ambiente devem ser passadas no momento do BUILD da imagem**, e não no momento de rodar (run) o container.

Você precisará dos seguintes valores:

**Supabase:**
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

**Webhooks do n8n:**
- `VITE_N8N_WEBHOOK_CREATE`
- `VITE_N8N_WEBHOOK_EDIT`
- `VITE_N8N_WEBHOOK_DELETE`
- `VITE_N8N_WEBHOOK_BULK`
- `VITE_N8N_WEBHOOK_LIST_DRIVE`
- `VITE_N8N_WEBHOOK_CREATE_AD`
- `VITE_N8N_WEBHOOK_CREATE_ADSET`

## 3. Passo a Passo do Deploy

### Etapa A: Build e Push da Imagem Docker
Na sua máquina local (onde o código fonte com o [Dockerfile](file:///c:/Users/Ana%20Beatriz/campaign-creator-hub/Dockerfile) está), execute o comando de build substituindo os valores fictícios pelas chaves reais do novo ambiente e apontando para o seu repositório de container (ex: GitHub Container Registry, Docker Hub).

```powershell
docker build -t seu_usuario/campaign-creator-hub:latest `
  --build-arg VITE_SUPABASE_PROJECT_ID="seu_project_id" `
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="sua_anon_key" `
  --build-arg VITE_SUPABASE_URL="https://seu_project_id.supabase.co" `
  --build-arg VITE_N8N_WEBHOOK_CREATE="https://seu-dominio.com/webhook/create" `
  --build-arg VITE_N8N_WEBHOOK_EDIT="https://seu-dominio.com/webhook/edit" `
  --build-arg VITE_N8N_WEBHOOK_DELETE="https://seu-dominio.com/webhook/delete" `
  --build-arg VITE_N8N_WEBHOOK_BULK="https://seu-dominio.com/webhook/create-bulk" `
  --build-arg VITE_N8N_WEBHOOK_LIST_DRIVE="https://seu-dominio.com/webhook/list-drive-files" `
  --build-arg VITE_N8N_WEBHOOK_CREATE_AD="https://seu-dominio.com/webhook/create-ad" `
  --build-arg VITE_N8N_WEBHOOK_CREATE_ADSET="https://seu-dominio.com/webhook/create-adset" `
  .
```

Após finalizar o build, envie a imagem para o seu registry:
```powershell
docker push seu_usuario/campaign-creator-hub:latest
```

### Etapa B: Criação da Stack no Portainer

1. Acesse o **Portainer** do novo servidor.
2. Acesse o menu **Stacks** e clique em **Add stack**.
3. Dê um nome para a stack (ex: `campaign-creator`).
4. Selecione a opção **Web editor**.
5. Cole o seguinte código no editor [docker-compose.yml](file:///c:/Users/Ana%20Beatriz/campaign-creator-hub/docker-compose.yml):

> **Importante:** Altere a imagem (`image`) para a URL do seu registry e configure o domínio em `Host(...)`.

```yaml
version: "3.8"

services:
  campaign-creator-hub:
    image: seu_usuario/campaign-creator-hub:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      # Ajuste o domínio abaixo para o seu novo domínio
      - "traefik.http.routers.admanager.rule=Host(`seu.novo.dominio.com`)"
      - "traefik.http.routers.admanager.entrypoints=websecure"
      - "traefik.http.routers.admanager.tls.certresolver=letsencrypt"
      - "traefik.http.services.admanager.loadbalancer.server.port=80"
    networks:
      - minha_rede_existente # <-- Substitua pelo nome da sua rede existente

networks:
  minha_rede_existente: # <-- Substitua pelo nome da sua rede existente
    external: true
```

6. Se a sua imagem estiver em um repositório privado (ex: Github Container Registry), lembre-se de configurar e selecionar a verificação de **Registry** na aba da stack ou no menu Settings > Registries do Portainer.
7. Clique em **Deploy the stack**.

## 4. Como Atualizar Versões Futuras

Sempre que alterar o código, repita o processo para enviar a nova versão para o ar:

1. Gere um novo build na sua máquina rodando o comando longo `docker build ...` (Etapa A).
2. Suba a imagem nova com `docker push ...`.
3. Vá no Portainer, entre na Stack, ative o switch **Re-pull image and redeploy** e clique em **Update the stack**.
