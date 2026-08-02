import { expect, test } from "@playwright/test";

test("exibe o acesso corporativo", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Inventário de Amostras" }),
  ).toBeVisible();
  await expect(page.getByLabel("Usuário")).toBeVisible();
});
