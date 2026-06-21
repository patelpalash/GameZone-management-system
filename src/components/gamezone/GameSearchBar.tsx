"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Sparkles } from "lucide-react";
import { GAME_CATALOG, CatalogGame, getGameFromCatalog, matchesGame } from "@/lib/gameCatalog";
import { Game } from "@/types";

interface Props {
  onAddGame: (game: Game) => void;
  excludeGames: (string | Game)[];
}

export default function GameSearchBar({ onAddGame, excludeGames }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogGame[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to check if a game is already added
  const isAlreadyAdded = useCallback((gameName: string) => {
    return excludeGames.some(g => {
      const name = typeof g === "string" ? g : g.name;
      return name.toLowerCase() === gameName.toLowerCase();
    });
  }, [excludeGames]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = GAME_CATALOG.filter(game =>
      matchesGame(game.name, query) &&
      !isAlreadyAdded(game.name)
    ).slice(0, 5); // Limit to top 5 suggestions

    setSuggestions(filtered);
  }, [query, isAlreadyAdded]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectGame = (game: CatalogGame) => {
    onAddGame({ name: game.name, posterUrl: game.posterUrl });
    setQuery("");
    setIsOpen(false);
  };

  const handleAddCustomGame = () => {
    if (!query.trim()) return;
    const finalGame = getGameFromCatalog(query.trim());
    onAddGame({ name: finalGame.name, posterUrl: finalGame.posterUrl });
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search game catalog (e.g. Valorant, Counter-Strike 2)..."
            className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 font-mono text-sm focus:border-pink-500 focus:outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                // If there's an exact match in suggestions, add that, otherwise add custom
                if (suggestions.length > 0 && suggestions[0].name.toLowerCase() === query.trim().toLowerCase()) {
                  handleSelectGame(suggestions[0]);
                } else if (query.trim() && !isAlreadyAdded(query.trim())) {
                  handleAddCustomGame();
                }
              }
            }}
          />
        </div>
        {query.trim() && !isAlreadyAdded(query.trim()) && (
          <button
            type="button"
            onClick={handleAddCustomGame}
            className="px-4 bg-slate-800 text-pink-500 hover:bg-slate-700 border border-slate-700 font-bold uppercase tracking-widest text-xs flex items-center gap-1 transition-all"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (query.trim() || suggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-pink-500/50 shadow-[0_4px_20px_rgba(255,0,127,0.15)] max-h-80 overflow-y-auto cyber-cut-reverse">
          {suggestions.map((game) => (
            <button
              key={game.name}
              type="button"
              onClick={() => handleSelectGame(game)}
              className="w-full flex items-center gap-3 p-2 hover:bg-slate-900 text-left border-b border-slate-900 transition-colors"
            >
              <img
                src={game.posterUrl}
                alt={game.name}
                className="w-8 h-12 object-cover border border-slate-800 rounded shrink-0"
              />
              <span className="text-sm font-bold text-white uppercase tracking-wider">{game.name}</span>
            </button>
          ))}

          {query.trim() && !isAlreadyAdded(query.trim()) && (
            <button
              type="button"
              onClick={handleAddCustomGame}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-900 text-left border-b border-slate-900 text-pink-400 font-mono text-xs uppercase"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-pink-500 animate-pulse" />
              <span>Add Custom Game: &quot;{query.trim()}&quot;</span>
            </button>
          )}

          {excludeGames.length > 0 && query.trim() && isAlreadyAdded(query.trim()) && (
            <div className="p-3 text-center text-xs text-slate-500 font-mono">
              ALREADY_INSTALLED_ON_NODE
            </div>
          )}
        </div>
      )}
    </div>
  );
}
