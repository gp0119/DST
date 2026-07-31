const nineGridLayouts = {
  "4,4": [
    0, 0, 0,
    0, null, 1,
    1, 1, 1,
  ],
  "3,3,3": [
    0, 0, 0,
    1, 1, 1,
    2, 2, 2,
  ],
  "4,2,2": [
    0, 0, 0,
    0, 1, 1,
    null, 2, 2,
  ],
  "6,3": [
    1, 1, 1,
    0, 0, 0,
    0, 0, 0,
  ],
  "5,3,1": [
    0, 0, 0,
    0, 1, 1,
    0, 1, 2,
  ],
  "2,2,2,1": [
    null, 0, 0,
    null, 1, 1,
    2, 2, 3,
  ],
  "2,2,2,2": [
    null, 0, 0,
    1, 2, 3,
    1, 2, 3,
  ],
  "3,2,2,2": [
    0, 0, 0,
    1, 2, 3,
    1, 2, 3,
  ],
  "4,2,2,1": [
    0, 0, 1,
    0, 0, 1,
    2, 2, 3,
  ],
  "4,3,1,1": [
    1, 0, 0,
    1, 0, 0,
    1, 2, 3,
  ],
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
  "4,2,2,2": [
    0, 0, 1,
    0, 1,
    0, 2, 2,
    3, 3,
  ],
  "4,3,2,1": [
    0, 0, 1,
    0, 1,
    0, 2, 1,
    2, 3,
  ],
  "4,2,2,1,1": [
    0, 0, 1,
    0, 1,
    0, 2, 3,
    2, 4,
  ],
  "5,2,2,1": [
    0, 0, 0,
    0, 0,
    2, 1, 1,
    2, 3,
  ],
  "6,2,2": [
    0, 0, 0,
    0, 0,
    0, 1, 1,
    2, 2,
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

function mirrorNineGridSlots(slots) {
  return [
    slots[2], slots[1], slots[0],
    slots[5], slots[4], slots[3],
    slots[8], slots[7], slots[6],
  ];
}

function flipNineGridSlots(slots) {
  return [
    slots[6], slots[7], slots[8],
    slots[3], slots[4], slots[5],
    slots[0], slots[1], slots[2],
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

function greatestCommonDivisor(left, right) {
  return right === 0 ? left : greatestCommonDivisor(right, left % right);
}

export function formatReducedRatio(items) {
  const counts = items
    .map((item) => item.count)
    .sort((left, right) => right - left);
  const divisor = counts.reduce(greatestCommonDivisor);

  return counts.map((count) => count / divisor).join(":");
}

export function buildExampleFormations(example, plotCount = example.plotCount) {
  const items = sortedItems(example);
  const counts = items.map((item) => item.count).join(",");
  const isTenGrid = example.gridSize === 10;
  const template = isTenGrid
    ? tenGridLayouts[counts]
    : nineGridLayouts[counts];
  const baseSlots = cropSlots(template, items);

  return Array.from({ length: plotCount }, (_, index) => {
    let slots = baseSlots;

    if (isTenGrid && index % 2 === 1) {
      slots = mirrorTenGridSlots(slots);
    } else if (!isTenGrid) {
      if (index >= 2) slots = flipNineGridSlots(slots);
      if (index % 2 === 1) slots = mirrorNineGridSlots(slots);
    }

    return {
      id: `plot-${index + 1}`,
      label: `田 ${index + 1}`,
      columns: isTenGrid ? 6 : 3,
      className: isTenGrid ? "ten-grid" : "nine-grid",
      verticalMirror: isTenGrid && plotCount === 4 && index >= 2,
      slots,
    };
  });
}
