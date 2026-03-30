import { useEffect, useState } from "react";

export default function StepController({ step, setStep, maxStep, disabled }) {
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  useEffect(() => {
    if (!isAutoPlay || disabled) {
      return undefined;
    }

    const timer = setInterval(() => {
      setStep((current) => {
        if (current >= maxStep) {
          setIsAutoPlay(false);
          return current;
        }
        return current + 1;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [isAutoPlay, disabled, maxStep, setStep]);

  return (
    <section className="panel-card sticky top-4 z-10 bg-slate-900/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={disabled || step <= 1}
          className="control-button"
        >
          Previous Step
        </button>

        <button
          type="button"
          onClick={() => setStep((current) => Math.min(maxStep, current + 1))}
          disabled={disabled || step >= maxStep}
          className="control-button"
        >
          Next Step
        </button>

        <button
          type="button"
          onClick={() => setIsAutoPlay((value) => !value)}
          disabled={disabled || step >= maxStep}
          className="control-button"
        >
          {isAutoPlay ? "Stop Auto Play" : "Auto Play"}
        </button>

        <span className="ml-auto text-xs text-slate-300">Step {step} / {maxStep}</span>
      </div>
    </section>
  );
}
