import { Fragment } from "hono/jsx";
import { PRESETS } from "../constants.js";

export function Presets() {
  return (
    <div class="presets">
      <span class="label">Presets:</span>
      {PRESETS.map((group, idx) => (
        <Fragment key={group.group}>
          {idx > 0 && <span class="sep">|</span>}
          {group.items.map((item) => (
            <button key={item.id} type="button" data-preset={item.id}>
              {item.label}
            </button>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
