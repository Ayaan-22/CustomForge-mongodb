export type SearchChoice = {
  id: string;
  href: string;
  label: string;
  kind: "product" | "category" | "recent" | "all";
};
export type SearchSuggestionProps = {
  query: string;
  listId: string;
  activeIndex: number;
  onChoices: (choices: SearchChoice[]) => void;
  onActiveIndex: (index: number) => void;
  onSelect: (choice: SearchChoice, event?: React.MouseEvent) => void;
};
export const RECENT_SEARCH_KEY = "customforge.recent-searches";
export function rememberSearch(query: string) {
  const value = query.trim().slice(0, 80);
  if (!value) return;
  try {
    const previous: unknown = JSON.parse(
      localStorage.getItem(RECENT_SEARCH_KEY) || "[]",
    );
    const entries = Array.isArray(previous)
      ? previous.filter((item): item is string => typeof item === "string")
      : [];
    localStorage.setItem(
      RECENT_SEARCH_KEY,
      JSON.stringify(
        [
          value,
          ...entries.filter(
            (item) => item.toLowerCase() !== value.toLowerCase(),
          ),
        ].slice(0, 5),
      ),
    );
  } catch {
    /* Device history is optional when storage is blocked. */
  }
}
