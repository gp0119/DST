import crafting from "../data/crafting.json";

export { crafting };

export function getCategoryItems(categoryId) {
  return crafting.items.filter(
    (item) => item.categoryIds.includes(categoryId) && (categoryId === "character" || !item.characterId),
  );
}

export function getCharacterItems(characterId) {
  return crafting.items.filter((item) => item.characterId === characterId);
}

export function makeScopedCraftingData(items) {
  const stationIds = new Set(items.map((item) => item.stationId));

  return {
    ...crafting,
    items,
    stations: crafting.stations.filter((station) => stationIds.has(station.id)),
  };
}

export const craftingCategories = crafting.categories
  .map((category) => {
    const items = getCategoryItems(category.id);
    return {
      ...category,
      count: items.length,
    };
  })
  .filter((category) => category.count > 0)
  .sort((left, right) => left.order - right.order);

export const craftingCharacters = crafting.characters
  .map((character) => {
    const items = getCharacterItems(character.id);
    const imageId = character.id === "wx-78" ? "wx78" : character.id;
    return {
      ...character,
      count: items.length,
      image: `images/characters/${imageId}.png`,
    };
  })
  .filter((character) => character.count > 0);
