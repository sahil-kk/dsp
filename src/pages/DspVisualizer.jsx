import { useState } from "react";
import Plot from "react-plotly.js";
import { create, all } from "mathjs";
import { BackgroundBeams } from "../components/ui/BackgroundBeams";


const math = create(all);

math.import(
    {
        u: (t) => (t >= 0 ? 1 : 0),
        r: (t) => (t >= 0 ? t : 0),
        delta: (t) => (Math.abs(t) < 0.01 ? 1 : 0),
    },
    { override: true }
);

function formatSymbolicConvolution(tConv, result) {
    const terms = [];

    for (let i = 0; i < result.length; i++) {
        const coeff = parseFloat(result[i].toFixed(2));
        const t = parseFloat(tConv[i].toFixed(2));
        if (Math.abs(coeff) < 0.05) continue;

        const shift = t === 0 ? "t" : `t - ${t}`;
        const symbol = t >= 0 ? "r" : "u"; // Heuristic: use ramp for t >= 0, step otherwise
        terms.push(`${coeff}${symbol}(${shift})`);
    }

    return terms.join(" + ");
}

function symbolicConvolution(input1, input2, tMin, tMax) {
    const coarseDt = 1;
    const coarseRange = Array.from(
        { length: Math.ceil((tMax - tMin) / coarseDt) + 1 },
        (_, i) => tMin + i * coarseDt
    );

    const compile = (expr) => math.parse(expr).compile();

    const evalExpr = (compiled, tRange) =>
        tRange.map((t) => compiled.evaluate({ t }));

    const y1 = evalExpr(compile(input1), coarseRange);
    const y2 = evalExpr(compile(input2), coarseRange);

    const result = new Array(y1.length + y2.length - 1).fill(0);

    for (let i = 0; i < y1.length; i++) {
        for (let j = 0; j < y2.length; j++) {
            result[i + j] += y1[i] * y2[j]; // No dt here (dt = 1)
        }
    }

    const tConv = Array.from(
        { length: result.length },
        (_, i) => 2 * tMin + i * coarseDt
    );

    return formatSymbolicConvolution(tConv, result);
}

export default function DspVisualizer() {
    const [input1, setInput1] = useState("3*u(t) - u(t-2)");
    const [input2, setInput2] = useState("u(t-1) - u(t-2)");
    const [x1, setX1] = useState([]);
    const [y1, setY1] = useState([]);
    const [x2, setX2] = useState([]);
    const [y2, setY2] = useState([]);
    const [xConv, setXConv] = useState([]);
    const [yConv, setYConv] = useState([]);
    const [convolutionExpr, setConvolutionExpr] = useState("");

    const tMin = -5, tMax = 10, dt = .09;
    const tRange = Array.from({ length: Math.ceil((tMax - tMin) / dt) + 1 }, (_, i) => tMin + i * dt);

    const evaluateExpression = (expr) => {
        const node = math.parse(expr);
        const compiled = node.compile();
        return tRange.map((t) => compiled.evaluate({ t }));
    };


    const plotSignal = () => {
        try {
            setX1(tRange);
            setY1(evaluateExpression(input1));
            setX2(tRange);
            setY2(evaluateExpression(input2));
            setXConv([]);
            setYConv([]);
            setConvolutionExpr("");
        } catch (err) {
            alert("Invalid input:\n" + err.message);
        }
    };

    const handleConvolve = () => {
        const yA = evaluateExpression(input1);
        const yB = evaluateExpression(input2);
        const result = new Array(yA.length + yB.length - 1).fill(0);

        for (let i = 0; i < yA.length; i++) {
            for (let j = 0; j < yB.length; j++) {
                result[i + j] += yA[i] * yB[j] * dt;
            }
        }

        const tConv = Array.from({ length: result.length }, (_, i) => 2 * tRange[0] + i * dt);
        setXConv(tConv);
        setYConv(result);

        const expr = symbolicConvolution(input1, input2, tMin, tMax);
        setConvolutionExpr(expr);
    };

    const plotLayout = (title, isResult = false, xData = [], yData = [], sharedYRange = null) => {
        const xMin = Math.floor(Math.min(...xData));
        const xMax = Math.ceil(Math.max(...xData));

        const yMinRaw = sharedYRange ? sharedYRange.min : Math.min(...yData);
        const yMaxRaw = sharedYRange ? sharedYRange.max : Math.max(...yData);

        let yMaxTick;
        if (yMaxRaw <= 10) {
            yMaxTick = Math.ceil(yMaxRaw) + 1;
        } else {
            yMaxTick = Math.ceil(yMaxRaw) + 1;
            if (yMaxTick % 2 !== 0) yMaxTick += 1;
        }

        const yMin = Math.floor(yMinRaw);

        const dynamicTickStep = (range) => {
            if (range <= 10) return 1;
            if (range <= 25) return 2;
            if (range <= 50) return 5;
            return 10;
        };

        const xStep = dynamicTickStep(xMax - xMin);
        const yStep = dynamicTickStep(yMaxTick - yMin);

        const xTicks = Array.from(
            { length: Math.floor((xMax - xMin) / xStep) + 1 },
            (_, i) => xMin + i * xStep
        );

        const yTicks = Array.from(
            { length: Math.floor((yMaxTick - yMin) / yStep) + 1 },
            (_, i) => yMin + i * yStep
        );

        return {
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#e0e0e0" },
            title,
            xaxis: { visible: false },
            yaxis: { visible: false },
            shapes: [
                { type: "line", x0: xMin, x1: xMax, y0: 0, y1: 0, line: { color: "#ffffff", width: 2 }, layer: "below" },
                { type: "line", x0: 0, x1: 0, y0: yMin, y1: yMaxTick, line: { color: "#ffffff", width: 2 }, layer: "below" },
            ],
            annotations: [
                ...xTicks.map(t => ({
                    x: t, y: 0, text: String(t),
                    showarrow: false, yshift: 15, font: { color: "#aaa" }
                })),
                ...yTicks.map(t => ({
                    x: 0, y: t, text: String(t),
                    showarrow: false, xshift: -15, font: { color: "#aaa" }
                })),
            ],
            width: isResult ? 1000 : 480,
            height: isResult ? 500 : 400,
            margin: { l: 50, r: 20, t: 40, b: 50 },
        };
    };
    const sharedYMin = Math.min(...y1, ...y2);
    const sharedYMax = Math.max(...y1, ...y2);
    const sharedYRange = { min: sharedYMin, max: sharedYMax };
    return (
        <div className="relative w-full min-h-screen overflow-hidden bg-neutral-900 text-white font-sans">
            <BackgroundBeams className="z-auto" />
            <div className="relative z-10 flex flex-col items-center justify-center py-16 px-4">
                <h1 className="text-4xl md:text-5xl font-bold font-mono text-white mb-6 text-center">
                    Visualize the Convolution
                </h1>

                <div className="flex flex-col sm:flex-row gap-4 mt-4 items-center">
                    <input
                        type="text"
                        value={input1}
                        onChange={(e) => setInput1(e.target.value)}
                        placeholder="Signal 1"
                        className="px-4 py-2 rounded-md bg-slate-800 text-white border border-cyan-500 w-80"
                    />
                    <input
                        type="text"
                        value={input2}
                        onChange={(e) => setInput2(e.target.value)}
                        placeholder="Signal 2"
                        className="px-4 py-2 rounded-md bg-slate-800 text-white border border-green-500 w-80"
                    />
                    <button
                        onClick={plotSignal}
                        className="px-6 py-2 rounded-md bg-cyan-500 hover:text-cyan-400 hover:bg-gray-800 font-mono font-semibold"
                    >
                        Plot
                    </button>
                    <button
                        onClick={handleConvolve}
                        className="px-6 py-2 rounded-md bg-pink-500 hover:text-pink-300 hover:bg-gray-800 font-mono font-semibold"
                    >
                        Convolute
                    </button>
                </div>

                {x1.length > 0 && y1.length > 0 && x2.length > 0 && y2.length > 0 && (
                    <div className="mt-10 w-full flex justify-center gap-8 flex-wrap">
                        <Plot data={[{ x: x1, y: y1, type: "scatter", mode: "lines", line: { shape: "hv", color: "red", width: 4 } }]} layout={plotLayout("Signal 1", false, x1, y1, sharedYRange)} config={{ displayModeBar: false }} />
                        <Plot data={[{ x: x2, y: y2, type: "scatter", mode: "lines", line: { shape: "hv", color: "green", width: 4 } }]} layout={plotLayout("Signal 2", false, x2, y2, sharedYRange)} config={{ displayModeBar: false }} />
                    </div>
                )}

                {xConv.length > 0 && yConv.length > 0 && (
                    <>
                        <div className="mt-12 w-full flex justify-center">
                            <Plot data={[{ x: xConv, y: yConv, type: "scatter", mode: "lines", line: { color: "#66ccff", width: 4 } }]} layout={plotLayout("Result of Convolution", true, xConv, yConv)} config={{ displayModeBar: false }} />

                        </div>

                        <div className="mt-6 text-center bg-cyan-950 rounded-2xl text-lg text-cyan-200 font-mono px-6 h-28 max-w-5xl">
                            {convolutionExpr && (
                                <div>
                                    <span className="text-white  "><br/> y(t) ≈ </span>{convolutionExpr}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}