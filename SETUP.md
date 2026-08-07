# Configuração do perfil `giovanax/giovanax`

## 1. Criar o repositório de perfil

Crie um repositório **público** chamado exatamente `giovanax` na conta `giovanax`.

O endereço final deve ser:

```text
https://github.com/giovanax/giovanax
```

Envie todo o conteúdo desta pasta para a raiz do novo repositório.

## 2. Criar um token de leitura na Vercel

Na Vercel, abra **Account Settings → Tokens**, crie um token com o menor escopo necessário e defina uma expiração.

No repositório `giovanax/giovanax`, abra:

```text
Settings → Secrets and variables → Actions → New repository secret
```

Cadastre:

```text
VERCEL_ACCESS_TOKEN = token criado na Vercel
```

Se os projetos estiverem em um time, cadastre também:

```text
VERCEL_TEAM_ID = team_...
```

O Team ID aparece em **Vercel → Team Settings → General**.

## 3. Executar a primeira atualização

No GitHub, abra:

```text
Actions → Atualizar perfil e espelhar deployments → Run workflow
```

Depois disso, o workflow roda duas vezes por hora. Ele consulta os deployments da Vercel, atualiza o `README.md` e cria commit somente quando houver mudança real.

## Autoria dos commits

Os commits automáticos usam:

- autor: `giovanax`;
- committer: `github-actions[bot]`.

Isso deixa claro que a automação realizou o commit, enquanto a atividade continua vinculada ao perfil correto.
