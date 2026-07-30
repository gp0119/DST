const combinedNineGridLayouts = {
  "1|4,4": {
    columns: 3,
    className: "single-nine",
    slots: [
      0, 0, 0,
      0, 1, null,
      1, 1, 1,
    ],
  },
  "2|3,3,3": {
    columns: 6,
    className: "combined-two",
    slots: [
      0, 0, 0, 0, 0, 0,
      1, 1, 1, 1, 1, 1,
      2, 2, 2, 2, 2, 2,
    ],
  },
  "2|4,2,2": {
    columns: 6,
    className: "combined-two",
    slots: [
      null, 1, 1, 2, 2, null,
      0, 0, 0, 0, 0, 0,
      1, 1, 0, 0, 2, 2,
    ],
  },
  "2|6,3": {
    columns: 6,
    className: "combined-two",
    slots: [
      1, 1, 1, 1, 1, 1,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ],
  },
  "4|5,3,1": {
    columns: 6,
    className: "combined-four",
    slots: [
      0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 1, 0,
      0, 1, 2, 2, 1, 0,
      0, 1, 2, 2, 1, 0,
      0, 1, 1, 1, 1, 0,
      0, 0, 0, 0, 0, 0,
    ],
  },
  "4|2,2,2,1": {
    columns: 6,
    className: "combined-four",
    slots: [
      null, 0, 0, 0, 0, null,
      0, 0, 0, 0, null, null,
      1, 1, 1, 1, 3, 3,
      1, 1, 1, 1, 3, 3,
      null, null, 2, 2, 2, 2,
      null, 2, 2, 2, 2, null,
    ],
  },
  "4|2,2,2,2": {
    columns: 6,
    className: "combined-four",
    slots: [
      null, 0, 0, 1, 1, null,
      0, 0, 0, 0, 1, 1,
      0, 0, 2, 2, 1, 1,
      2, 2, 2, 2, 1, 1,
      2, 2, 3, 3, 3, 3,
      null, 3, 3, 3, 3, null,
    ],
  },
  "4|3,2,2,2": {
    columns: 6,
    className: "combined-four",
    slots: [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      1, 1, 2, 2, 3, 3,
      1, 1, 2, 2, 3, 3,
      1, 1, 2, 2, 3, 3,
      1, 1, 2, 2, 3, 3,
    ],
  },
  "4|4,2,2,1": {
    columns: 6,
    className: "combined-four",
    slots: [
      2, 0, 0, 0, 0, 2,
      0, 1, 1, 1, 1, 0,
      0, 2, 3, 3, 2, 0,
      0, 2, 3, 3, 2, 0,
      0, 1, 1, 1, 1, 0,
      2, 0, 0, 0, 0, 2,
    ],
  },
  "4|4,3,1,1": {
    columns: 6,
    className: "combined-four",
    slots: [
      2, 0, 0, 0, 0, 2,
      0, 1, 1, 1, 1, 0,
      0, 1, 3, 3, 1, 0,
      0, 1, 3, 3, 1, 0,
      0, 1, 1, 1, 1, 0,
      2, 0, 0, 0, 0, 2,
    ],
  },
};

const tenGridLayouts = {
  "5,5": [
    0, 1, 0,
    0, 1,
    1, 0, 1,
    0, 1,
  ],
  "4,4,2": [
    0, 0, 1,
    1, 2,
    0, 0, 1,
    1, 2,
  ],
};

function sortedItems(example) {
  return [...example.items].sort(
    (left, right) =>
      right.count - left.count || left.cropId.localeCompare(right.cropId),
  );
}

function cropSlots(template, items) {
  return template.map((itemIndex) =>
    itemIndex === null ? null : items[itemIndex].cropId,
  );
}

export function buildExampleFormations(example) {
  const items = sortedItems(example);
  const counts = items.map((item) => item.count).join(",");

  if (example.gridSize === 10) {
    const template = tenGridLayouts[counts];

    return Array.from({ length: example.plotCount }, (_, index) => ({
      id: `plot-${index + 1}`,
      label: `田 ${index + 1}`,
      columns: 6,
      className: "ten-grid",
      slots: cropSlots(template, items),
    }));
  }

  const layout = combinedNineGridLayouts[`${example.plotCount}|${counts}`];
  const label =
    example.plotCount === 1
      ? "田 1"
      : `${example.plotCount} 块相邻田 · ${layout.columns}×${layout.slots.length / layout.columns}`;

  return [
    {
      id: "combined",
      label,
      columns: layout.columns,
      className: layout.className,
      slots: cropSlots(layout.slots, items),
    },
  ];
}
