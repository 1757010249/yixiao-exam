import { remember, recall, getProjectTag, getProjectName, client } from "./client.mjs";

async function main() {
  const tag = getProjectTag();
  const name = getProjectName();
  console.log(`project: ${name}`);
  console.log(`containerTag: ${tag}`);
  console.log(`apiKey: ${client.apiKey ? "set (" + client.apiKey.slice(0, 6) + "...)" : "NOT SET"}`);

  const demo = process.argv[2] ?? "remember";
  if (demo === "remember") {
    const content = process.argv[3] ?? "示例记忆：本项目为一级消防工程师备考知识库，使用 opencode 维护。";
    const res = await remember(content, {
      type: "project-config",
      scope: "project",
      metadata: { module: "general" },
    });
    console.log("saved document:", JSON.stringify(res));
  } else if (demo === "search") {
    const q = process.argv[3] ?? "消防工程师";
    const res = await recall(q, { limit: 5 });
    console.log(`total: ${res.total}`);
    for (const r of res.results ?? []) {
      console.log("-", (r.memory ?? r.chunk ?? "").slice(0, 160), "| sim:", r.similarity);
    }
  } else {
    console.error('usage: node supermemory/example.mjs remember "content" | node supermemory/example.mjs search "query"');
  }
}

main().catch((err) => {
  console.error("error:", err?.message ?? err);
  process.exit(1);
});