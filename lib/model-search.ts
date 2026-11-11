import type { CustomModel } from "./api";

export function filterModels<T extends Pick<CustomModel, "name" | "code" | "description">>(models: T[], query: string): T[] {
  const search = query.trim().toLocaleLowerCase("vi");
  return models.filter((item) => `${item.name} ${item.code} ${item.description ?? ""}`.toLocaleLowerCase("vi").includes(search));
}
