import { motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
};

export default function InputPanel({
  documents,
  query,
  mode,
  isRunning,
  onDocumentChange,
  onQueryChange,
  onModeChange,
  onRun,
}) {
  return (
    <motion.section
      id="input"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="panel-card"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Vector Space Model</h1>
          <p className="mt-1 text-sm text-slate-300">Compare document relevance against a search query.</p>
        </div>

        <div className="rounded-xl bg-slate-800/80 p-1 text-xs text-slate-200">
          <button
            type="button"
            onClick={() => onModeChange("tf")}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === "tf" ? "bg-blue-500 text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            TF
          </button>
          <button
            type="button"
            onClick={() => onModeChange("tfidf")}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === "tfidf" ? "bg-violet-500 text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            TF-IDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {documents.map((doc, index) => (
          <label key={`doc-${index}`} className="space-y-2">
            <span className="text-sm font-medium text-slate-200">
              {index === 2 ? "Document 3 (Optional)" : `Document ${index + 1}`}
            </span>
            <textarea
              value={doc}
              onChange={(event) => onDocumentChange(index, event.target.value)}
              rows={3}
              className="input-area"
              placeholder={index === 2 ? "Optional additional document" : `Type document ${index + 1}`}
            />
          </label>
        ))}
      </div>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-medium text-slate-200">Query</span>
        <textarea
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          rows={2}
          className="input-area"
          placeholder="Enter query text"
        />
      </label>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onRun}
        disabled={isRunning}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? "Running..." : "Run VSM"}
      </motion.button>
    </motion.section>
  );
}
