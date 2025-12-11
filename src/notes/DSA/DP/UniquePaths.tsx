import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Pause, ChevronRight, Grid, ArrowDown, ArrowRight, CornerDownRight } from 'lucide-react';

export default function UniquePathsDPExplainer() {
    // --- Configuration State ---
    const [m, setM] = useState(3);
    const [n, setN] = useState(7);

    // --- Animation State ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentCell, setCurrentCell] = useState<{ r: number, c: number } | null>(null);
    const [filledCells, setFilledCells] = useState<Set<string>>(new Set());
    const [dpValues, setDpValues] = useState<number[][]>([]);

    // --- Ref for Animation Interval ---
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // --- Logic Initialization ---
    useEffect(() => {
        resetSimulation();
    }, [m, n]);

    const resetSimulation = () => {
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setCurrentCell(null);

        // Initialize DP table logic immediately for values, 
        // but visual 'filled' state starts empty
        const newDp = Array(m).fill(0).map(() => Array(n).fill(0));

        // Pre-calculate all values so we can show them when "filled"
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                if (i === 0 || j === 0) newDp[i][j] = 1;
                else newDp[i][j] = newDp[i - 1][j] + newDp[i][j - 1];
            }
        }
        setDpValues(newDp);
        setFilledCells(new Set());
    };

    // --- Animation Step Logic ---
    const nextStep = () => {
        setFilledCells(prev => {
            const newSet = new Set(prev);

            // If nothing filled yet, fill base cases first (Row 0 & Col 0)
            if (newSet.size === 0) {
                for (let i = 0; i < m; i++) newSet.add(`${i},0`);
                for (let j = 0; j < n; j++) newSet.add(`0,${j}`);
                setCurrentCell({ r: 0, c: 0 }); // Conceptually start at top-left
                return newSet;
            }

            // Find next cell to fill: (1,1), (1,2)... (2,1), (2,2)...
            let lastR = 1, lastC = 0;
            if (currentCell && (currentCell.r > 0 || currentCell.c > 0)) {
                lastR = currentCell.r;
                lastC = currentCell.c;
            }

            // Determine next coordinate
            let nextR = lastR;
            let nextC = lastC + 1;

            if (nextC >= n) {
                nextR++;
                nextC = 1;
            }

            if (nextR < m) {
                newSet.add(`${nextR},${nextC}`);
                setCurrentCell({ r: nextR, c: nextC });
                return newSet;
            } else {
                // Finished
                setIsPlaying(false);
                if (timerRef.current) clearInterval(timerRef.current);
                return prev;
            }
        });
    };

    useEffect(() => {
        if (isPlaying) {
            // Base cases fill instantly, then iterate
            if (filledCells.size === 0) {
                nextStep();
            }
            timerRef.current = setInterval(nextStep, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPlaying, filledCells]);


    // --- Helper to determine cell status ---
    const getCellStatus = (r: number, c: number) => {
        const key = `${r},${c}`;
        const isFilled = filledCells.has(key);
        const isCurrent = currentCell?.r === r && currentCell?.c === c;
        const isBaseCase = r === 0 || c === 0;

        // Neighbors contributing to current cell
        const isTopNeighbor = currentCell && r === currentCell.r - 1 && c === currentCell.c;
        const isLeftNeighbor = currentCell && r === currentCell.r && c === currentCell.c - 1;

        return { isFilled, isCurrent, isBaseCase, isTopNeighbor, isLeftNeighbor, value: dpValues[r]?.[c] };
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Unique Paths: Bottom-Up DP</h1>
                        <p className="text-slate-500">Dynamic Programming Approach (Tabulation)</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Rows</label>
                            <input
                                type="number" min="2" max="8"
                                value={m} onChange={e => setM(Math.min(8, Math.max(2, Number(e.target.value))))}
                                className="w-16 p-1 border rounded text-center font-mono"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Cols</label>
                            <input
                                type="number" min="2" max="8"
                                value={n} onChange={e => setN(Math.min(8, Math.max(2, Number(e.target.value))))}
                                className="w-16 p-1 border rounded text-center font-mono"
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`p-2 rounded-full text-white transition-colors ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <button onClick={resetSimulation} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* LEFT: The Grid Visualization */}
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-auto">
                            <div
                                className="grid gap-2 mx-auto w-fit"
                                style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                            >
                                {dpValues.length > 0 && Array.from({ length: m }).map((_, r) => (
                                    Array.from({ length: n }).map((_, c) => {
                                        const status = getCellStatus(r, c);
                                        return (
                                            <div
                                                key={`${r}-${c}`}
                                                className={`
                            relative w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center font-mono text-lg font-bold border-2 transition-all duration-300
                            ${status.isCurrent ? 'border-blue-500 bg-blue-50 scale-110 z-10 shadow-lg' : ''}
                            ${status.isTopNeighbor ? 'border-green-300 bg-green-50' : ''}
                            ${status.isLeftNeighbor ? 'border-orange-300 bg-orange-50' : ''}
                            ${status.isBaseCase && status.isFilled && !status.isTopNeighbor && !status.isLeftNeighbor ? 'border-slate-200 bg-slate-100 text-slate-400' : ''}
                            ${!status.isFilled ? 'border-slate-100 bg-white text-transparent' : ''}
                            ${status.isFilled && !status.isCurrent && !status.isBaseCase && !status.isTopNeighbor && !status.isLeftNeighbor ? 'border-indigo-100 bg-indigo-50 text-indigo-900' : ''}
                          `}
                                            >
                                                {status.isFilled ? status.value : 0}

                                                {/* Arrows indicating flow */}
                                                {status.isCurrent && (
                                                    <>
                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-green-500 animate-bounce">
                                                            <ArrowDown size={16} />
                                                        </div>
                                                        <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-orange-500 animate-pulse">
                                                            <ArrowRight size={16} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="mt-6 flex flex-wrap gap-4 text-xs justify-center text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div> Base Case (1)
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-50 border border-blue-500 rounded"></div> Current Calculation
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-50 border border-green-300 rounded"></div> Top Neighbor
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-orange-50 border border-orange-300 rounded"></div> Left Neighbor
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Explanation & Code */}
                    <div className="space-y-6">

                        {/* Calculation Card */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[160px] flex flex-col justify-center">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <Grid size={16} /> Current Operation
                            </h3>

                            {currentCell && currentCell.r > 0 && currentCell.c > 0 ? (
                                <div className="flex items-center justify-around text-center">
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                        <div className="text-xs text-green-700 font-bold mb-1">dp[{currentCell.r - 1}][{currentCell.c}]</div>
                                        <div className="text-2xl font-mono text-green-800">{dpValues[currentCell.r - 1][currentCell.c]}</div>
                                    </div>

                                    <div className="text-2xl font-bold text-slate-300">+</div>

                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                        <div className="text-xs text-orange-700 font-bold mb-1">dp[{currentCell.r}][{currentCell.c - 1}]</div>
                                        <div className="text-2xl font-mono text-orange-800">{dpValues[currentCell.r][currentCell.c - 1]}</div>
                                    </div>

                                    <div className="text-2xl font-bold text-slate-800"><ArrowRight /></div>

                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-500 shadow-md transform scale-110">
                                        <div className="text-xs text-blue-700 font-bold mb-1">dp[{currentCell.r}][{currentCell.c}]</div>
                                        <div className="text-3xl font-mono text-blue-900 font-bold">{dpValues[currentCell.r][currentCell.c]}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 italic">
                                    {filledCells.size === 0 ? "Press Play to Start" : "Initializing Base Cases (1)..."}
                                </div>
                            )}
                        </div>

                        {/* Code Snippet */}
                        <div className="bg-slate-900 rounded-xl p-4 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full opacity-20"></div>
                            <pre className="text-sm font-mono text-slate-300 leading-relaxed">
                                {`// 1. Fill Base Cases
for(int i=0; i<m; i++) dp[i][0] = 1;
for(int j=0; j<n; j++) dp[0][j] = 1;

// 2. Fill Rest
for(int i=1; i<m; i++) {
  for(int j=1; j<n; j++) {
`}
                                <span className={`${currentCell && currentCell.r > 0 ? 'bg-blue-900/50 text-white font-bold block -mx-4 px-4 border-l-2 border-blue-500' : ''}`}>
                                    {`    dp[i][j] = dp[i-1][j] + dp[i][j-1];`}
                                </span>
                                {`  }
}

return dp[m-1][n-1];`}
                            </pre>
                        </div>

                        <div className="bg-indigo-50 text-indigo-900 p-4 rounded-lg text-sm border border-indigo-100">
                            <strong>Why this works:</strong> To arrive at cell <code>(i, j)</code>, you could have come from <strong>Top</strong> (moving Down) or from <strong>Left</strong> (moving Right). Therefore, total unique paths to here is simply the sum of paths to those two previous cells.
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}