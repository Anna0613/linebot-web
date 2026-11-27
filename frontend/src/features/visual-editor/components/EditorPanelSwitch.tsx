export type EditorPanel = "palette" | "canvas" | "inspector";

export default function EditorPanelSwitch({
  value,
  onChange,
}: {
  value: EditorPanel;
  onChange: (panel: EditorPanel) => void;
}) {
  return (
    <div className="studio-panel-switch" role="group" aria-label="編輯區">
      {(
        [
          ["palette", "元件"],
          ["canvas", "畫布"],
          ["inspector", "屬性"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === value}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
