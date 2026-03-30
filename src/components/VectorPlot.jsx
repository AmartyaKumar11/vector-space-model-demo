import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

function normalize(vec) {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

function dotProduct(vecA, vecB) {
  const length = Math.min(vecA.length, vecB.length);
  let sum = 0;

  for (let i = 0; i < length; i += 1) {
    sum += vecA[i] * vecB[i];
  }

  return sum;
}

function magnitude(vec) {
  return Math.sqrt(dotProduct(vec, vec));
}

function computeAngle(vecA, vecB) {
  const dot = dotProduct(vecA, vecB);
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  const cosTheta = dot / (magA * magB);
  const angleRad = Math.acos(Math.min(1, Math.max(-1, cosTheta)));
  return angleRad * (180 / Math.PI);
}

function describeArcPath(origin, startAngle, endAngle, radius) {
  let diff = endAngle - startAngle;

  while (diff <= -Math.PI) {
    diff += 2 * Math.PI;
  }

  while (diff > Math.PI) {
    diff -= 2 * Math.PI;
  }

  const startX = origin.x + radius * Math.cos(startAngle);
  const startY = origin.y - radius * Math.sin(startAngle);
  const endX = origin.x + radius * Math.cos(endAngle);
  const endY = origin.y - radius * Math.sin(endAngle);

  const largeArcFlag = Math.abs(diff) > Math.PI ? 1 : 0;
  const sweepFlag = diff >= 0 ? 0 : 1;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
}

function clampDomain(min, max, minAllowed = -1, maxAllowed = 1) {
  let nextMin = min;
  let nextMax = max;
  const width = nextMax - nextMin;

  if (nextMin < minAllowed) {
    nextMax += minAllowed - nextMin;
    nextMin = minAllowed;
  }

  if (nextMax > maxAllowed) {
    nextMin -= nextMax - maxAllowed;
    nextMax = maxAllowed;
  }

  nextMin = Math.max(minAllowed, nextMin);
  nextMax = Math.min(maxAllowed, nextMax);

  if (nextMax - nextMin < width) {
    nextMax = Math.min(maxAllowed, nextMin + width);
    nextMin = Math.max(minAllowed, nextMax - width);
  }

  return [nextMin, nextMax];
}

function vectorToPoint(label, vector, type, index = -1, xIndex = 0, yIndex = 1, xTerm = "x", yTerm = "y") {
  const normalizedVector = normalize(Array.isArray(vector) ? vector : []);
  const x = Number(normalizedVector[xIndex] ?? 0);
  const y = Number(normalizedVector[yIndex] ?? 0);

  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;

  const docPalette = ["#f97316", "#22c55e", "#a78bfa", "#06b6d4", "#f43f5e", "#eab308"];
  const color = type === "query" ? "#3b82f6" : docPalette[Math.max(0, index) % docPalette.length];

  return {
    x: safeX,
    y: safeY,
    label,
    type,
    index,
    color,
    size: type === "query" ? 180 : 110,
    dimensions: {
      [xTerm]: Number.isFinite(x) ? x : 0,
      [yTerm]: Number.isFinite(y) ? y : 0,
    },
  };
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="font-semibold text-white">{point.label}</p>
      <p className="mt-1 font-mono text-slate-300">x: {point.x.toFixed(3)}</p>
      <p className="font-mono text-slate-300">y: {point.y.toFixed(3)}</p>
      {point.dimensions && (
        <>
          <p className="mt-1 font-mono text-slate-300">
            {Object.keys(point.dimensions)[0]}: {Object.values(point.dimensions)[0].toFixed(3)}
          </p>
          <p className="font-mono text-slate-300">
            {Object.keys(point.dimensions)[1]}: {Object.values(point.dimensions)[1].toFixed(3)}
          </p>
        </>
      )}
    </div>
  );
}

export default function VectorPlot({ docVectors, queryVector, docLabels, vocabulary = [] }) {
  const [lineProgress, setLineProgress] = useState(0);
  const [selectedVector, setSelectedVector] = useState(null);
  const [selectedBaseVector, setSelectedBaseVector] = useState(null);
  const [selectedXDim, setSelectedXDim] = useState(null);
  const [selectedYDim, setSelectedYDim] = useState(null);
  const [xDomain, setXDomain] = useState([-1, 1]);
  const [yDomain, setYDomain] = useState([-1, 1]);
  const [isPanning, setIsPanning] = useState(false);
  const baseContainerRef = useRef(null);
  const containerRef = useRef(null);
  const panRef = useRef({ active: false, x: 0, y: 0 });
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [baseChartSize, setBaseChartSize] = useState({ width: 0, height: 0 });

  const chartMargin = useMemo(() => ({ top: 12, right: 16, left: 12, bottom: 8 }), []);
  const baseChartMargin = useMemo(() => ({ top: 12, right: 16, left: 12, bottom: 8 }), []);

  useEffect(() => {
    if (!vocabulary.length) {
      setSelectedXDim(null);
      setSelectedYDim(null);
      return;
    }

    setSelectedXDim((current) => (current && vocabulary.includes(current) ? current : vocabulary[0]));
    setSelectedYDim((current) => {
      if (current && vocabulary.includes(current)) {
        return current;
      }

      return vocabulary[1] || vocabulary[0];
    });
  }, [vocabulary]);

  const xIndex = useMemo(() => {
    if (!selectedXDim) {
      return 0;
    }

    const index = vocabulary.indexOf(selectedXDim);
    return index >= 0 ? index : 0;
  }, [selectedXDim, vocabulary]);

  const yIndex = useMemo(() => {
    if (!selectedYDim) {
      return vocabulary.length > 1 ? 1 : 0;
    }

    const index = vocabulary.indexOf(selectedYDim);
    return index >= 0 ? index : vocabulary.length > 1 ? 1 : 0;
  }, [selectedYDim, vocabulary]);

  const xLabel = selectedXDim || "Dimension X";
  const yLabel = selectedYDim || "Dimension Y";
  const baseXLabel = vocabulary[0] || "Dimension 1";
  const baseYLabel = vocabulary[1] || vocabulary[0] || "Dimension 2";

  const basePlotData = useMemo(
    () => [
      ...docVectors.map((vector, index) =>
        vectorToPoint(
          docLabels[index] || `Doc${index + 1}`,
          vector,
          "doc",
          index,
          0,
          vocabulary.length > 1 ? 1 : 0,
          baseXLabel,
          baseYLabel,
        ),
      ),
      vectorToPoint("Query", queryVector, "query", -1, 0, vocabulary.length > 1 ? 1 : 0, baseXLabel, baseYLabel),
    ],
    [docVectors, queryVector, docLabels, vocabulary.length, baseXLabel, baseYLabel],
  );

  const plotData = useMemo(
    () => [
      ...docVectors.map((vector, index) =>
        vectorToPoint(
          docLabels[index] || `Doc${index + 1}`,
          vector,
          "doc",
          index,
          xIndex,
          yIndex,
          xLabel,
          yLabel,
        ),
      ),
      vectorToPoint("Query", queryVector, "query", -1, xIndex, yIndex, xLabel, yLabel),
    ],
    [docVectors, queryVector, docLabels, xIndex, yIndex, xLabel, yLabel],
  );

  const docPoints = useMemo(() => plotData.filter((point) => point.type === "doc"), [plotData]);
  const queryPoint = useMemo(() => plotData.find((point) => point.type === "query") || null, [plotData]);
  const baseDocPoints = useMemo(() => basePlotData.filter((point) => point.type === "doc"), [basePlotData]);
  const baseQueryPoint = useMemo(
    () => basePlotData.find((point) => point.type === "query") || null,
    [basePlotData],
  );

  useEffect(() => {
    if (!docPoints.length) {
      setSelectedVector(null);
      return;
    }

    setSelectedVector((current) => {
      return docPoints.some((point) => point.label === current) ? current : null;
    });
  }, [docPoints]);

  useEffect(() => {
    if (!baseDocPoints.length) {
      setSelectedBaseVector(null);
      return;
    }

    setSelectedBaseVector((current) => {
      return baseDocPoints.some((point) => point.label === current) ? current : null;
    });
  }, [baseDocPoints]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!baseContainerRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBaseChartSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(baseContainerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frameId;
    let start;
    const duration = 450;

    setLineProgress(0);

    const animate = (timestamp) => {
      if (!start) {
        start = timestamp;
      }

      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      setLineProgress(progress);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [plotData]);

  const selectedPoint = docPoints.find((point) => point.label === selectedVector) || null;
  const selectedBasePoint = baseDocPoints.find((point) => point.label === selectedBaseVector) || null;
  const selectedRawVector = selectedPoint && selectedPoint.index >= 0 ? docVectors[selectedPoint.index] : null;
  const selectedBaseRawVector =
    selectedBasePoint && selectedBasePoint.index >= 0 ? docVectors[selectedBasePoint.index] : null;
  const angle = selectedRawVector ? computeAngle(selectedRawVector, queryVector) : 0;
  const baseAngle = selectedBaseRawVector ? computeAngle(selectedBaseRawVector, queryVector) : 0;

  const zoomLevel = 2 / Math.max(0.0001, xDomain[1] - xDomain[0]);

  const plotWidth = Math.max(0, chartSize.width - chartMargin.left - chartMargin.right);
  const plotHeight = Math.max(0, chartSize.height - chartMargin.top - chartMargin.bottom);
  const basePlotWidth = Math.max(0, baseChartSize.width - baseChartMargin.left - baseChartMargin.right);
  const basePlotHeight = Math.max(0, baseChartSize.height - baseChartMargin.top - baseChartMargin.bottom);

  const toPixelX = (value) =>
    chartMargin.left + ((value - xDomain[0]) / Math.max(0.0001, xDomain[1] - xDomain[0])) * plotWidth;
  const toPixelY = (value) =>
    chartMargin.top + (1 - (value - yDomain[0]) / Math.max(0.0001, yDomain[1] - yDomain[0])) * plotHeight;

  const origin = {
    x: toPixelX(0),
    y: toPixelY(0),
  };

  const baseToPixelX = (value) =>
    baseChartMargin.left + ((value + 1) / 2) * basePlotWidth;
  const baseToPixelY = (value) =>
    baseChartMargin.top + (1 - (value + 1) / 2) * basePlotHeight;

  const baseOrigin = {
    x: baseToPixelX(0),
    y: baseToPixelY(0),
  };

  const arcRadius = Math.max(24, Math.min(52, Math.min(plotWidth, plotHeight) * 0.11));

  const unselectedDocs = docPoints.filter((point) => point.label !== selectedVector);
  const unselectedBaseDocs = baseDocPoints.filter((point) => point.label !== selectedBaseVector);
  const orderedVectors = [
    ...unselectedDocs,
    ...(queryPoint ? [queryPoint] : []),
    ...(selectedPoint ? [selectedPoint] : []),
  ];
  const orderedBaseVectors = [
    ...unselectedBaseDocs,
    ...(baseQueryPoint ? [baseQueryPoint] : []),
    ...(selectedBasePoint ? [selectedBasePoint] : []),
  ];

  const arcPath =
    selectedPoint && queryPoint
      ? describeArcPath(
          origin,
          Math.atan2(selectedPoint.y, selectedPoint.x),
          Math.atan2(queryPoint.y, queryPoint.x),
          arcRadius,
        )
      : null;

  const baseArcPath =
    selectedBasePoint && baseQueryPoint
      ? describeArcPath(
          baseOrigin,
          Math.atan2(selectedBasePoint.y, selectedBasePoint.x),
          Math.atan2(baseQueryPoint.y, baseQueryPoint.x),
          26,
        )
      : null;

  const handleWheelZoom = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!containerRef.current || plotWidth <= 0 || plotHeight <= 0) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const tx = Math.min(1, Math.max(0, (mouseX - chartMargin.left) / plotWidth));
    const ty = Math.min(1, Math.max(0, (mouseY - chartMargin.top) / plotHeight));

    const xRange = xDomain[1] - xDomain[0];
    const yRange = yDomain[1] - yDomain[0];
    const dataX = xDomain[0] + tx * xRange;
    const dataY = yDomain[1] - ty * yRange;

    const zoomFactor = event.deltaY < 0 ? 0.86 : 1.16;
    const nextXRange = Math.min(2, Math.max(0.02, xRange * zoomFactor));
    const nextYRange = Math.min(2, Math.max(0.02, yRange * zoomFactor));

    const nextXMin = dataX - tx * nextXRange;
    const nextXMax = nextXMin + nextXRange;

    const nextYMax = dataY + ty * nextYRange;
    const nextYMin = nextYMax - nextYRange;

    setXDomain(clampDomain(nextXMin, nextXMax));
    setYDomain(clampDomain(nextYMin, nextYMax));
  };

  const handleWheelCapture = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePanStart = (event) => {
    if (event.button !== 0) {
      return;
    }

    // When clicking vector points, selection should win over panning.
    if (event.target?.closest?.("[data-vector-point='true']")) {
      return;
    }

    panRef.current = { active: true, x: event.clientX, y: event.clientY };
    setIsPanning(true);
  };

  const handlePanMove = (event) => {
    if (!panRef.current.active || !containerRef.current || plotWidth <= 0 || plotHeight <= 0) {
      return;
    }

    const dx = event.clientX - panRef.current.x;
    const dy = event.clientY - panRef.current.y;
    panRef.current.x = event.clientX;
    panRef.current.y = event.clientY;

    const xRange = xDomain[1] - xDomain[0];
    const yRange = yDomain[1] - yDomain[0];
    const shiftX = -(dx / plotWidth) * xRange;
    const shiftY = (dy / plotHeight) * yRange;

    setXDomain(([min, max]) => clampDomain(min + shiftX, max + shiftX));
    setYDomain(([min, max]) => clampDomain(min + shiftY, max + shiftY));
  };

  const handlePanEnd = () => {
    panRef.current.active = false;
    setIsPanning(false);
  };

  return (
    <motion.section
      className="panel-card"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <h3 className="panel-title">Vector Projection (2D)</h3>
      <p className="panel-subtitle">Projection on the first two dimensions of the vector space.</p>
      {selectedPoint && (
        <motion.p
          className="mt-2 text-xs text-slate-200"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          Angle with Query ({selectedPoint.label}): {angle.toFixed(2)} degrees
        </motion.p>
      )}
      {!selectedPoint && (
        <p className="mt-2 text-xs text-slate-300">Click a document vector to show its angle with Query.</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-300">Select doc:</span>
        {docPoints.map((point) => {
          const isActive = point.label === selectedVector;

          return (
            <button
              key={`interactive-select-${point.label}`}
              type="button"
              onClick={() => setSelectedVector(point.label)}
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs text-white transition"
              style={{
                backgroundColor: point.color,
                borderColor: isActive ? "#f8fafc" : "rgba(248,250,252,0.35)",
                boxShadow: isActive ? `0 0 0 2px ${point.color}66` : "none",
                opacity: isActive ? 1 : 0.84,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "#ffffff", opacity: 0.9 }}
              />
              {point.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <p className="text-xs font-semibold text-slate-100">Original Projection (Complete Vectors)</p>
        <p className="mt-1 text-xs text-slate-300">
          This plot uses the first two dimensions of the full vectors to preserve the original view.
        </p>
        {selectedBasePoint ? (
          <p className="mt-1 text-xs text-slate-200">
            Angle with Query ({selectedBasePoint.label}): {baseAngle.toFixed(2)} degrees
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-300">Click a document vector to show its angle in the original plot.</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-300">Select doc:</span>
          {baseDocPoints.map((point) => {
            const isActive = point.label === selectedBaseVector;

            return (
              <button
                key={`base-select-${point.label}`}
                type="button"
                onClick={() => setSelectedBaseVector(point.label)}
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs text-white transition"
                style={{
                  backgroundColor: point.color,
                  borderColor: isActive ? "#f8fafc" : "rgba(248,250,252,0.35)",
                  boxShadow: isActive ? `0 0 0 2px ${point.color}66` : "none",
                  opacity: isActive ? 1 : 0.84,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "#ffffff", opacity: 0.9 }}
                />
                {point.label}
              </button>
            );
          })}
        </div>

        <div ref={baseContainerRef} className="relative mt-3 h-56 w-full">
          <ResponsiveContainer>
            <ScatterChart margin={baseChartMargin}>
              <CartesianGrid strokeDasharray="4 4" stroke="#334155" strokeOpacity={0.35} />
              <ReferenceLine x={0} stroke="#e2e8f0" strokeWidth={2} strokeOpacity={0.9} />
              <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={2} strokeOpacity={0.9} />
              <XAxis
                type="number"
                dataKey="x"
                domain={[-1, 1]}
                label={{ value: baseXLabel, position: "insideBottom", offset: -2, fill: "#bfdbfe" }}
                axisLine={{ stroke: "#e2e8f0", strokeWidth: 1.6 }}
                tickLine={{ stroke: "#cbd5e1", strokeWidth: 1.2 }}
                tick={{ fill: "#cbd5e1", fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[-1, 1]}
                label={{ value: baseYLabel, angle: -90, position: "insideLeft", fill: "#c4b5fd" }}
                axisLine={{ stroke: "#e2e8f0", strokeWidth: 1.6 }}
                tickLine={{ stroke: "#cbd5e1", strokeWidth: 1.2 }}
                tick={{ fill: "#cbd5e1", fontSize: 12 }}
              />
              <Tooltip cursor={{ strokeDasharray: "4 4" }} content={<CustomTooltip />} />

              {orderedBaseVectors.map((point) => (
                <ReferenceLine
                  key={`base-${point.label}-vector`}
                  segment={[
                    { x: 0, y: 0 },
                    { x: point.x, y: point.y },
                  ]}
                  stroke={point.color}
                  strokeOpacity={point.type === "query" ? 1 : point.label === selectedBaseVector ? 1 : 0.35}
                  strokeWidth={point.type === "query" ? 1.9 : point.label === selectedBaseVector ? 2.4 : 1.2}
                />
              ))}

              {orderedBaseVectors.map((point) => (
                <Scatter
                  key={`base-${point.label}-point`}
                  data={[point]}
                  dataKey="y"
                  fill={point.color}
                  name={point.label}
                  onClick={() => point.type === "doc" && setSelectedBaseVector(point.label)}
                  shape={(props) => {
                    const { cx, cy, payload } = props;
                    const isQuery = payload.type === "query";
                    const isSelected = payload.label === selectedBaseVector;
                    const radius = isQuery ? 7 : isSelected ? 8 : 4.8;

                    return (
                      <g onClick={() => payload.type === "doc" && setSelectedBaseVector(payload.label)}>
                        {isQuery && <circle cx={cx} cy={cy} r={10} fill={payload.color} fillOpacity={0.2} />}
                        {isSelected && !isQuery && <circle cx={cx} cy={cy} r={12} fill={payload.color} fillOpacity={0.28} />}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={radius}
                          fill={payload.color}
                          stroke="#e2e8f0"
                          strokeWidth={isQuery || isSelected ? 1.6 : 1}
                          style={{ cursor: payload.type === "doc" ? "pointer" : "default" }}
                        />
                        {isSelected && !isQuery && (
                          <text
                            x={cx}
                            y={cy - 14}
                            fill="#fde68a"
                            fontSize="11"
                            fontWeight="600"
                            textAnchor="middle"
                          >
                            {baseAngle.toFixed(1)}deg
                          </text>
                        )}
                      </g>
                    );
                  }}
                >
                  <LabelList dataKey="label" position="top" fill="#cbd5e1" fontSize={11} offset={8} />
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {baseArcPath && (
              <path
                d={baseArcPath}
                fill="none"
                stroke="#facc15"
                strokeWidth="1.8"
                strokeDasharray="4 3"
                opacity={selectedBasePoint ? 0.95 : 0}
                style={{ transition: "opacity 250ms ease-in-out" }}
              />
            )}
          </svg>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <p className="text-xs font-semibold text-slate-100">Total Dimensions: {vocabulary.length}</p>
        <p className="mt-1 text-xs text-slate-300">
          Each word represents a dimension. We project high-dimensional vectors into 2D using selected dimensions.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-slate-300">Select X-axis</span>
            <select
              value={selectedXDim || ""}
              onChange={(event) => {
                setSelectedXDim(event.target.value);
                setXDomain([-1, 1]);
                setYDomain([-1, 1]);
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
            >
              {vocabulary.map((term) => (
                <option key={`x-${term}`} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-slate-300">Select Y-axis</span>
            <select
              value={selectedYDim || ""}
              onChange={(event) => {
                setSelectedYDim(event.target.value);
                setXDomain([-1, 1]);
                setYDomain([-1, 1]);
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
            >
              {vocabulary.map((term) => (
                <option key={`y-${term}`} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {vocabulary.map((term, index) => {
            const isX = term === selectedXDim;
            const isY = term === selectedYDim;

            return (
              <span
                key={`dim-${term}`}
                className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                  isX
                    ? "bg-blue-500/20 text-blue-200 ring-blue-400/70"
                    : isY
                      ? "bg-violet-500/20 text-violet-200 ring-violet-400/70"
                      : "bg-slate-800 text-slate-300 ring-slate-600"
                }`}
              >
                {term} -> Dimension {index + 1}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span className="text-slate-200">Wheel: zoom</span>
        <span>Drag: pan</span>
        <span className="font-mono text-slate-200">x{zoomLevel.toFixed(2)}</span>
        <button
          type="button"
          onClick={() => {
            setXDomain([-1, 1]);
            setYDomain([-1, 1]);
          }}
          className="rounded-md border border-slate-600 px-2 py-1 text-slate-200 transition hover:border-blue-400"
        >
          Reset View
        </button>
      </div>

      <div
        ref={containerRef}
        className={`relative mt-4 h-64 w-full select-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        onWheelCapture={handleWheelCapture}
        onWheel={handleWheelZoom}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <ResponsiveContainer>
          <ScatterChart margin={chartMargin}>
            <CartesianGrid strokeDasharray="4 4" stroke="#334155" strokeOpacity={0.35} />
            <ReferenceLine x={0} stroke="#f8fafc" strokeWidth={2.4} strokeOpacity={0.95} />
            <ReferenceLine y={0} stroke="#f8fafc" strokeWidth={2.4} strokeOpacity={0.95} />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              label={{ value: xLabel, position: "insideBottom", offset: -2, fill: "#bfdbfe" }}
              axisLine={{ stroke: "#e2e8f0", strokeWidth: 2 }}
              tickLine={{ stroke: "#cbd5e1", strokeWidth: 1.4 }}
              stroke="#94a3b8"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#c4b5fd" }}
              axisLine={{ stroke: "#e2e8f0", strokeWidth: 2 }}
              tickLine={{ stroke: "#cbd5e1", strokeWidth: 1.4 }}
              stroke="#94a3b8"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
            />
            <ZAxis type="number" dataKey="size" range={[70, 180]} />
            <Tooltip cursor={{ strokeDasharray: "4 4" }} content={<CustomTooltip />} />
            <Legend />
            {orderedVectors.map((point) => (
              <ReferenceLine
                key={`${point.label}-vector`}
                segment={[
                  { x: 0, y: 0 },
                  { x: point.x * lineProgress, y: point.y * lineProgress },
                ]}
                stroke={point.color}
                strokeOpacity={
                  point.type === "query" ? 1 : point.label === selectedVector ? 1 : 0.3
                }
                strokeWidth={
                  point.type === "query" ? 2 : point.label === selectedVector ? 2.6 : 1.2
                }
                ifOverflow="visible"
              />
            ))}
            <Scatter
              data={[{ x: 0, y: 0, label: "Origin", type: "origin", color: "#facc15", size: 95 }]}
              dataKey="y"
              fill="#facc15"
              name="Origin"
              isAnimationActive
              animationDuration={250}
            >
              <LabelList dataKey="label" position="top" fill="#fde68a" fontSize={11} offset={8} />
            </Scatter>
            {orderedVectors.map((point, index) => (
              <Scatter
                key={`${point.label}-point`}
                data={[point]}
                dataKey="y"
                fill={point.color}
                name={point.label}
                isAnimationActive
                animationDuration={380}
                animationBegin={420 + index * 90}
                onClick={() => {
                  if (point.type === "doc") {
                    setSelectedVector(point.label);
                  }
                }}
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  const isQuery = payload.type === "query";
                  const isSelected = payload.label === selectedVector;
                  const showAngleOverDot = isSelected && !isQuery;
                  const radius = isQuery ? 7.5 : isSelected ? 8.5 : 5;

                  return (
                    <g
                      data-vector-point="true"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={() => payload.type === "doc" && setSelectedVector(payload.label)}
                    >
                      {isQuery && <circle cx={cx} cy={cy} r={11} fill={payload.color} fillOpacity={0.25} />}
                      {isSelected && <circle cx={cx} cy={cy} r={13} fill={payload.color} fillOpacity={0.34} />}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={payload.color}
                        stroke="#e2e8f0"
                        strokeWidth={isQuery || isSelected ? 1.8 : 1}
                        style={{ cursor: payload.type === "doc" ? "pointer" : "default" }}
                      />
                      {showAngleOverDot && (
                        <text
                          x={cx}
                          y={cy - 16}
                          fill="#fde68a"
                          fontSize="11"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {angle.toFixed(1)}deg
                        </text>
                      )}
                    </g>
                  );
                }}
              >
                <LabelList dataKey="label" position="top" fill="#cbd5e1" fontSize={11} offset={8} />
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>

        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {arcPath && (
            <g>
              <path
                d={arcPath}
                fill="none"
                stroke="#facc15"
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity={selectedPoint ? 0.95 : 0}
                style={{
                  transition: "opacity 250ms ease-in-out",
                }}
              />
              <text
                x={origin.x + 40}
                y={origin.y - 8}
                fill="#fde68a"
                fontSize="11"
                textAnchor="middle"
                style={{
                  opacity: 0,
                  transition: "opacity 250ms ease-in-out",
                }}
              >
                {angle.toFixed(1)}deg
              </text>
            </g>
          )}
        </svg>
      </div>
    </motion.section>
  );
}
