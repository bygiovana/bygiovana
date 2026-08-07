import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.VERCEL_ACCESS_TOKEN?.trim();
const teamId = process.env.VERCEL_TEAM_ID?.trim();

if (!token) {
  console.log(
    "VERCEL_ACCESS_TOKEN não configurado. O mirror foi ignorado sem causar falha."
  );
  process.exit(0);
}

const root = process.cwd();
const readmePath = path.join(root, "README.md");
const dataPath = path.join(root, "data", "vercel-deployments.json");
const endpoint = new URL("https://api.vercel.com/v6/deployments");

endpoint.searchParams.set("limit", "50");

if (teamId) {
  endpoint.searchParams.set("teamId", teamId);
}

const response = await fetch(endpoint, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(
    `Vercel API respondeu ${response.status}: ${body.slice(0, 500)}`
  );
}

const payload = await response.json();
const source = Array.isArray(payload.deployments) ? payload.deployments : [];

const deployments = source
  .map(normalizeDeployment)
  .filter((deployment) => deployment.id && deployment.url)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, 30);

await writeFile(dataPath, `${JSON.stringify(deployments, null, 2)}\n`, "utf8");

const readme = await readFile(readmePath, "utf8");
const startMarker = "<!-- VERCEL_DEPLOYMENTS:START -->";
const endMarker = "<!-- VERCEL_DEPLOYMENTS:END -->";
const startIndex = readme.indexOf(startMarker);
const endIndex = readme.indexOf(endMarker);

if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
  throw new Error("Marcadores de deployments não encontrados no README.md.");
}

const table = renderTable(deployments.slice(0, 8));
const updatedReadme = [
  readme.slice(0, startIndex + startMarker.length),
  "\n",
  table,
  "\n",
  readme.slice(endIndex),
].join("");

await writeFile(readmePath, updatedReadme, "utf8");
console.log(`${deployments.length} deployments sincronizados.`);

function normalizeDeployment(deployment) {
  const createdValue =
    deployment.createdAt ?? deployment.created ?? deployment.created_at ?? 0;
  const createdDate = new Date(Number(createdValue) || createdValue);
  const createdAt = Number.isNaN(createdDate.getTime())
    ? "1970-01-01T00:00:00.000Z"
    : createdDate.toISOString();
  const rawUrl = String(deployment.url ?? "").trim();

  return {
    id: String(deployment.uid ?? deployment.id ?? ""),
    project: String(deployment.name ?? deployment.project?.name ?? "Projeto"),
    url: rawUrl.startsWith("http") ? rawUrl : rawUrl ? `https://${rawUrl}` : "",
    state: String(deployment.state ?? deployment.readyState ?? "UNKNOWN").toUpperCase(),
    target: String(deployment.target ?? "preview"),
    createdAt,
    commitSha: String(
      deployment.meta?.githubCommitSha ??
        deployment.meta?.gitCommitSha ??
        deployment.meta?.gitlabCommitSha ??
        ""
    ),
    commitMessage: String(
      deployment.meta?.githubCommitMessage ??
        deployment.meta?.gitCommitMessage ??
        deployment.meta?.gitlabCommitMessage ??
        ""
    ),
  };
}

function renderTable(items) {
  if (items.length === 0) {
    return "_Nenhum deployment encontrado para este escopo da Vercel._";
  }

  const header = [
    "| Status | Projeto | Ambiente | Deployment | Data |",
    "| :---: | --- | --- | --- | --- |",
  ];

  const rows = items.map((deployment) => {
    const icon = statusIcon(deployment.state);
    const project = escapeMarkdown(deployment.project);
    const target = escapeMarkdown(deployment.target);
    const reference = deployment.commitSha
      ? `\`${deployment.commitSha.slice(0, 7)}\``
      : "abrir";
    const date = formatUtc(deployment.createdAt);

    return `| ${icon} ${deployment.state} | ${project} | ${target} | [${reference}](${deployment.url}) | ${date} |`;
  });

  return [...header, ...rows].join("\n");
}

function statusIcon(state) {
  const icons = {
    READY: "🟢",
    ERROR: "🔴",
    CANCELED: "⚪",
    CANCELLED: "⚪",
    BUILDING: "🟡",
    QUEUED: "🟠",
    INITIALIZING: "🟠",
  };

  return icons[state] ?? "🔵";
}

function formatUtc(value) {
  const date = new Date(value);
  return `${date.toISOString().slice(0, 10)} ${date
    .toISOString()
    .slice(11, 16)} UTC`;
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ").trim();
}
