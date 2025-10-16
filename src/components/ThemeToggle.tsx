import React from "react";

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = React.useState(
    localStorage.getItem("theme") || "dark"
  );

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="px-3 py-2 rounded-lg border border-gray-400 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition"
    >
      {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
    </button>
  );
};
