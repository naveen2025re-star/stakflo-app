import { useMemo } from 'react';
import { marked } from 'marked';
import * as awsui from '@cloudscape-design/design-tokens';

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface MarkdownContentProps {
  content: string;
  maxHeight?: string;
}

const styles = `
.stakflo-md { font-family: inherit; line-height: 1.7; color: inherit; }

.stakflo-md h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 1.2em 0 0.5em;
  padding-bottom: 0.3em;
  border-bottom: 2px solid ${awsui.colorBorderDividerDefault};
  color: ${awsui.colorTextHeadingDefault};
}
.stakflo-md h2 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 1em 0 0.4em;
  color: ${awsui.colorTextHeadingDefault};
  display: flex;
  align-items: center;
  gap: 6px;
}
.stakflo-md h2::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 1em;
  background: ${awsui.colorTextAccent};
  border-radius: 2px;
  flex-shrink: 0;
}
.stakflo-md h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0.9em 0 0.3em;
  color: ${awsui.colorTextBodyDefault};
}
.stakflo-md p {
  margin: 0.4em 0 0.6em;
  font-size: 0.875rem;
}
.stakflo-md ul, .stakflo-md ol {
  margin: 0.4em 0 0.6em 0;
  padding-left: 1.4em;
}
.stakflo-md li {
  margin: 0.2em 0;
  font-size: 0.875rem;
}
.stakflo-md ul > li::marker {
  color: ${awsui.colorTextAccent};
}
.stakflo-md strong {
  font-weight: 700;
  color: ${awsui.colorTextBodyDefault};
}
.stakflo-md em {
  font-style: italic;
  color: ${awsui.colorTextBodySecondary};
}
.stakflo-md code {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  background: ${awsui.colorBackgroundCellShaded};
  border: 1px solid ${awsui.colorBorderDividerDefault};
  border-radius: 3px;
  padding: 1px 5px;
  color: ${awsui.colorTextStatusInfo};
}
.stakflo-md pre {
  background: ${awsui.colorBackgroundCellShaded};
  border: 1px solid ${awsui.colorBorderDividerDefault};
  border-left: 3px solid ${awsui.colorTextAccent};
  border-radius: 4px;
  padding: 10px 14px;
  overflow-x: auto;
  margin: 0.6em 0;
}
.stakflo-md pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.8rem;
  color: ${awsui.colorTextBodyDefault};
}
.stakflo-md blockquote {
  margin: 0.6em 0;
  padding: 8px 12px;
  border-left: 3px solid ${awsui.colorTextStatusWarning};
  background: ${awsui.colorBackgroundNotificationYellow};
  border-radius: 0 4px 4px 0;
  font-size: 0.875rem;
  color: ${awsui.colorTextBodyDefault};
}
.stakflo-md blockquote p { margin: 0; }
.stakflo-md hr {
  border: none;
  border-top: 1px solid ${awsui.colorBorderDividerDefault};
  margin: 1em 0;
}
.stakflo-md a {
  color: ${awsui.colorTextAccent};
  text-decoration: none;
}
.stakflo-md a:hover { text-decoration: underline; }
.stakflo-md table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
  font-size: 0.8rem;
}
.stakflo-md th {
  background: ${awsui.colorBackgroundCellShaded};
  border: 1px solid ${awsui.colorBorderDividerDefault};
  padding: 6px 10px;
  font-weight: 600;
  text-align: left;
  color: ${awsui.colorTextHeadingDefault};
}
.stakflo-md td {
  border: 1px solid ${awsui.colorBorderDividerDefault};
  padding: 5px 10px;
}
.stakflo-md tr:nth-child(even) td {
  background: ${awsui.colorBackgroundCellShaded};
}

/* number list styling */
.stakflo-md ol { list-style-type: decimal; }
.stakflo-md ol > li::marker {
  color: ${awsui.colorTextAccent};
  font-weight: 700;
}

/* first child spacing */
.stakflo-md > *:first-child { margin-top: 0; }
.stakflo-md > *:last-child { margin-bottom: 0; }
`;

let injected = false;
function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const el = document.createElement('style');
  el.id = 'stakflo-md-styles';
  el.textContent = styles;
  document.head.appendChild(el);
}

export default function MarkdownContent({ content, maxHeight }: MarkdownContentProps) {
  injectStyles();

  const html = useMemo(() => {
    const raw = marked.parse(content) as string;
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '');
  }, [content]);

  return (
    <div style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <div
        className="stakflo-md"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
