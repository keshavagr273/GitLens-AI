'use client';

import React, { useState, useMemo } from 'react';
import { SourceFile } from '@gitlens/shared-types';
import { Folder, FolderOpen, FileCode2, ChevronRight, ChevronDown } from 'lucide-react';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: SourceFile;
  children: Record<string, TreeNode>;
}

interface Props {
  files: SourceFile[];
  activeFileId?: string;
  onSelectFile: (fileId: string) => void;
}

export function FileTreeView({ files, activeFileId, onSelectFile }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    '': true,
    src: true,
    'src/routes': true,
    'src/controllers': true,
    'src/services': true,
  });

  // Build tree from file paths
  const tree = useMemo(() => {
    const root: TreeNode = { name: '', path: '', isFolder: true, children: {} };

    for (const file of files) {
      const parts = file.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            isFolder: !isLeaf,
            file: isLeaf ? file : undefined,
            children: {},
          };
        }
        current = current.children[part];
      }
    }
    return root;
  }, [files]);

  const toggleFolder = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    if (node.isFolder) {
      const isExpanded = expanded[node.path] ?? depth < 2;
      const childCount = Object.keys(node.children).length;

      return (
        <div key={node.path} className="select-none">
          {node.name && (
            <div
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 12 + 6}px` }}
              className="flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer hover:bg-slate-800/60 text-slate-300 hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-1.5 truncate">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-indigo-400/80 shrink-0" />
                )}
                <span className="font-mono text-[11px] font-medium truncate">{node.name}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{childCount}</span>
            </div>
          )}

          {isExpanded && (
            <div className="space-y-0.5">
              {Object.values(node.children)
                .sort((a, b) => (b.isFolder ? 1 : 0) - (a.isFolder ? 1 : 0) || a.name.localeCompare(b.name))
                .map((child) => renderNode(child, node.name ? depth + 1 : 0))}
            </div>
          )}
        </div>
      );
    }

    const isActive = activeFileId === node.file?.id || activeFileId === node.path;
    return (
      <div
        key={node.path}
        onClick={() => node.file && onSelectFile(node.file.id)}
        style={{ paddingLeft: `${depth * 12 + 18}px` }}
        className={`flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 font-medium'
            : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <FileCode2 className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
          <span className="truncate font-mono text-[11px]">{node.name}</span>
        </div>
        {node.file && (
          <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-1">
            {(node.file.sizeBytes / 1024).toFixed(1)}k
          </span>
        )}
      </div>
    );
  };

  return <div className="space-y-0.5">{renderNode(tree)}</div>;
}
