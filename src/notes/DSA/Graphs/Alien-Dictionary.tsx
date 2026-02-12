import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, RefreshCw, AlertTriangle, CheckCircle, Info, ChevronRight, Play, SkipForward } from 'lucide-react';

// --- Types ---
interface GraphNode {
    id: string;
    x: number;
    y: number;
}

interface Edge {
    source: string;
    target: string;
}

type StepType = 'compare' | 'build-graph' | 'sort' | 'complete';

// --- Default Data ---
const DEFAULT_WORDS = ["wrt", "wrf", "er", "ett", "rftt"];

export default function AlienDictionaryExplainer() {
    // Input State
    const [words, setWords] = useState<string[]>(DEFAULT_WORDS);
    const [inputText, setInputText] = useState(DEFAULT_WORDS.join(', '));
    const [error, setError] = useState<string | null>(null);

    // Algorithm State
    const [step, setStep] = useState<StepType>('compare');
    const [compareIndex, setCompareIndex] = useState(0); // Index of the first word in the pair being compared
    const [rules, setRules] = useState<Edge[]>([]);
    const [adjList, setAdjList] = useState<Record<string, string[]>>({});
    const [inDegree, setInDegree] = useState<Record<string, number>>({});
    const [sortedOrder, setSortedOrder] = useState<string[]>([]);
    const [queue, setQueue] = useState<string[]>([]);
    const [processingNode, setProcessingNode] = useState<string | null>(null);

    // --- Reset & Initialize ---
    const initialize = useCallback((wordList: string[]) => {
        setWords(wordList);
        setStep('compare');
        setCompareIndex(0);
        setRules([]);
        setAdjList({});
        setInDegree({});
        setSortedOrder([]);
        setQueue([]);
        setProcessingNode(null);
        setError(null);

        // Initialize graph structures with all unique chars
        const uniqueChars = new Set(wordList.join('').split(''));
        const initialAdj: Record<string, string[]> = {};
        const initialInDegree: Record<string, number> = {};

        uniqueChars.forEach(c => {
            initialAdj[c] = [];
            initialInDegree[c] = 0;
        });

        setAdjList(initialAdj);
        setInDegree(initialInDegree);
    }, []);

    useEffect(() => {
        initialize(DEFAULT_WORDS);
    }, [initialize]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
    };

    const handleLoadWords = () => {
        const newWords = inputText.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (newWords.length < 2) {
            setError("Please enter at least 2 words.");
            return;
        }
        initialize(newWords);
    };

    // --- Algorithm Steps ---

    const nextStep = () => {
        if (step === 'compare') {
            // Logic: Compare words[compareIndex] and words[compareIndex + 1]
            if (compareIndex >= words.length - 1) {
                // Done comparing, move to sorting
                startTopologicalSort();
                return;
            }

            const w1 = words[compareIndex];
            const w2 = words[compareIndex + 1];
            let foundDiff = false;

            // Prefix check edge case
            if (w1.length > w2.length && w1.startsWith(w2)) {
                setError("Invalid Input: Prefix rule violation (longer word before shorter prefix).");
                return;
            }

            const minLen = Math.min(w1.length, w2.length);
            for (let j = 0; j < minLen; j++) {
                if (w1[j] !== w2[j]) {
                    // Found a dependency: w1[j] -> w2[j]
                    const source = w1[j];
                    const target = w2[j];

                    // Check if rule already exists to avoid duplicates in visualization
                    const ruleExists = rules.some(r => r.source === source && r.target === target);

                    if (!ruleExists) {
                        setRules(prev => [...prev, { source, target }]);

                        // Update Graph State
                        setAdjList(prev => {
                            // Only add if not already in adjacency list
                            if (prev[source].includes(target)) return prev;
                            return { ...prev, [source]: [...prev[source], target] };
                        });
                        setInDegree(prev => ({ ...prev, [target]: prev[target] + 1 }));
                    }

                    foundDiff = true;
                    break; // Only the first difference matters
                }
            }

            setCompareIndex(prev => prev + 1);
        }
        else if (step === 'sort') {
            processQueue();
        }
    };

    const startTopologicalSort = () => {
        setStep('sort');

        // Find all nodes with 0 in-degree
        const initialQueue: string[] = [];
        Object.keys(inDegree).forEach(char => {
            if (inDegree[char] === 0) {
                initialQueue.push(char);
            }
        });

        setQueue(initialQueue);

        // Check for cycle immediately if queue is empty but nodes exist
        if (initialQueue.length === 0 && Object.keys(inDegree).length > 0) {
            setError("Cycle detected! Invalid Dictionary.");
        }
    };

    const processQueue = () => {
        if (queue.length === 0) {
            if (sortedOrder.length < Object.keys(inDegree).length) {
                setError("Cycle detected! Graph has a circular dependency.");
            } else {
                setStep('complete');
            }
            return;
        }

        const current = queue[0];
        const newQueue = queue.slice(1);

        setProcessingNode(current);
        setSortedOrder(prev => [...prev, current]);

        // Decrease neighbors' in-degree
        const neighbors = adjList[current] || [];
        const newInDegree = { ...inDegree };
        const nextBatch: string[] = [];

        neighbors.forEach(neighbor => {
            newInDegree[neighbor]--;
            if (newInDegree[neighbor] === 0) {
                nextBatch.push(neighbor);
            }
        });

        setInDegree(newInDegree);
        setQueue([...newQueue, ...nextBatch]);
    };

    // --- Visualization Helpers ---

    // Simple Force-Simulation-ish layout for graph nodes
    const getNodePositions = () => {
        const chars = Object.keys(inDegree).sort();
        const count = chars.length;
        const positions: Record<string, GraphNode> = {};
        const radius = 120;
        const centerX = 200;
        const centerY = 150;

        chars.forEach((char, i) => {
            const angle = (i / count) * 2 * Math.PI;
            positions[char] = {
                id: char,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            };
        });
        return positions;
    };

    const nodePositions = getNodePositions();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-600 rounded-lg text-white">
                        <Info size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Alien Dictionary Explainer</h1>
                        <p className="text-slate-500">Visualize Topological Sort on a Dependency Graph</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dictionary Words (Sorted)</label>
                            <input
                                type="text"
                                value={inputText}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                                placeholder="wrt, wrf, er, ett, rftt"
                            />
                        </div>
                        <button
                            onClick={handleLoadWords}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <RefreshCw size={18} /> Reset
                        </button>
                        <button
                            onClick={nextStep}
                            disabled={step === 'complete' || !!error}
                            className={`px-6 py-2 rounded-lg font-bold text-white flex items-center gap-2 transition-all ${step === 'complete' || error ? 'bg-slate-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-md'
                                }`}
                        >
                            {step === 'compare' ? <Play size={18} /> : <SkipForward size={18} />}
                            {step === 'compare' ? 'Next Comparison' : step === 'sort' ? 'Process Queue' : 'Done'}
                        </button>
                    </div>
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200">
                            <AlertTriangle size={18} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* LEFT PANEL: Steps & Logic */}
                    <div className="space-y-6">

                        {/* Step 1: Comparison View */}
                        <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${step === 'compare' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-slate-200 opacity-60'}`}>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">1</span>
                                    Extract Rules
                                </h3>
                                {step === 'compare' && <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Active</span>}
                            </div>
                            <div className="p-4 space-y-2">
                                <p className="text-sm text-slate-600 mb-4">
                                    Comparing adjacent words to find the first differing character. This determines the order.
                                </p>
                                <div className="bg-slate-50 p-4 rounded-lg font-mono text-lg space-y-1">
                                    {words.map((word, idx) => {
                                        const isBeingCompared = step === 'compare' && (idx === compareIndex || idx === compareIndex + 1);
                                        const isFirst = idx === compareIndex;

                                        // Logic to highlight diff char
                                        let highlightIndex = -1;
                                        if (isBeingCompared && compareIndex < words.length - 1) {
                                            const w1 = words[compareIndex];
                                            const w2 = words[compareIndex + 1];
                                            const minLen = Math.min(w1.length, w2.length);
                                            for (let k = 0; k < minLen; k++) {
                                                if (w1[k] !== w2[k]) {
                                                    highlightIndex = k;
                                                    break;
                                                }
                                            }
                                        }

                                        return (
                                            <div key={idx} className={`flex items-center gap-4 transition-all ${isBeingCompared ? 'opacity-100 translate-x-2' : 'opacity-40'}`}>
                                                <span className="text-slate-400 text-xs w-4">{idx}</span>
                                                <div className={`flex ${isBeingCompared ? 'font-bold text-slate-800' : ''}`}>
                                                    {word.split('').map((char, cIdx) => (
                                                        <span key={cIdx} className={`${cIdx === highlightIndex && isBeingCompared ? 'text-purple-600 bg-purple-100 rounded px-1' : ''}`}>
                                                            {char}
                                                        </span>
                                                    ))}
                                                </div>
                                                {isFirst && isBeingCompared && highlightIndex !== -1 && (
                                                    <div className="flex items-center gap-2 text-purple-600 text-xs font-bold bg-white px-2 py-1 rounded shadow-sm border border-purple-100">
                                                        <ArrowRight size={14} />
                                                        Rule: '{word[highlightIndex]}' before '{words[idx + 1][highlightIndex]}'
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Queue & Sort View */}
                        <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${step === 'sort' || step === 'complete' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-slate-200'}`}>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">2</span>
                                    Topological Sort (Kahn's Algorithm)
                                </h3>
                                {(step === 'sort' || step === 'complete') && <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Active</span>}
                            </div>
                            <div className="p-4 space-y-4">

                                {/* Queue Visualization */}
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Queue (0 In-Degree)</div>
                                    <div className="h-12 bg-slate-100 rounded-lg flex items-center px-2 gap-2 overflow-x-auto border border-slate-200">
                                        {queue.length === 0 && <span className="text-slate-400 text-sm italic ml-2">Empty</span>}
                                        {queue.map((node, i) => (
                                            <div key={i} className="w-8 h-8 bg-white rounded shadow-sm flex items-center justify-center font-bold text-purple-700 border border-purple-200 shrink-0">
                                                {node}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Result String */}
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Alien Alphabet Order</div>
                                    <div className="min-h-[3rem] bg-indigo-50 border border-indigo-100 rounded-lg flex items-center p-3 gap-2 flex-wrap">
                                        {sortedOrder.map((char, i) => (
                                            <div key={i} className="flex items-center">
                                                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                                                    {char}
                                                </span>
                                                {i < sortedOrder.length - 1 && <ChevronRight size={16} className="text-indigo-300 ml-2" />}
                                            </div>
                                        ))}
                                        {step === 'complete' && (
                                            <div className="flex items-center gap-2 text-green-600 font-bold ml-4 animate-fade-in">
                                                <CheckCircle size={20} />
                                                Complete
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>

                    {/* RIGHT PANEL: Graph Visualization */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700">Dependency Graph</h3>
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-slate-200"></span>
                                    <span>Waiting</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-500"></span>
                                    <span>Queue</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                                    <span>Sorted</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 relative overflow-hidden bg-slate-50">
                            <svg width="100%" height="100%" viewBox="0 0 400 300">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                                    </marker>
                                    <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#9333ea" />
                                    </marker>
                                </defs>

                                {/* Edges */}
                                {Object.keys(adjList).map(source =>
                                    adjList[source].map(target => {
                                        const start = nodePositions[source];
                                        const end = nodePositions[target];
                                        if (!start || !end) return null;

                                        const isActive = processingNode === source;

                                        return (
                                            <line
                                                key={`${source}-${target}`}
                                                x1={start.x} y1={start.y}
                                                x2={end.x} y2={end.y}
                                                stroke={isActive ? "#9333ea" : "#cbd5e1"}
                                                strokeWidth={isActive ? 3 : 2}
                                                markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                                                className="transition-all duration-500"
                                            />
                                        );
                                    })
                                )}

                                {/* Nodes */}
                                {Object.keys(nodePositions).map(char => {
                                    const pos = nodePositions[char];
                                    const isSorted = sortedOrder.includes(char);
                                    const isInQueue = queue.includes(char);
                                    const isProcessing = processingNode === char;

                                    return (
                                        <g key={char} className="transition-all duration-500">
                                            <circle
                                                cx={pos.x} cy={pos.y} r="20"
                                                fill={isSorted ? "#4f46e5" : isInQueue ? "#f3e8ff" : "#ffffff"}
                                                stroke={isProcessing ? "#9333ea" : isSorted ? "#4338ca" : isInQueue ? "#9333ea" : "#cbd5e1"}
                                                strokeWidth={isProcessing ? 3 : 2}
                                                className="transition-colors duration-300"
                                            />
                                            <text
                                                x={pos.x} y={pos.y} dy="5" textAnchor="middle"
                                                fill={isSorted ? "#fff" : "#1e293b"}
                                                className="font-bold font-mono pointer-events-none"
                                            >
                                                {char}
                                            </text>
                                            {/* In-Degree Badge */}
                                            {!isSorted && (
                                                <g transform={`translate(${pos.x + 14}, ${pos.y - 14})`}>
                                                    <circle r="8" fill="#ef4444" />
                                                    <text dy="3" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                                                        {inDegree[char]}
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>

                        <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 text-center">
                            Edges represent "must come before" rules. Red badges show In-Degree (dependencies).
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}