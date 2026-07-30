function choose(items, size, start = 0, selected = [], output = []) {
  if (selected.length === size) {
    output.push(selected);
    return output;
  }

  for (let index = start; index < items.length; index += 1) {
    choose(items, size, index + 1, [...selected, items[index]], output);
  }

  return output;
}

function permute(values) {
  if (values.length < 2) return [values];

  const results = values.flatMap((value, index) =>
    permute([...values.slice(0, index), ...values.slice(index + 1)]).map(
      (remaining) => [value, ...remaining],
    ),
  );

  return [...new Map(results.map((result) => [result.join(","), result])).values()];
}

function combinationKey(items) {
  return [...items]
    .sort((left, right) => left.cropId.localeCompare(right.cropId))
    .map((item) => `${item.cropId}:${item.count}`)
    .join("|");
}

export function generateRatioGroups(season, crops, catalog) {
  const cropsById = Object.fromEntries(crops.map((crop) => [crop.id, crop]));
  const exclusions = new Set(catalog.exclusions[season.id] ?? []);

  return catalog.patterns
    .map((pattern) => {
      const combinations = choose(season.cropIds, pattern.length);
      const countOrders = permute(pattern);
      const entries = [];

      for (const cropIds of combinations) {
        for (const counts of countOrders) {
          const items = cropIds.map((cropId, index) => ({
            cropId,
            count: counts[index],
          }));
          const balance = items.reduce(
            (total, item) => {
              cropsById[item.cropId].nutrients.forEach((value, index) => {
                total[index] += value * item.count;
              });
              return total;
            },
            [0, 0, 0],
          );

          if (
            balance.every((value) => value === 0) &&
            !exclusions.has(combinationKey(items))
          ) {
            entries.push({
              id: combinationKey(items),
              items,
            });
            break;
          }
        }
      }

      return {
        ratio: pattern.join(":"),
        entries,
      };
    })
    .filter((group) => group.entries.length > 0);
}
