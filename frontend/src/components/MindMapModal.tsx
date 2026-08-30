import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    Sparkles,
    ChevronRight,
    ChevronDown,
    Info,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize2,
    Layers,
    Move
} from 'lucide-react';

interface MindMapNode {
    id: string;
    label: string;
    description?: string;
    color?: string;
    children?: MindMapNode[];
}

interface MindMapData {
    title: string;
    root: MindMapNode;
}

interface MindMapModalProps {
    docName: string;
    data: MindMapData | null;
    loading: boolean;
    onClose: () => void;
}

const PALETTE = [
    '#6366f1', // Indigo
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#14b8a6', // Teal
];

export default function MindMapModal({ docName, data, loading, onClose }: MindMapModalProps) {
    const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
    const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });

    // Count all nodes recursively
    const countNodes = (node?: MindMapNode): number => {
        if (!node) return 0;
        let count = 1;
        if (node.children) {
            for (const child of node.children) {
                count += countNodes(child);
            }
        }
        return count;
    };

    const totalNodes = data?.root ? countNodes(data.root) : 0;

    const toggleCollapse = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollapsedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleExpandAll = () => {
        setCollapsedIds({});
    };

    const handleCollapseAll = () => {
        if (!data?.root) return;
        const newCollapsed: Record<string, boolean> = {};
        const recurse = (node: MindMapNode) => {
            if (node.children && node.children.length > 0) {
                if (node.id !== data.root.id) {
                    newCollapsed[node.id] = true;
                }
                node.children.forEach(recurse);
            }
        };
        recurse(data.root);
        setCollapsedIds(newCollapsed);
    };

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Mouse drag pan handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.mm-node-card') || 
            (e.target as HTMLElement).closest('.mm-collapse-toggle') ||
            (e.target as HTMLElement).closest('.mm-inspector-drawer') ||
            (e.target as HTMLElement).closest('.mindmap-header')) {
            return;
        }
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { ...pan };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan({
            x: panStart.current.x + dx,
            y: panStart.current.y + dy
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Recursive node renderer
    const renderNodeTree = (node: MindMapNode, depth: number = 0, index: number = 0, parentColor?: string) => {
        const isCollapsed = !!collapsedIds[node.id];
        const isSelected = selectedNode?.id === node.id;
        const hasChildren = !!(node.children && node.children.length > 0);

        // Determine node color
        let nodeColor = node.color;
        if (!nodeColor) {
            if (depth === 0) {
                nodeColor = '#818cf8';
            } else if (depth === 1) {
                nodeColor = PALETTE[index % PALETTE.length];
            } else {
                nodeColor = parentColor || '#a78bfa';
            }
        }

        const childCount = node.children ? node.children.length : 0;

        return (
            <div 
                key={node.id} 
                className={`mm-tree-branch depth-${depth}`}
                style={{ '--branch-color': nodeColor } as React.CSSProperties}
            >
                {/* Node Container & Outgoing Stem */}
                <div className={`mm-node-wrapper ${hasChildren && !isCollapsed ? 'has-children-open' : ''}`}>
                    <div
                        className={`mm-node-card glass-panel ${isSelected ? 'selected' : ''} depth-card-${depth}`}
                        style={{
                            borderColor: isSelected ? 'var(--primary-light)' : `${nodeColor}50`,
                            boxShadow: isSelected 
                                ? `0 0 0 2px ${nodeColor}, 0 8px 24px ${nodeColor}40` 
                                : `0 4px 14px rgba(0,0,0,0.35)`
                        }}
                        onClick={() => setSelectedNode(node)}
                    >
                        <div 
                            className="mm-node-dot" 
                            style={{ 
                                background: nodeColor, 
                                boxShadow: `0 0 8px ${nodeColor}` 
                            }} 
                        />
                        <span className="mm-node-label">{node.label}</span>

                        {hasChildren && (
                            <button
                                className={`mm-collapse-toggle ${isCollapsed ? 'collapsed' : ''}`}
                                onClick={(e) => toggleCollapse(node.id, e)}
                                title={isCollapsed ? `Expand ${childCount} sub-concepts` : 'Collapse branch'}
                            >
                                {isCollapsed ? (
                                    <span className="mm-collapsed-badge">
                                        +{childCount}
                                    </span>
                                ) : (
                                    <ChevronDown size={14} />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-tree branches */}
                {hasChildren && !isCollapsed && (
                    <div className="mm-children-container">
                        {node.children!.map((child, cIdx) => 
                            renderNodeTree(child, depth + 1, cIdx, nodeColor)
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div 
                className="mindmap-modal-card glass-panel animate-slide-up" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mindmap-header">
                    <div className="mindmap-header-title">
                        <div className="mm-header-icon">
                            <Sparkles size={18} color="var(--primary-light)" />
                        </div>
                        <div>
                            <div className="mm-title-row">
                                <h3>Interactive Concept Mind Map</h3>
                                {totalNodes > 0 && (
                                    <span className="mm-node-badge">
                                        <Layers size={12} /> {totalNodes} concepts
                                    </span>
                                )}
                            </div>
                            <span className="mm-doc-sub">{docName}</span>
                        </div>
                    </div>

                    <div className="mm-header-controls">
                        <div className="tree-toggle-btns">
                            <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={handleExpandAll}
                                title="Expand All Branches"
                            >
                                Expand All
                            </button>
                            <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={handleCollapseAll}
                                title="Collapse Sub-branches"
                            >
                                Collapse
                            </button>
                        </div>

                        <div className="zoom-controls glass-panel">
                            <button 
                                onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(1))))} 
                                title="Zoom Out"
                            >
                                <ZoomOut size={15} />
                            </button>
                            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                            <button 
                                onClick={() => setZoom(z => Math.min(1.8, Number((z + 0.1).toFixed(1))))} 
                                title="Zoom In"
                            >
                                <ZoomIn size={15} />
                            </button>
                            <button onClick={resetView} title="Reset Zoom & Pan">
                                <RotateCcw size={15} />
                            </button>
                        </div>

                        <button className="modal-close-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Canvas Body */}
                <div 
                    className={`mindmap-body ${isDragging ? 'grabbing' : 'grab'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                >
                    {loading ? (
                        <div className="mm-loading-state">
                            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 1.25rem' }} />
                            <h3>Constructing Concept Graph...</h3>
                            <p>Analyzing document hierarchy and generating structured concept relationships</p>
                        </div>
                    ) : !data || !data.root ? (
                        <div className="mm-loading-state">
                            <Info size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                            <h3>No Concept Hierarchy Available</h3>
                            <p>Could not extract a valid concept hierarchy from this document.</p>
                        </div>
                    ) : (
                        <div 
                            className="mindmap-canvas-viewport"
                            style={{ 
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: 'top left'
                            }}
                        >
                            <div className="mm-tree-root-container">
                                {renderNodeTree(data.root)}
                            </div>
                        </div>
                    )}

                    {/* Canvas navigation hint */}
                    {data && !loading && (
                        <div className="mm-canvas-hint">
                            <Move size={12} /> Drag to pan • Scroll or use buttons to zoom • Click node for details
                        </div>
                    )}

                    {/* Node Inspector Drawer */}
                    {selectedNode && (
                        <div className="mm-inspector-drawer glass-panel animate-fade-in">
                            <div className="inspector-header">
                                <div className="inspector-tag">
                                    <Info size={14} color="var(--primary-light)" />
                                    <span>Concept Breakdown</span>
                                </div>
                                <button className="inspector-close" onClick={() => setSelectedNode(null)}>
                                    <X size={15} />
                                </button>
                            </div>

                            <h4 className="inspector-title">{selectedNode.label}</h4>
                            <p className="inspector-description">
                                {selectedNode.description || 'No detailed definition available for this concept.'}
                            </p>

                            {selectedNode.children && selectedNode.children.length > 0 && (
                                <div className="inspector-subconcepts">
                                    <span className="subconcepts-label">Sub-concepts ({selectedNode.children.length}):</span>
                                    <div className="subconcepts-tags">
                                        {selectedNode.children.map(c => (
                                            <span 
                                                key={c.id} 
                                                className="subconcept-chip"
                                                onClick={() => setSelectedNode(c)}
                                            >
                                                {c.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .mindmap-modal-card {
                    width: 95vw;
                    max-width: 1300px;
                    height: 88vh;
                    display: flex;
                    flex-direction: column;
                    border-radius: var(--radius-lg);
                    border: 1px solid rgba(99, 102, 241, 0.4);
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15);
                    overflow: hidden;
                }

                .mindmap-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.75rem;
                    background: rgba(15, 23, 42, 0.95);
                    border-bottom: 1px solid var(--border);
                    z-index: 10;
                }
                .mindmap-header-title {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                }
                .mm-title-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .mm-header-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    background: rgba(99, 102, 241, 0.18);
                    border: 1px solid rgba(99, 102, 241, 0.35);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .mindmap-header h3 {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: #ffffff;
                    margin: 0;
                }
                .mm-node-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    background: rgba(99, 102, 241, 0.15);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    color: var(--primary-light);
                    font-size: 0.72rem;
                    font-weight: 600;
                    padding: 0.15rem 0.5rem;
                    border-radius: 20px;
                }
                .mm-doc-sub {
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }

                .mm-header-controls {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                }
                .tree-toggle-btns {
                    display: flex;
                    gap: 0.4rem;
                }
                .tree-toggle-btns .btn {
                    padding: 0.35rem 0.7rem;
                    font-size: 0.78rem;
                }
                .zoom-controls {
                    display: flex;
                    align-items: center;
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius-sm);
                    gap: 0.35rem;
                    background: rgba(30, 41, 59, 0.8);
                }
                .zoom-controls button {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.3rem;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    transition: all 0.15s;
                }
                .zoom-controls button:hover {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.1);
                }
                .zoom-level {
                    font-size: 0.78rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    min-width: 42px;
                    text-align: center;
                }

                /* ─── Body & Canvas ─── */
                .mindmap-body {
                    flex: 1;
                    position: relative;
                    overflow: auto;
                    background: #080c15;
                    background-image: 
                        radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
                    background-size: 28px 28px;
                    padding: 3.5rem 3rem;
                    user-select: none;
                }
                .mindmap-body.grab {
                    cursor: grab;
                }
                .mindmap-body.grabbing {
                    cursor: grabbing;
                }

                .mm-loading-state {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: var(--text-secondary);
                }
                .mm-loading-state h3 {
                    font-size: 1.25rem;
                    color: #ffffff;
                    margin-bottom: 0.4rem;
                }
                .mm-loading-state p {
                    font-size: 0.88rem;
                    color: var(--text-muted);
                    max-width: 440px;
                }

                .mm-canvas-hint {
                    position: absolute;
                    bottom: 1.25rem;
                    left: 1.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.74rem;
                    color: var(--text-muted);
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(8px);
                    padding: 0.35rem 0.75rem;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    pointer-events: none;
                }

                /* ─── Tree Node & Connecting Lines ─── */
                .mindmap-canvas-viewport {
                    display: inline-block;
                    min-width: max-content;
                    padding: 1rem;
                    transition: transform 0.05s ease-out;
                }

                .mm-tree-root-container {
                    display: inline-flex;
                    align-items: center;
                }

                .mm-tree-branch {
                    display: flex;
                    align-items: center;
                    position: relative;
                }

                .mm-node-wrapper {
                    display: flex;
                    align-items: center;
                    position: relative;
                    z-index: 3;
                }

                /* Outgoing line from parent card to children column */
                .mm-node-wrapper.has-children-open::after {
                    content: '';
                    position: absolute;
                    left: 100%;
                    top: 50%;
                    width: 44px;
                    height: 2px;
                    background: linear-gradient(90deg, var(--branch-color, #6366f1), rgba(255, 255, 255, 0.3));
                    box-shadow: 0 0 8px var(--branch-color, #6366f1);
                    z-index: 1;
                }

                /* Container holding all children for a parent */
                .mm-children-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    position: relative;
                    padding-left: 44px;
                    gap: 1.25rem;
                    z-index: 2;
                }

                /* Horizontal incoming branch line to each child */
                .mm-children-container > .mm-tree-branch::before {
                    content: '';
                    position: absolute;
                    left: -44px;
                    top: 50%;
                    width: 44px;
                    height: 2px;
                    background: var(--branch-color, #6366f1);
                    box-shadow: 0 0 6px var(--branch-color, #6366f1);
                    z-index: 1;
                }

                /* Continuous vertical connecting line linking sibling branches */
                .mm-children-container > .mm-tree-branch::after {
                    content: '';
                    position: absolute;
                    left: -44px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: var(--branch-color, #6366f1);
                    box-shadow: 0 0 6px var(--branch-color, #6366f1);
                    z-index: 1;
                }

                /* Single child doesn't need a vertical spine */
                .mm-children-container > .mm-tree-branch:only-child::after {
                    display: none;
                }

                /* First child: vertical line starts at 50% height and goes downward */
                .mm-children-container > .mm-tree-branch:first-child::after {
                    top: 50%;
                    border-top-left-radius: 6px;
                }

                /* Last child: vertical line ends at 50% height */
                .mm-children-container > .mm-tree-branch:last-child::after {
                    bottom: 50%;
                    border-bottom-left-radius: 6px;
                }

                /* ─── Node Cards ─── */
                .mm-node-card {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.65rem 1.15rem;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
                    user-select: none;
                    white-space: nowrap;
                    background: rgba(15, 23, 42, 0.92);
                    backdrop-filter: blur(12px);
                    border-width: 1.5px;
                    border-style: solid;
                    position: relative;
                }
                .mm-node-card:hover {
                    background: rgba(30, 41, 59, 0.98);
                    transform: scale(1.03);
                    border-color: #ffffff !important;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px var(--branch-color, #6366f1) !important;
                }
                .mm-node-card.selected {
                    background: rgba(30, 41, 59, 1);
                }

                .depth-card-0 {
                    font-size: 1.12rem;
                    font-weight: 800;
                    padding: 0.95rem 1.6rem;
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
                    border-radius: var(--radius-md);
                }
                .depth-card-1 {
                    font-size: 0.94rem;
                    font-weight: 700;
                    padding: 0.75rem 1.25rem;
                }
                .depth-card-2 {
                    font-size: 0.85rem;
                    font-weight: 600;
                    padding: 0.55rem 1rem;
                }

                .mm-node-dot {
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                .depth-card-0 .mm-node-dot {
                    width: 12px;
                    height: 12px;
                }

                .mm-node-label {
                    color: var(--text-primary);
                    letter-spacing: -0.01em;
                }

                .mm-collapse-toggle {
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-muted);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.2rem 0.35rem;
                    border-radius: 6px;
                    margin-left: 0.35rem;
                    transition: all 0.15s;
                }
                .mm-collapse-toggle:hover {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.15);
                    border-color: rgba(255, 255, 255, 0.25);
                }
                .mm-collapse-toggle.collapsed {
                    background: rgba(99, 102, 241, 0.25);
                    border-color: var(--primary-light);
                    color: #ffffff;
                }
                .mm-collapsed-badge {
                    font-size: 0.7rem;
                    font-weight: 800;
                    padding: 0 0.15rem;
                }

                /* ─── Inspector Drawer ─── */
                .mm-inspector-drawer {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    width: 360px;
                    padding: 1.5rem;
                    border-radius: var(--radius-md);
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(99, 102, 241, 0.2);
                    border: 1px solid rgba(99, 102, 241, 0.45);
                    background: rgba(15, 23, 42, 0.97);
                    backdrop-filter: blur(16px);
                    z-index: 40;
                }
                .inspector-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.85rem;
                }
                .inspector-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.76rem;
                    font-weight: 700;
                    color: var(--primary-light);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .inspector-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0.2rem;
                    display: flex;
                    align-items: center;
                }
                .inspector-close:hover {
                    color: #ffffff;
                }
                .inspector-title {
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 0.5rem;
                    line-height: 1.3;
                }
                .inspector-description {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    line-height: 1.65;
                    margin-bottom: 1.25rem;
                }
                .inspector-subconcepts {
                    padding-top: 0.85rem;
                    border-top: 1px solid var(--border);
                }
                .subconcepts-label {
                    font-size: 0.76rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    display: block;
                    margin-bottom: 0.55rem;
                }
                .subconcepts-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.4rem;
                }
                .subconcept-chip {
                    padding: 0.3rem 0.65rem;
                    border-radius: 6px;
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    font-size: 0.78rem;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .subconcept-chip:hover {
                    background: var(--primary);
                    color: #fff;
                    border-color: var(--primary);
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    );
}
