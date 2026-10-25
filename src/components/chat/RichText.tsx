import { Fragment } from "react";

// Renderizador mínimo y seguro (sin HTML crudo): párrafos, viñetas, títulos ###, **negritas** y _cursivas_.
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : p.length > 2 && p.startsWith("_") && p.endsWith("_") ? (
      <em key={i}>{p.slice(1, -1)}</em>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    )
  );
}

export default function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`ul-${blocks.length}`}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (/^\s*[-*•]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*•]\s+/, ""));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      list.push(line.trim());
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) blocks.push(<h4 key={blocks.length}>{inline(heading[1])}</h4>);
    else blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <>{blocks}</>;
}
