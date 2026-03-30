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

function vectorToPoint(label, vector, type, index = -1) {
  const normalizedVector = normalize(Array.isArray(vector) ? vector : []);
  const x = Number(normalizedVector[0] ?? 0);
  const y = Number(normalizedVector[1] ?? 0);

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
    </div>
  );
}

export default function VectorPlot({ docVectors, queryVector, docLabels }) {
  const [lineProgress, setLineProgress] = useState(0);
  const [selectedVector, setSelectedVector] = useState(null);
  const [xDomain, setXDomain] = useState([-1, 1]);
  const [yDomain, setYDomain] = useState([-1, 1]);
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef(null);
  const panRef = useRef({ active: false, x: 0, y: 0 });
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  const chartMargin = useMemo(() => ({ top: 12, right: 16, left: 12, bottom: 8 }), []);

  const plotData = useMemo(
    () => [
      ...docVectors.map((vector, index) =>
        vectorToPoint(docLabels[index] || `Doc${index + 1}`, vector, "doc", index),
      ),
      vectorToPoint("Query", queryVector, "query"),
    ],
    [docVectors, queryVector, docLabels],
  );

  const docPoints = useMemo(() => plotData.filter((point) => point.type === "doc"), [plotData]);
  const queryPoint = useMemo(() => plotData.find((point) => point.type === "query") || null, [plotData]);

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
  const selectedRawVector = selectedPoint && selectedPoint.index >= 0 ? docVectors[selectedPoint.index] : null;
  const angle = selectedRawVector ? computeAngle(selectedRawVector, queryVector) : 0;

  const zoomLevel = 2 / Math.max(0.0001, xDomain[1] - xDomain[0]);

  const plotWidth = Math.max(0, chartSize.width - chartMargin.left - chartMargin.right);
  const plotHeight = Math.max(0, chartSize.height - chartMargin.top - chartMargin.bottom);

  const toPixelX = (value) =>
    chartMargin.left + ((value - xDomain[0]) / Math.max(0.0001, xDomain[1] - xDomain[0])) * plotWidth;
  const toPixelY = (value) =>
    chartMargin.top + (1 - (value - yDomain[0]) / Math.max(0.0001, yDomain[1] - yDomain[0])) * plotHeight;

  const origin = {
    x: toPixelX(0),
    y: toPixelY(0),
  };

  const arcRadius = Math.max(24, Math.min(52, Math.min(plotWidth, plotHeight) * 0.11));

  const unselectedDocs = docPoints.filter((point) => point.label !== selectedVector);
  const orderedVectors = [
    ...unselectedDocs,
    ...(queryPoint ? [queryPoint] : []),
    ...(selectedPoint ? [selectedPoint] : []),
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
              axisLine={{ stroke: "#e2e8f0", strokeWidth: 2 }}
              tickLine={{ stroke: "#cbd5e1", strokeWidth: 1.4 }}
              stroke="#94a3b8"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
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
