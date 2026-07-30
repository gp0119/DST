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
      0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 1, 0,
      null, 2, 2, 2, 2, null,
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
      null, 1, 1, 1, 1, null,
      2, 2, 3, 3, 2, 2,
      2, 2, 3, 3, 2, 2,
      null, 1, 1, 1, 1, null,
      null, 0, 0, 0, 0, null,
    ],
  },
  "4|2,2,2,2": {
    columns: 6,
    className: "combined-four",
    slots: [
      null, 0, 0, 0, 0, null,
      1, 2, 3, 3, 2, 1,
      1, 2, 3, 3, 2, 1,
      1, 2, 3, 3, 2, 1,
      1, 2, 3, 3, 2, 1,
      null, 0, 0, 0, 0, null,
    ],
  },
  "4|3,2,2,2": {
    columns: 6,
    className: "combined-four",
    slots: [
      0, 0, 0, 0, 0, 0,
      1, 2, 3, 3, 2, 1,
      1, 2, 3, 3, 2, 1,
      1, 2, 3, 3, 2, 1,
      1, 2, 3, 3, 2, 1,
      0, 0, 0, 0, 0, 0,
    ],
  },
  "4|4,2,2,1": {
    columns: 6,
    className: "combined-four",
    slots: [
      0, 0, 1, 1, 0, 0,
      0, 0, 1, 1, 0, 0,
      2, 2, 3, 3, 2, 2,
      2, 2, 3, 3, 2, 2,
      0, 0, 1, 1, 0, 0,
      0, 0, 1, 1, 0, 0,
    ],
  },
  "4|4,3,1,1": {
    columns: 6,
    className: "combined-four",
    slots: [
      1, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 0, 1,
      1, 2, 3, 3, 2, 1,
      1, 2, 3, 3, 2, 1,
      1, 0, 0, 0, 0, 1,
      1, 0, 0, 0, 0, 1,
    ],
  },
};

const tenGridLayouts = {
  "5,5": [
    0, 0, 0,
    0, 0,
    1, 1, 1,
    1, 1,
  ],
  "4,4,2": [
    0, 0, 2,
    0, 0,
    1, 1, 2,
    1, 1,
  ],
};

function mirrorTenGridSlots(slots) {
  return [
    slots[2], slots[1], slots[0],
    slots[4], slots[3],
    slots[7], slots[6], slots[5],
    slots[9], slots[8],
  ];
}

function sortedItems(example) {
  return [...example.items].sort((left, right) => right.count - left.count);
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

    return Array.from({ length: example.plotCount }, (_, index) => {
      const slots = cropSlots(template, items);

      return {
        id: `plot-${index + 1}`,
        label: `田 ${index + 1}`,
        columns: 6,
        className: "ten-grid",
        slots:
          counts === "4,4,2" && index % 2 === 1
            ? mirrorTenGridSlots(slots)
            : slots,
      };
    });
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
