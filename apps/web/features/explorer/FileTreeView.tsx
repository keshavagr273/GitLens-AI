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

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    const traverse = (node: TreeNode) => {
      if (node.isFolder) {
        all[node.path] = true;
        Object.values(node.children).forEach(traverse);
      }
    };
    traverse(tree);
    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded({ '': true });
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    if (node.isFolder) {
      const isExpanded = expanded[node.path] ?? depth < 2;
      const childCount = Object.keys(node.children).length;

      return (
        <div key={node.path} className="select-none font-mono text-xs">
          {node.name && (
            <div
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 10 + 4}px` }}
              className="flex items-center justify-between py-1 pr-1.5 rounded-[2px] cursor-pointer hover:bg-white/5 text-[#a09f9c] hover:text-[#f5f3ee] transition-colors group"
            >
              <div className="flex items-center gap-1.5 truncate">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-[#4b5563] group-hover:text-[#a09f9c] shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-[#4b5563] group-hover:text-[#a09f9c] shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-3.5 w-3.5 text-[#e8a33d] shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-[#e8a33d]/70 shrink-0" />
                )}
                <span className="text-[11px] font-medium truncate">{node.name}</span>
              </div>
              <span className="text-[9px] text-[#4b5563] px-1 py-0.2 rounded bg-[#0a0a0b]">{childCount}</span>
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
        style={{ paddingLeft: `${depth * 10 + 14}px` }}
        className={`flex items-center justify-between py-1 pr-2 rounded-[2px] cursor-pointer transition-all font-mono text-xs ${
          isActive
            ? 'bg-[#141312] border border-[#e8a33d] text-[#f5f3ee] font-semibold'
            : 'hover:bg-white/5 text-[#a09f9c] hover:text-[#f5f3ee] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <FileCode2 className={`h-3 w-3 shrink-0 ${isActive ? 'text-[#e8a33d]' : 'text-[#4b5563]'}`} />
          <span className="truncate text-[11px]">{node.name}</span>
        </div>
        {node.file && (
          <span className="text-[9px] text-[#4b5563] shrink-0 ml-1">
            {(node.file.sizeBytes / 1024).toFixed(1)}k
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/8">
        <span className="text-[10px] text-[#a09f9c] font-mono">Files ({files.length})</span>
        <div className="flex items-center gap-1 font-mono">
          <button
            onClick={expandAll}
            className="text-[9px] px-2 py-0.5 rounded-[2px] bg-[#141312] border border-white/8 text-[#a09f9c] hover:text-[#f5f3ee] hover:border-[#e8a33d]/40 transition-colors"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="text-[9px] px-2 py-0.5 rounded-[2px] bg-[#141312] border border-white/8 text-[#a09f9c] hover:text-[#f5f3ee] hover:border-[#e8a33d]/40 transition-colors"
          >
            Collapse
          </button>
        </div>
      </div>
      <div className="space-y-0.5">{renderNode(tree)}</div>
    </div>
  );
}
