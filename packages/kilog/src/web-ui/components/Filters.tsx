import { RUNTIMES, EVENT_TYPES, LEVELS } from "../constants.js";

export function Filters() {
  return (
    <div class="filters">
      <select id="filter-project">
        <option value="">All projects</option>
      </select>
      <DropdownWithAll id="filter-runtime" placeholder="All runtimes" options={RUNTIMES} />
      <DropdownWithAll id="filter-type" placeholder="All types" options={EVENT_TYPES} />
      <DropdownWithAll id="filter-level" placeholder="All levels" options={LEVELS} />
      <input type="text" id="filter-search" placeholder="Search..." />
      <button id="btn-search" type="button">
        Filter
      </button>
    </div>
  );
}

function DropdownWithAll({
  id,
  placeholder,
  options,
}: {
  id: string;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <select id={id}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
