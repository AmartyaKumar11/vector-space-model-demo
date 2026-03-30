import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InputPanel from "./components/InputPanel";
import VocabularyPanel from "./components/VocabularyPanel";
import MatrixTable from "./components/MatrixTable";
import VectorDisplay from "./components/VectorDisplay";
import VectorPlot from "./components/VectorPlot";
import SimilarityPanel from "./components/SimilarityPanel";
import RankingPanel from "./components/RankingPanel";
import StepController from "./components/StepController";
import { runVSM } from "./lib/vsmCore";

const MAX_STEP = 5;

function App() {
  const [documents, setDocuments] = useState(["machine learning basics", "deep learning models", ""]);
  const [query, setQuery] = useState("machine learning");
  const [mode, setMode] = useState("tf");
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const sectionRefs = {
    1: useRef(null),
    2: useRef(null),
    3: useRef(null),
    4: useRef(null),
    5: useRef(null),
  };

  const activeDocuments = useMemo(() => documents.map((doc) => doc.trim()).filter(Boolean), [documents]);
  const docLabels = useMemo(
    () => activeDocuments.map((_, index) => `Doc${index + 1}`),
    [activeDocuments],
  );

  useEffect(() => {
    if (!result || step < 1) {
      return;
    }

    sectionRefs[step]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step, result]);

  const handleDocumentChange = (index, value) => {
    setDocuments((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const handleRun = async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    await new Promise((resolve) => setTimeout(resolve, 350));

    const nextResult = runVSM(activeDocuments, query, mode);
    setResult(nextResult);
    setStep(1);
    setIsRunning(false);
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);

    if (result) {
      const rerun = runVSM(activeDocuments, query, nextMode);
      setResult(rerun);
    }
  };

  const activeDocVectors =
    mode === "tfidf" && result?.tfidfVectors ? result.tfidfVectors.docVectors : result?.tfVectors || [];
  const activeQueryVector =
    mode === "tfidf" && result?.tfidfVectors ? result.tfidfVectors.queryVector : result?.queryVector || [];

  return (
    <div className="relative min-h-screen bg-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.20),_transparent_48%),radial-gradient(circle_at_80%_20%,_rgba(139,92,246,0.16),_transparent_36%)]" />

      <main className="relative mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6 md:py-10">
        <InputPanel
          documents={documents}
          query={query}
          mode={mode}
          isRunning={isRunning}
          onDocumentChange={handleDocumentChange}
          onQueryChange={setQuery}
          onModeChange={handleModeChange}
          onRun={handleRun}
        />

        {result && (
          <StepController step={step} setStep={setStep} maxStep={MAX_STEP} disabled={isRunning} />
        )}

        <AnimatePresence mode="wait">
          {result && step >= 1 && (
            <motion.div ref={sectionRefs[1]} layout className="space-y-6">
              <VocabularyPanel vocabulary={result.vocabulary} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {result && step >= 2 && (
            <motion.div ref={sectionRefs[2]} layout className="space-y-6">
              <MatrixTable
                vocabulary={result.vocabulary}
                docVectors={activeDocVectors}
                queryVector={activeQueryVector}
                docLabels={docLabels}
                mode={mode}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {result && step >= 3 && (
            <motion.div ref={sectionRefs[3]} layout className="space-y-6">
              <VectorDisplay docVectors={activeDocVectors} queryVector={activeQueryVector} docLabels={docLabels} />
              <VectorPlot
                docVectors={activeDocVectors}
                queryVector={activeQueryVector}
                docLabels={docLabels}
                vocabulary={result.vocabulary}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {result && step >= 4 && (
            <motion.div ref={sectionRefs[4]} layout className="space-y-6">
              <SimilarityPanel scores={result.similarityScores} docLabels={docLabels} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {result && step >= 5 && (
            <motion.div ref={sectionRefs[5]} layout className="space-y-6 pb-10">
              <RankingPanel rankings={result.rankings} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
