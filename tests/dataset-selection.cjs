const { expect } = require("@playwright/test");
// Workspaces expose one collection. Tests no longer switch label versions.
exports.selectDataset = async (page, id) => {
  await expect(page.locator(".dataset-current")).toHaveAttribute(
    "data-dataset-id",
    id,
  );
};
