import fs from "fs";

const html = fs.readFileSync("design/Chat UI.html", "utf8");
const start = html.indexOf('<script type="__bundler/template">');
const end = html.indexOf("</script>", start);
const block = html.slice(start, end);
const jsonStart = block.indexOf("\n") + 1;
const jsonRaw = block.slice(jsonStart).trim();
const template = JSON.parse(jsonRaw);

fs.writeFileSync("design/chat-ui-template.html", template);

const colors = [...new Set(template.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [])].sort();
const hexNamed = [...new Set(template.match(/#[Ff][0-9A-Fa-f]{5}/g) ?? [])];

console.log("Template length:", template.length);
console.log("Colors sample:", colors.slice(0, 40).join(", "));

const keywords = ["message", "bubble", "compose", "header", "Chat", "send", "input"];
for (const kw of keywords) {
  const idx = template.toLowerCase().indexOf(kw.toLowerCase());
  if (idx >= 0) {
    console.log("\n---", kw, "---");
    console.log(template.slice(Math.max(0, idx - 200), idx + 400));
  }
}