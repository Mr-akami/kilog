import { PRESETS } from "../constants.js";

export function Presets() {
  return (
    <div class="presets">
      <span class="label">Presets:</span>
      {PRESETS.map((group, idx) => (
        <>
          {idx > 0 && <span class="sep">|</span>}
          {group.items.map((item) => (
            <button type="button" data-preset={item.id}>
              {item.label}
            </button>
          ))}
        </>
      ))}
    </div>
  );
}
