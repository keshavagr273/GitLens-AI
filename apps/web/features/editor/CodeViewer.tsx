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
  Code2,
  Sparkles,
} from 'lucide-react';

interface Props {
  file: SourceFile | null;
  highlightedLines: [number, number] | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function CodeViewer({
  file,
  highlightedLines,
  isExpanded,
  onToggleExpand,
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

    // Scroll to target line
    editor.revealLinesInCenter(startLine, endLine);

    // Apply high-contrast line highlight
    const newDecorations = [
      {
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'bg-indigo-600/20 border-l-4 border-indigo-400',
          glyphMarginClassName: 'bg-indigo-500',
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
      className={`border-t border-slate-800/80 glass-panel flex flex-col transition-all duration-300 ${
        isExpanded ? 'h-[500px]' : 'h-64'
      }`}
    >
      {/* Code Viewer Breadcrumb Header */}
      <div className="h-9 px-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileCode2 className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="font-mono text-slate-200 font-medium truncate">
            {file?.path || 'No file selected'}
          </span>
          {file && (
            <span className="text-[10px] text-slate-500 font-mono shrink-0">
              ({lineCount} lines • {((file.sizeBytes || 0) / 1024).toFixed(1)} KB)
            </span>
          )}
          {highlightedLines && (
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-cyan-300 border border-indigo-500/40 text-[10px] font-mono shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Lines {highlightedLines[0]}-{highlightedLines[1]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {file?.content && (
            <button
              onClick={handleCopyCode}
              className="px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1 transition-colors text-[11px]"
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
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
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
            fontFamily: 'Fira Code, monospace',
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
