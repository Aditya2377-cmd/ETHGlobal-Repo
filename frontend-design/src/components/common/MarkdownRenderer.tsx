import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content = '', style }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to parse inline styles: bold, italic, code
  const renderInlineFormatted = (text: string): React.ReactNode[] => {
    const safeText = typeof text === 'string' ? text : String(text || '');
    // Regex matching inline tokens: `code`, **bold**, *italic*
    const parts: React.ReactNode[] = [];
    const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(safeText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(safeText.substring(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              padding: '2px 6px',
              fontSize: '0.9em',
              color: '#0F172A',
              fontWeight: 600,
            }}
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} style={{ fontWeight: 800, color: '#0F172A' }}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={match.index} style={{ fontStyle: 'italic', color: '#1E293B' }}>
            {token.slice(1, -1)}
          </em>
        );
      }
      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < safeText.length) {
      parts.push(safeText.substring(lastIndex));
    }

    return parts;
  };

  // Parse markdown into blocks safely
  const safeContent = typeof content === 'string' ? content : (content ? String(content) : '');
  const lines = safeContent.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let blockIndex = 0;

  const flushList = () => {
    if (!listBuffer) return;
    const ListTag = listBuffer.type;
    const listKey = `list_${blockIndex++}`;
    elements.push(
      <ListTag
        key={listKey}
        style={{
          margin: '14px 0 18px 24px',
          paddingLeft: '12px',
          fontSize: '20px',
          lineHeight: 1.8,
          color: '#0F172A',
        }}
      >
        {(listBuffer?.items || []).map((item, idx) => (
          <li key={idx} style={{ marginBottom: '8px' }}>
            {renderInlineFormatted(item)}
          </li>
        ))}
      </ListTag>
    );
    listBuffer = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block Fence (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeText = codeBuffer.join('\n');
        const currentIndex = blockIndex++;
        const lang = codeLanguage;
        elements.push(
          <div
            key={`code_${currentIndex}`}
            style={{
              margin: '20px 0',
              border: '2px solid #0F172A',
              backgroundColor: '#0F172A',
              color: '#F8FAFC',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '16px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 16px',
                backgroundColor: '#1E293B',
                borderBottom: '1px solid #334155',
                fontSize: '13px',
                color: '#94A3B8',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={14} />
                {lang || 'code'}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeText, currentIndex)}
                style={{
                  background: 'none',
                  border: '1px solid #475569',
                  color: '#F8FAFC',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {copiedIndex === currentIndex ? (
                  <>
                    <Check size={13} color="#22C55E" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '18px 20px',
                overflowX: 'auto',
                lineHeight: 1.6,
                fontFamily: '"Courier New", Courier, monospace',
              }}
            >
              <code>{codeText}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeLanguage = '';
      } else {
        // Start code block
        flushList();
        inCodeBlock = true;
        codeLanguage = trimmed.replace('```', '').trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // 2. Headings
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1
          key={`h1_${blockIndex++}`}
          style={{
            fontSize: '30px',
            fontWeight: 800,
            color: '#0F172A',
            borderBottom: '2px solid #0F172A',
            paddingBottom: '8px',
            marginTop: '28px',
            marginBottom: '14px',
            letterSpacing: '-0.02em',
          }}
        >
          {renderInlineFormatted(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2
          key={`h2_${blockIndex++}`}
          style={{
            fontSize: '25px',
            fontWeight: 800,
            color: '#0F172A',
            borderBottom: '1.5px solid #CBD5E1',
            paddingBottom: '6px',
            marginTop: '24px',
            marginBottom: '12px',
            letterSpacing: '-0.015em',
          }}
        >
          {renderInlineFormatted(trimmed.slice(3))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3
          key={`h3_${blockIndex++}`}
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0F172A',
            marginTop: '20px',
            marginBottom: '10px',
          }}
        >
          {renderInlineFormatted(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4
          key={`h4_${blockIndex++}`}
          style={{
            fontSize: '19px',
            fontWeight: 700,
            color: '#1E293B',
            marginTop: '16px',
            marginBottom: '8px',
          }}
        >
          {renderInlineFormatted(trimmed.slice(5))}
        </h4>
      );
      continue;
    }

    // 3. Bullet lists (* or -)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const itemText = trimmed.slice(2);
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [itemText] };
      } else {
        listBuffer.items.push(itemText);
      }
      continue;
    }

    // 4. Numbered lists (1., 2., etc.)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      const itemText = numberedMatch[2];
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [itemText] };
      } else {
        listBuffer.items.push(itemText);
      }
      continue;
    }

    // 5. Blockquotes (> )
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote_${blockIndex++}`}
          style={{
            borderLeft: '4px solid #1D4ED8',
            paddingLeft: '16px',
            margin: '16px 0',
            color: '#475569',
            fontStyle: 'italic',
            fontSize: '19px',
            lineHeight: 1.7,
            backgroundColor: '#F8FAFC',
            padding: '12px 18px',
          }}
        >
          {renderInlineFormatted(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Empty lines flush lists
    if (trimmed.length === 0) {
      flushList();
      continue;
    }

    // 6. Regular paragraphs
    flushList();
    elements.push(
      <p
        key={`p_${blockIndex++}`}
        style={{
          margin: '12px 0',
          fontSize: '21px',
          lineHeight: 1.85,
          color: '#0F172A',
        }}
      >
        {renderInlineFormatted(trimmed)}
      </p>
    );
  }

  flushList();

  return (
    <div
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        color: '#0F172A',
        ...style,
      }}
    >
      {elements}
    </div>
  );
};

