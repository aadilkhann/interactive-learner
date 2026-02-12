import React, { useState, useEffect, useMemo } from 'react';
import { Play, SkipForward, SkipBack, RotateCcw, ArrowRight, Info } from 'lucide-react';

// --- Types ---
interface Edge {
    to: number;
    weight: number;
}

interface Step {
    id: number;
    description: string;
    pq: { node: number; dist: number }[];
    dist: number[];
    ways: number[];
    activeNode: number | null;
    activeNeighbor: number | null;
    highlightType: 'none' | 'relax' | 'accumulate' | 'ignore';
    processed: boolean[];
}

// --- Hardcoded Layout for the specific n=7 example ---
// Arranged roughly by distance from 0 to reduce edge crossing
const NODE_POSITIONS = [
    { x: 50, y: 150 },  // 0
    { x: 150, y: 50 },  // 1
    { x: 300, y: 50 },  // 2
    { x: 300, y: 250 }, // 3
    { x: 150, y: 250 }, // 4
    { x: 450, y: 150 }, // 5
    { x: 550, y: 150 }, // 6
];

export default function NumberOfWaysExplainer() {
    // Input Data from the problem description
    const n = 7;
    const roads = [
        [0, 6, 7], [0, 1, 2], [1, 2, 3], [1, 3, 3], [6, 3, 3],
        [3, 5, 1], [6, 5, 1], [2, 5, 1], [0, 4, 5], [4, 6, 2]
    ];

    // State
    const [stepIndex, setStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // --- Algorithm Simulation ---
    const simulation = useMemo(() => {
        const steps: Step[] = [];
        const adj: Edge[][] = Array.from({ length: n }, () => []);

        // Build Graph
        roads.forEach(([u, v, w]) => {
            adj[u].push({ to: v, weight: w });
            adj[v].push({ to: u, weight: w });
        });

        // Sort neighbors for deterministic visualization behavior
        adj.forEach(list => list.sort((a, b) => a.to - b.to));

        // Dijkstra State
        const dist = new Array(n).fill(Infinity);
        const ways = new Array(n).fill(0);
        const processed = new Array(n).fill(false);

        // Custom PQ implementation for simulation (array sorted by dist)
        let pq: { node: number; dist: number }[] = [];

        // Init
        dist[0] = 0;
        ways[0] = 1;
        pq.push({ node: 0, dist: 0 });

        const addStep = (
            desc: string,
            currNode: number | null,
            currNeigh: number | null,
            type: Step['highlightType'] = 'none'
        ) => {
            steps.push({
                id: steps.length,
                description: desc,
                pq: [...pq].sort((a, b) => a.dist - b.dist), // Snapshot sorted PQ
                dist: [...dist],
                ways: [...ways],
                activeNode: currNode,
                activeNeighbor: currNeigh,
                highlightType: type,
                processed: [...processed]
            });
        };

        addStep("Initialize: Start at Node 0 with dist=0, ways=1", null, null);

        while (pq.length > 0) {
            // Sort to simulate Priority Queue pop
            pq.sort((a, b) => a.dist - b.dist);
            const { node: u, dist: d } = pq.shift()!; // Poll

            // Visualization: Mark node as active
            addStep(`Pop Node ${u} (time: ${d}) from Priority Queue`, u, null);

            if (d > dist[u]) {
                addStep(`Node ${u} has already been processed with a shorter time. Ignore.`, u, null, 'ignore');
                continue;
            }

            // Mark as conceptually processed for visual clarity (though standard Dijkstra doesn't need explicit visited array if using dist check)
            processed[u] = true;

            for (const edge of adj[u]) {
                const v = edge.to;
                const time = edge.weight;
                const newDist = d + time;

                addStep(`Check neighbor Node ${v} (weight ${time}). New path time: ${d} + ${time} = ${newDist}`, u, v);

                if (newDist < dist[v]) {
                    dist[v] = newDist;
                    ways[v] = ways[u];
                    pq.push({ node: v, dist: newDist });
                    addStep(
                        `Found SHORTER path to ${v}! Update dist[${v}]=${newDist}. Ways[${v}] is now Ways[${u}] (${ways[u]}). Push to PQ.`,
                        u, v, 'relax'
                    );
                } else if (newDist === dist[v]) {
                    ways[v] = (ways[v] + ways[u]) % 1_000_000_007;
                    addStep(
                        `Found EQUAL path to ${v}! Add Ways[${u}] (${ways[u]}) to Ways[${v}]. New Ways[${v}] = ${ways[v]}.`,
                        u, v, 'accumulate'
                    );
                } else {
                    addStep(
                        `Path to ${v} (${newDist}) is longer than existing (${dist[v]}). Ignore.`,
                        u, v, 'ignore'
                    );
                }
            }
        }

        addStep("Queue is empty. Algorithm Finished.", null, null);
        return { steps, adj };
    }, []); // Run once on mount

    const currentStep = simulation.steps[stepIndex];
    const adjList = simulation.adj;

    // --- Controls ---
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPlaying && stepIndex < simulation.steps.length - 1) {
            timer = setTimeout(() => setStepIndex(prev => prev + 1), 1500);
        } else {
            setIsPlaying(false);
        }
        return () => clearTimeout(timer);
    }, [isPlaying, stepIndex, simulation.steps.length]);

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">1976. Number of Ways to Arrive at Destination</h1>
                        <p className="text-slate-500">Modified Dijkstra's Algorithm Visualization</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setStepIndex(0)} className="p-2 hover:bg-slate-200 rounded"><RotateCcw size={20} /></button>
                        <button onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} className="p-2 hover:bg-slate-200 rounded"><SkipBack size={20} /></button>
                        <button onClick={() => setIsPlaying(!isPlaying)} className={`p-2 rounded flex gap-2 items-center font-bold text-white ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {isPlaying ? 'Pause' : 'Play'} <Play size={16} fill="currentColor" />
                        </button>
                        <button onClick={() => setStepIndex(Math.min(simulation.steps.length - 1, stepIndex + 1))} className="p-2 hover:bg-slate-200 rounded"><SkipForward size={20} /></button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT: Graph Visualization */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-[500px] relative">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Graph Topology</h3>

                        <svg width="100%" height="100%" viewBox="0 0 600 350">
                            <defs>
                                <marker id="arrow" markerWidth="10" markerHeight="10" refX="22" refY="3" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                                </marker>
                            </defs>

                            {/* Edges */}
                            {roads.map((road, i) => {
                                const u = road[0];
                                const v = road[1];
                                const w = road[2];
                                const start = NODE_POSITIONS[u];
                                const end = NODE_POSITIONS[v];

                                // Check if this edge is active in the current step
                                const isActive = (currentStep.activeNode === u && currentStep.activeNeighbor === v) ||
                                    (currentStep.activeNode === v && currentStep.activeNeighbor === u);

                                // Determine color
                                let strokeColor = "#e2e8f0"; // default
                                let strokeWidth = 2;

                                if (isActive) {
                                    strokeWidth = 4;
                                    if (currentStep.highlightType === 'relax') strokeColor = "#22c55e"; // Green
                                    else if (currentStep.highlightType === 'accumulate') strokeColor = "#a855f7"; // Purple
                                    else if (currentStep.highlightType === 'ignore') strokeColor = "#94a3b8"; // Gray
                                    else strokeColor = "#f59e0b"; // Orange (checking)
                                }

                                return (
                                    <g key={i}>
                                        <line
                                            x1={start.x} y1={start.y}
                                            x2={end.x} y2={end.y}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                            className="transition-all duration-300"
                                        />
                                        {/* Weight Label */}
                                        <g transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2})`}>
                                            <rect x="-10" y="-10" width="20" height="20" fill="white" rx="4" />
                                            <text textAnchor="middle" dy="4" fontSize="12" fontWeight="bold" fill="#64748b">{w}</text>
                                        </g>
                                    </g>
                                );
                            })}

                            {/* Nodes */}
                            {NODE_POSITIONS.map((pos, id) => {
                                const isProcessed = currentStep.processed[id];
                                const isActive = currentStep.activeNode === id;
                                const isNeighbor = currentStep.activeNeighbor === id;

                                let fill = "#fff";
                                let stroke = isProcessed ? "#334155" : "#cbd5e1";
                                let strokeWidth = 2;

                                if (isActive) {
                                    fill = "#eff6ff";
                                    stroke = "#3b82f6";
                                    strokeWidth = 3;
                                } else if (isNeighbor) {
                                    fill = "#fff7ed";
                                    stroke = "#f59e0b";
                                    strokeWidth = 3;
                                }

                                return (
                                    <g key={id} className="transition-all duration-500">
                                        <circle cx={pos.x} cy={pos.y} r="20" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                                        <text x={pos.x} y={pos.y} dy="5" textAnchor="middle" fontWeight="bold" fill={isActive ? "#1d4ed8" : "#334155"}>{id}</text>

                                        {/* Dist / Ways Badge */}
                                        <g transform={`translate(${pos.x}, ${pos.y + 35})`}>
                                            <rect x="-35" y="-10" width="70" height="34" rx="4" fill="white" stroke="#e2e8f0" fillOpacity="0.9" />
                                            <text textAnchor="middle" fontSize="10" fill="#64748b" dy="0">
                                                Dist: {currentStep.dist[id] === Infinity ? '∞' : currentStep.dist[id]}
                                            </text>
                                            <text textAnchor="middle" fontSize="10" fill="#64748b" dy="12">
                                                Ways: {currentStep.ways[id]}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Legend */}
                        <div className="absolute top-4 right-4 bg-white/90 p-2 border border-slate-100 rounded text-xs space-y-1 shadow-sm">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-blue-500"></div> Active Node</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-orange-500"></div> Neighbor</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500"></div> New Shortest Path</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500"></div> Equal Path (Add Ways)</div>
                        </div>
                    </div>

                    {/* RIGHT: Data Tables */}
                    <div className="space-y-4">

                        {/* Current Step Description */}
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-900 text-sm leading-relaxed min-h-[100px] flex items-center">
                            <div>
                                <span className="font-bold uppercase text-xs text-blue-400 block mb-1">Step {stepIndex + 1} of {simulation.steps.length}</span>
                                {currentStep.description}
                            </div>
                        </div>

                        {/* Priority Queue State */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                Priority Queue (Sorted by Time)
                            </div>
                            <div className="p-2 space-y-1 max-h-[150px] overflow-y-auto">
                                {currentStep.pq.length === 0 && <div className="text-slate-400 text-sm text-center italic p-2">Empty</div>}
                                {currentStep.pq.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm border border-slate-100">
                                        <span className="font-mono font-bold text-slate-700">Node {item.node}</span>
                                        <span className="bg-slate-200 px-2 py-0.5 rounded text-xs text-slate-600">Time: {item.dist}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dist/Ways Table */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase grid grid-cols-3">
                                <span>Node</span>
                                <span>Min Dist</span>
                                <span>Ways</span>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto">
                                {currentStep.dist.map((d, i) => {
                                    const isTarget = i === currentStep.activeNeighbor;
                                    const isSrc = i === currentStep.activeNode;
                                    let rowBg = "bg-white";
                                    if (isSrc) rowBg = "bg-blue-50";
                                    if (isTarget) rowBg = "bg-orange-50";

                                    return (
                                        <div key={i} className={`grid grid-cols-3 px-4 py-2 text-sm border-b border-slate-50 ${rowBg}`}>
                                            <span className="font-bold">{i}</span>
                                            <span className="font-mono text-slate-600">{d === Infinity ? '∞' : d}</span>
                                            <span className="font-mono text-slate-600">{currentStep.ways[i]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                </div>

                {/* Algorithm Reference Code */}
                <div className="bg-slate-900 text-slate-300 p-6 rounded-xl font-mono text-xs md:text-sm overflow-x-auto">
                    <h3 className="text-white font-bold mb-4">Core Logic Reference (Java)</h3>
                    <pre>{`// When checking neighbor 'nextNode' with edge weight 'time':

if (dist[node] + time < dist[nextNode]) {
    // Case 1: Found a strictly faster path
    dist[nextNode] = dist[node] + time;
    ways[nextNode] = ways[node];       // Inherit ways
    pq.offer(new long[]{dist[nextNode], nextNode});
} 
else if (dist[node] + time == dist[nextNode]) {
    // Case 2: Found another path with same duration
    ways[nextNode] = (ways[nextNode] + ways[node]) % MOD;
    // Don't push to PQ (already processed/in queue)
}`}</pre>
                </div>

            </div>
        </div>
    );
}