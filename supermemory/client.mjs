import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import Supermemory from "supermemory";

const client = new Supermemory();

export const PROJECT_TAG_OVERRIDE = process.env.SUPERMEMORY_PROJECT_TAG;

function sha256(input) {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function normalizeGitRemote(remoteUrl) {
  const raw = remoteUrl.trim();
  if (!raw) return null;

  let normalized;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      normalized =
        parsed.protocol === "file:"
          ? `file:${decodeURIComponent(parsed.pathname)}`
          : `${parsed.hostname.toLowerCase()}${parsed.port ? `:${parsed.port}` : ""}/${parsed.pathname.replace(/^\/+/, "")}`;
    } catch {
      normalized = raw;
    }
  } else {
    const scpStyle = raw.match(/^(?:[^@/]+@)?([^:]+):(.+)$/);
    normalized =
      scpStyle?.[1] && scpStyle[2]
        ? `${scpStyle[1].toLowerCase()}/${scpStyle[2]}`
        : `file:${resolve(raw)}`;
  }

  return normalized
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .replace(/\/{2,}/g, "/")
    .toLowerCase();
}

function sanitizeRepoName(name) {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return sanitized.slice(0, 95).replace(/_+$/g, "") || "unknown";
}

export function getProjectTag(directory = process.cwd()) {
  if (PROJECT_TAG_OVERRIDE) return PROJECT_TAG_OVERRIDE;
  try {
    const remoteUrl = execSync("git remote get-url origin", {
      cwd: directory,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const normalizedRemote = normalizeGitRemote(remoteUrl);
    const displayRemote = remoteUrl.replace(/\/+$/, "").replace(/\.git$/i, "");
    const separator = Math.max(
      displayRemote.lastIndexOf("/"),
      displayRemote.lastIndexOf(":"),
    );
    const repoName = displayRemote.slice(separator + 1) || "unknown";
    const shortName = sanitizeRepoName(repoName).slice(0, 72).replace(/_+$/g, "");
    return `repo_${shortName || "unknown"}__${sha256(normalizedRemote)}`;
  } catch {
    return "repo_unknown";
  }
}

export function getProjectName(directory = process.cwd()) {
  try {
    const remoteUrl = execSync("git remote get-url origin", {
      cwd: directory,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const displayRemote = remoteUrl.replace(/\/+$/, "").replace(/\.git$/i, "");
    const separator = Math.max(
      displayRemote.lastIndexOf("/"),
      displayRemote.lastIndexOf(":"),
    );
    return displayRemote.slice(separator + 1) || "unknown";
  } catch {
    return "unknown";
  }
}

export async function remember(content, options = {}) {
  const {
    type = "learned-pattern",
    scope = "project",
    metadata = {},
    containerTag = getProjectTag(),
  } = options;

  const response = await client.documents.add({
    content,
    containerTag,
    metadata: { ...metadata, sm_scope: scope, type },
  });

  return response;
}

export async function recall(query, options = {}) {
  const {
    limit = 5,
    containerTag = getProjectTag(),
    rerank = true,
    searchMode = "hybrid",
    threshold = 0.5,
  } = options;

  const response = await client.search({
    q: query,
    containerTag,
    searchMode,
    limit,
    rerank,
    threshold,
  });

  return response;
}

export { client };