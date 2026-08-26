'use client';

import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { SourceFile } from '@gitlens/shared-types';
import {
  FileCode2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

interface Props {
  file: SourceFile | null;
  highlightedLines: [number, number] | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  height?: number;
}

export function CodeViewer({
  file,
  highlightedLines,
  isExpanded,
  onToggleExpand,
  height,
}: Props) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyLineHighlight();
  };

  const applyLineHighlight = () => {
    if (!editorRef.current || !monacoRef.current || !highlightedLines) {
      if (editorRef.current && decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
      return;
    }

    const [startLine, endLine] = highlightedLines;
    const monaco = monacoRef.current;
    const editor = editorRef.current;

    editor.revealLinesInCenter(startLine, endLine);

    const newDecorations = [
      {
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'bg-[#e8a33d]/15 border-l-2 border-[#e8a33d]',
          glyphMarginClassName: 'bg-[#e8a33d]',
        },
      },
    ];

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  useEffect(() => {
    applyLineHighlight();
  }, [highlightedLines, file]);

  const handleCopyCode = () => {
    if (file?.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const lineCount = file?.content ? file.content.split('\n').length : 0;

  return (
    <div
      style={{ height: isExpanded ? '520px' : `${height || 260}px` }}
      className="border-t border-white/8 bg-[#0a0a0b] flex flex-col shrink-0 overflow-hidden font-mono"
    >
      {/* Code Viewer Breadcrumb Header */}
      <div className="h-9 px-3 border-b border-white/8 bg-[#141312] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="h-3.5 w-3.5 text-[#e8a33d] shrink-0" />
          <span className="text-[#f5f3ee] text-xs font-medium truncate">
            {file?.path || 'No file selected'}
          </span>
          {file && (
            <span className="text-[10px] text-[#4b5563] shrink-0">
              ({lineCount} lines • {((file.sizeBytes || 0) / 1024).toFixed(1)} KB)
            </span>
          )}
          {highlightedLines && (
            <span className="px-2 py-0.2 rounded-[2px] bg-[#e8a33d]/15 text-[#e8a33d] border border-[#e8a33d]/30 text-[9px] shrink-0 flex items-center gap-1 font-semibold">
              <Sparkles className="h-2.5 w-2.5" />
              Lines {highlightedLines[0]}-{highlightedLines[1]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {file?.content && (
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-0.5 rounded-[2px] text-[#a09f9c] hover:text-[#f5f3ee] hover:bg-white/5 flex items-center gap-1 transition-colors text-[10px] uppercase font-semibold"
              title="Copy Code"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={onToggleExpand}
            className="p-1 rounded text-[#a09f9c] hover:text-[#f5f3ee] transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          theme="vs-dark"
          language={file?.language || 'typescript'}
          value={file?.content || '// Click any graph component, route, or citation chip to inspect source code.'}
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            automaticLayout: true,
            glyphMargin: true,
            renderLineHighlight: 'all',
          }}
        />
      </div>
    </div>
  );
}
