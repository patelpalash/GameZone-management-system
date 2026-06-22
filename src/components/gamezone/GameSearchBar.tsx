"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Plus, Sparkles, Filter, X, ChevronDown } from "lucide-react";
import { GAME_CATALOG, CatalogGame, getGameFromCatalog, matchesGame, ALL_GENRES } from "@/lib/gameCatalog";
import { Game } from "@/types";

interface Props {
  onAddGame: (game: Game) => void;
  excludeGames: (string | Game)[];
}

export default function GameSearchBar({ onAddGame, excludeGames }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogGame[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to check if a game is already added
  const isAlreadyAdded = useCallback((gameName: string) => {
    return excludeGames.some(g => {
      const name = typeof g === "string" ? g : g.name;
      return name.toLowerCase() === gameName.toLowerCase();
    });
  }, [excludeGames]);

  // Genre-filtered catalog
  const filteredCatalog = useMemo(() => {
    if (selectedGenre === "All") return GAME_CATALOG;
    return GAME_CATALOG.filter(g => g.genre === selectedGenre);
  }, [selectedGenre]);

  useEffect(() => {
    if (!query.trim() && selectedGenre === "All") {
      setSuggestions([]);
      return;
    }

    let filtered: CatalogGame[];

    if (!query.trim()) {
      // No text query but genre filter active — show all in that genre
      filtered = filteredCatalog.filter(g => !isAlreadyAdded(g.name));
    } else {
      filtered = filteredCatalog.filter(game =>
        matchesGame(game.name, query) &&
        !isAlreadyAdded(game.name)
      );
    }

    setSuggestions(filtered.slice(0, 12)); // Show up to 12 results
  }, [query, isAlreadyAdded, filteredCatalog, selectedGenre]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowGenreFilter(false);
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

  const genreCount = useMemo(() => {
    const counts: Record<string, number> = {};
    GAME_CATALOG.forEach(g => {
      counts[g.genre] = (counts[g.genre] || 0) + 1;
    });
    return counts;
  }, []);

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
                if (suggestions.length > 0 && suggestions[0].name.toLowerCase() === query.trim().toLowerCase()) {
                  handleSelectGame(suggestions[0]);
                } else if (query.trim() && !isAlreadyAdded(query.trim())) {
                  handleAddCustomGame();
                }
              }
            }}
          />
        </div>

        {/* Genre Filter Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowGenreFilter(!showGenreFilter);
            setIsOpen(true);
          }}
          className={`px-3 border font-bold uppercase tracking-widest text-[10px] flex items-center gap-1 transition-all cyber-cut ${
            selectedGenre !== "All"
              ? "bg-pink-500/20 text-pink-400 border-pink-500"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-pink-500 hover:border-pink-500"
          }`}
        >
          <Filter className="w-3 h-3" />
          {selectedGenre !== "All" ? selectedGenre : "GENRE"}
          <ChevronDown className="w-3 h-3" />
        </button>

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

      {/* Genre Filter Dropdown */}
      {showGenreFilter && (
        <div className="absolute z-[60] w-full mt-1 bg-slate-950 border border-pink-500/50 shadow-[0_4px_20px_rgba(255,0,127,0.15)] p-3 cyber-cut-reverse">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black tracking-widest text-pink-500 uppercase">Filter by Genre</span>
            {selectedGenre !== "All" && (
              <button
                type="button"
                onClick={() => { setSelectedGenre("All"); setShowGenreFilter(false); }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                <X className="w-3 h-3" /> CLEAR
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["All", ...ALL_GENRES].map(genre => (
              <button
                key={genre}
                type="button"
                onClick={() => {
                  setSelectedGenre(genre);
                  setShowGenreFilter(false);
                  setIsOpen(true);
                }}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  selectedGenre === genre
                    ? "bg-pink-500 text-black border-pink-500"
                    : "bg-slate-900 text-slate-400 border-slate-700 hover:border-pink-500 hover:text-pink-400"
                }`}
              >
                {genre} {genre !== "All" && <span className="text-[9px] opacity-60">({genreCount[genre] || 0})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && !showGenreFilter && (suggestions.length > 0 || query.trim()) && (
        <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-pink-500/50 shadow-[0_4px_20px_rgba(255,0,127,0.15)] max-h-80 overflow-y-auto cyber-cut-reverse">
          {/* Results count header */}
          {suggestions.length > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-900 flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-500 uppercase">
                {suggestions.length} result{suggestions.length !== 1 ? "s" : ""} 
                {selectedGenre !== "All" && <span className="text-pink-500"> · {selectedGenre}</span>}
              </span>
              <span className="text-[9px] font-mono text-slate-600">{GAME_CATALOG.length} total games</span>
            </div>
          )}

          {suggestions.map((game) => (
            <button
              key={game.name}
              type="button"
              onClick={() => handleSelectGame(game)}
              className="w-full flex items-center gap-3 p-2 hover:bg-slate-900 text-left border-b border-slate-900 transition-colors group"
            >
              <img
                src={game.posterUrl}
                alt={game.name}
                className="w-8 h-12 object-cover border border-slate-800 rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-white uppercase tracking-wider block truncate">{game.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-mono text-pink-500/70 uppercase">{game.genre}</span>
                  <span className="text-[9px] font-mono text-slate-600">·</span>
                  <span className="text-[9px] font-mono text-cyan-500/70 uppercase">{game.platform}</span>
                </div>
              </div>
              <Plus className="w-4 h-4 text-slate-600 group-hover:text-pink-500 shrink-0 transition-colors" />
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
