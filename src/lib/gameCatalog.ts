export interface CatalogGame {
  name: string;
  posterUrl: string;
  genre: string;
  platform: "PC" | "PS5" | "Xbox" | "Multi";
}

// ─────────────────────────────────────────────────────
//  MASTER GAME CATALOG — 150+ titles covering every
//  genre a cyber-cafe / gaming-zone would stock.
//  Steam library_600x900 posters are used where possible.
// ─────────────────────────────────────────────────────

export const GAME_CATALOG: CatalogGame[] = [
  // ── FPS / Shooters ──────────────────────────────────
  { name: "Counter-Strike 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/730/library_600x900.jpg", genre: "FPS", platform: "PC" },
  { name: "Valorant", posterUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200", genre: "FPS", platform: "PC" },
  { name: "Call of Duty: Modern Warfare III", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1938090/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Call of Duty: Black Ops 6", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2933080/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Call of Duty: Warzone", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1962663/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Apex Legends", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1172470/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Overwatch 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2357570/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Tom Clancy's Rainbow Six Siege", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/359550/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Destiny 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1085660/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Helldivers 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/553850/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "PUBG: BATTLEGROUNDS", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/578080/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Fortnite", posterUrl: "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?auto=format&fit=crop&q=80&w=200", genre: "FPS", platform: "Multi" },
  { name: "Escape from Tarkov", posterUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200", genre: "FPS", platform: "PC" },
  { name: "Hunt: Showdown 1896", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/594650/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Team Fortress 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/440/library_600x900.jpg", genre: "FPS", platform: "PC" },
  { name: "Left 4 Dead 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/550/library_600x900.jpg", genre: "FPS", platform: "PC" },
  { name: "Titanfall 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1237970/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Battlefield 2042", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1517290/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "DOOM Eternal", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/782330/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Half-Life: Alyx", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/546560/library_600x900.jpg", genre: "FPS", platform: "PC" },
  { name: "Deep Rock Galactic", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/548430/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Insurgency: Sandstorm", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/581320/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Ready or Not", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1144200/library_600x900.jpg", genre: "FPS", platform: "PC" },
  { name: "Counter-Strike: Global Offensive", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/730/library_600x900.jpg", genre: "FPS", platform: "PC" },
  { name: "Halo Infinite", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1240440/library_600x900.jpg", genre: "FPS", platform: "Multi" },
  { name: "Back 4 Blood", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/924970/library_600x900.jpg", genre: "FPS", platform: "Multi" },

  // ── Battle Royale ───────────────────────────────────
  { name: "Naraka: Bladepoint", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1203220/library_600x900.jpg", genre: "Battle Royale", platform: "Multi" },
  { name: "Super People 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1190340/library_600x900.jpg", genre: "Battle Royale", platform: "PC" },
  { name: "Fall Guys", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1097150/library_600x900.jpg", genre: "Battle Royale", platform: "Multi" },

  // ── MOBA ────────────────────────────────────────────
  { name: "Dota 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/570/library_600x900.jpg", genre: "MOBA", platform: "PC" },
  { name: "League of Legends", posterUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200", genre: "MOBA", platform: "PC" },
  { name: "Smite 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2437030/library_600x900.jpg", genre: "MOBA", platform: "Multi" },

  // ── Open World / Action-Adventure ───────────────────
  { name: "Grand Theft Auto V", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/271590/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Grand Theft Auto VI", posterUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200", genre: "Open World", platform: "Multi" },
  { name: "Red Dead Redemption 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1174180/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Cyberpunk 2077", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Hogwarts Legacy", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/990080/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Ghost of Tsushima DIRECTOR'S CUT", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2215430/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Assassin's Creed Shadows", posterUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=200", genre: "Open World", platform: "Multi" },
  { name: "Assassin's Creed Valhalla", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2208920/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Assassin's Creed Odyssey", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/812140/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Horizon Zero Dawn Remastered", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2561580/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Horizon Forbidden West", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2420110/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Far Cry 6", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2369390/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Dying Light 2 Stay Human", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/534380/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Watch Dogs: Legion", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2289590/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Saints Row", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/742420/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Just Cause 4", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/517630/library_600x900.jpg", genre: "Open World", platform: "Multi" },
  { name: "Days Gone", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1259420/library_600x900.jpg", genre: "Open World", platform: "PC" },
  { name: "The Crew Motorfest", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2632680/library_600x900.jpg", genre: "Open World", platform: "Multi" },

  // ── Action / Souls-like ─────────────────────────────
  { name: "Elden Ring", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900.jpg", genre: "Action RPG", platform: "Multi" },
  { name: "God of War", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1593500/library_600x900.jpg", genre: "Action", platform: "Multi" },
  { name: "God of War Ragnarök", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2322010/library_600x900.jpg", genre: "Action", platform: "Multi" },
  { name: "Sekiro: Shadows Die Twice", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/814380/library_600x900.jpg", genre: "Action RPG", platform: "Multi" },
  { name: "Dark Souls III", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/374320/library_600x900.jpg", genre: "Action RPG", platform: "Multi" },
  { name: "Dark Souls: Remastered", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/570940/library_600x900.jpg", genre: "Action RPG", platform: "Multi" },
  { name: "Black Myth: Wukong", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2358720/library_600x900.jpg", genre: "Action RPG", platform: "Multi" },
  { name: "Lies of P", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1627720/library_600x900.jpg", genre: "Action RPG", platform: "Multi" },
  { name: "Marvel's Spider-Man Remastered", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1817070/library_600x900.jpg", genre: "Action", platform: "Multi" },
  { name: "Marvel's Spider-Man: Miles Morales", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1817190/library_600x900.jpg", genre: "Action", platform: "Multi" },
  { name: "Marvel's Spider-Man 2", posterUrl: "https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&q=80&w=200", genre: "Action", platform: "PS5" },
  { name: "Batman: Arkham Knight", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/208650/library_600x900.jpg", genre: "Action", platform: "Multi" },
  { name: "Devil May Cry 5", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/601150/library_600x900.jpg", genre: "Action", platform: "Multi" },
  { name: "Bayonetta 3", posterUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=200", genre: "Action", platform: "Multi" },
  { name: "Nioh 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1325200/library_600x900.jpg", genre: "Action RPG", platform: "Multi" },
  { name: "Star Wars Jedi: Survivor", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1774580/library_600x900.jpg", genre: "Action", platform: "Multi" },
  { name: "Uncharted: Legacy of Thieves Collection", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1659420/library_600x900.jpg", genre: "Action", platform: "Multi" },
  { name: "The Last of Us Part I", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1888930/library_600x900.jpg", genre: "Action", platform: "Multi" },

  // ── RPG ─────────────────────────────────────────────
  { name: "Baldur's Gate 3", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1086940/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "The Witcher 3: Wild Hunt", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/292030/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Starfield", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1716740/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Diablo IV", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2344520/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Dragon Age: The Veilguard", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1845910/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Final Fantasy VII Rebirth", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2909400/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Final Fantasy XVI", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2515020/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Persona 5 Royal", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1687950/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Persona 3 Reload", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2161700/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Monster Hunter: World", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/582010/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Monster Hunter Rise", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1446780/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Path of Exile 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2694490/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Path of Exile", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/238960/library_600x900.jpg", genre: "RPG", platform: "PC" },
  { name: "Divinity: Original Sin 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/435150/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Disco Elysium", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/632470/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Dragon's Dogma 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2054970/library_600x900.jpg", genre: "RPG", platform: "Multi" },

  // ── Horror / Survival ───────────────────────────────
  { name: "Resident Evil 4", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2050650/library_600x900.jpg", genre: "Horror", platform: "Multi" },
  { name: "Resident Evil Village", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1196590/library_600x900.jpg", genre: "Horror", platform: "Multi" },
  { name: "Alan Wake 2", posterUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=200", genre: "Horror", platform: "Multi" },
  { name: "Silent Hill 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2124490/library_600x900.jpg", genre: "Horror", platform: "Multi" },
  { name: "Dead Space", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1693980/library_600x900.jpg", genre: "Horror", platform: "Multi" },
  { name: "Phasmophobia", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/739630/library_600x900.jpg", genre: "Horror", platform: "PC" },
  { name: "The Forest", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/242760/library_600x900.jpg", genre: "Survival", platform: "Multi" },
  { name: "Sons of the Forest", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1326470/library_600x900.jpg", genre: "Survival", platform: "PC" },
  { name: "Subnautica", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/264710/library_600x900.jpg", genre: "Survival", platform: "Multi" },
  { name: "Rust", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/252490/library_600x900.jpg", genre: "Survival", platform: "Multi" },
  { name: "ARK: Survival Ascended", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2399830/library_600x900.jpg", genre: "Survival", platform: "Multi" },
  { name: "DayZ", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/221100/library_600x900.jpg", genre: "Survival", platform: "Multi" },
  { name: "7 Days to Die", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/251570/library_600x900.jpg", genre: "Survival", platform: "Multi" },
  { name: "Grounded", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/962130/library_600x900.jpg", genre: "Survival", platform: "Multi" },
  { name: "Lethal Company", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1966720/library_600x900.jpg", genre: "Horror", platform: "PC" },

  // ── Fighting ────────────────────────────────────────
  { name: "Tekken 8", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1778820/library_600x900.jpg", genre: "Fighting", platform: "Multi" },
  { name: "Street Fighter 6", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1364780/library_600x900.jpg", genre: "Fighting", platform: "Multi" },
  { name: "Mortal Kombat 1", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1971870/library_600x900.jpg", genre: "Fighting", platform: "Multi" },
  { name: "Dragon Ball FighterZ", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/678950/library_600x900.jpg", genre: "Fighting", platform: "Multi" },
  { name: "Guilty Gear -Strive-", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1384160/library_600x900.jpg", genre: "Fighting", platform: "Multi" },
  { name: "WWE 2K24", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2405690/library_600x900.jpg", genre: "Fighting", platform: "Multi" },

  // ── Racing ──────────────────────────────────────────
  { name: "Forza Horizon 5", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1551360/library_600x900.jpg", genre: "Racing", platform: "Multi" },
  { name: "Forza Horizon 6", posterUrl: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=200", genre: "Racing", platform: "Multi" },
  { name: "Forza Motorsport", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2440510/library_600x900.jpg", genre: "Racing", platform: "Multi" },
  { name: "Need for Speed Unbound", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1846380/library_600x900.jpg", genre: "Racing", platform: "Multi" },
  { name: "Need for Speed Heat", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1222680/library_600x900.jpg", genre: "Racing", platform: "Multi" },
  { name: "Assetto Corsa Competizione", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/805550/library_600x900.jpg", genre: "Racing", platform: "Multi" },
  { name: "F1 24", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2488620/library_600x900.jpg", genre: "Racing", platform: "Multi" },
  { name: "Gran Turismo 7", posterUrl: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=200", genre: "Racing", platform: "PS5" },
  { name: "Rocket League", posterUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=200", genre: "Racing", platform: "Multi" },
  { name: "BeamNG.drive", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/284160/library_600x900.jpg", genre: "Racing", platform: "PC" },
  { name: "Euro Truck Simulator 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/227300/library_600x900.jpg", genre: "Racing", platform: "PC" },

  // ── Sports ──────────────────────────────────────────
  { name: "EA SPORTS FC 25", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2693820/library_600x900.jpg", genre: "Sports", platform: "Multi" },
  { name: "EA SPORTS FC 24", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2195250/library_600x900.jpg", genre: "Sports", platform: "Multi" },
  { name: "NBA 2K25", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2688950/library_600x900.jpg", genre: "Sports", platform: "Multi" },
  { name: "NBA 2K24", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2338770/library_600x900.jpg", genre: "Sports", platform: "Multi" },
  { name: "Cricket 24", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1551330/library_600x900.jpg", genre: "Sports", platform: "Multi" },
  { name: "Madden NFL 25", posterUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=200", genre: "Sports", platform: "Multi" },

  // ── Roguelike / Indie ───────────────────────────────
  { name: "Hades", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1145360/library_600x900.jpg", genre: "Roguelike", platform: "Multi" },
  { name: "Hades II", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1145350/library_600x900.jpg", genre: "Roguelike", platform: "PC" },
  { name: "Hollow Knight", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/367520/library_600x900.jpg", genre: "Roguelike", platform: "Multi" },
  { name: "Celeste", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/504230/library_600x900.jpg", genre: "Indie", platform: "Multi" },
  { name: "Dead Cells", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/588650/library_600x900.jpg", genre: "Roguelike", platform: "Multi" },
  { name: "Slay the Spire", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/646570/library_600x900.jpg", genre: "Roguelike", platform: "Multi" },
  { name: "Stardew Valley", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/413150/library_600x900.jpg", genre: "Indie", platform: "Multi" },
  { name: "Terraria", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/105600/library_600x900.jpg", genre: "Indie", platform: "Multi" },
  { name: "Cuphead", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/268910/library_600x900.jpg", genre: "Indie", platform: "Multi" },
  { name: "It Takes Two", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1426210/library_600x900.jpg", genre: "Indie", platform: "Multi" },
  { name: "Vampire Survivors", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1794680/library_600x900.jpg", genre: "Roguelike", platform: "Multi" },
  { name: "Balatro", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2379780/library_600x900.jpg", genre: "Roguelike", platform: "Multi" },

  // ── Sandbox / Crafting ──────────────────────────────
  { name: "Minecraft", posterUrl: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&q=80&w=200", genre: "Sandbox", platform: "Multi" },
  { name: "Roblox", posterUrl: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&q=80&w=200", genre: "Sandbox", platform: "Multi" },
  { name: "Garry's Mod", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/4000/library_600x900.jpg", genre: "Sandbox", platform: "PC" },
  { name: "Palworld", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1623730/library_600x900.jpg", genre: "Sandbox", platform: "Multi" },
  { name: "Valheim", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/892970/library_600x900.jpg", genre: "Survival", platform: "Multi" },
  { name: "Satisfactory", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/526870/library_600x900.jpg", genre: "Sandbox", platform: "PC" },
  { name: "No Man's Sky", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/275850/library_600x900.jpg", genre: "Sandbox", platform: "Multi" },

  // ── Strategy / Simulation ───────────────────────────
  { name: "Civilization VI", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/289070/library_600x900.jpg", genre: "Strategy", platform: "Multi" },
  { name: "Age of Empires IV", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1466860/library_600x900.jpg", genre: "Strategy", platform: "PC" },
  { name: "Total War: Warhammer III", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1142710/library_600x900.jpg", genre: "Strategy", platform: "PC" },
  { name: "Stellaris", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/281990/library_600x900.jpg", genre: "Strategy", platform: "Multi" },
  { name: "Cities: Skylines II", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/949230/library_600x900.jpg", genre: "Strategy", platform: "Multi" },
  { name: "Frostpunk 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1198120/library_600x900.jpg", genre: "Strategy", platform: "PC" },
  { name: "Microsoft Flight Simulator 2024", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2537590/library_600x900.jpg", genre: "Simulation", platform: "Multi" },
  { name: "The Sims 4", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1222670/library_600x900.jpg", genre: "Simulation", platform: "Multi" },
  { name: "Planet Zoo", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/703080/library_600x900.jpg", genre: "Simulation", platform: "PC" },
  { name: "Two Point Hospital", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/535930/library_600x900.jpg", genre: "Simulation", platform: "Multi" },

  // ── MMO / Co-op ─────────────────────────────────────
  { name: "World of Warcraft", posterUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200", genre: "MMO", platform: "PC" },
  { name: "Final Fantasy XIV Online", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/39210/library_600x900.jpg", genre: "MMO", platform: "Multi" },
  { name: "Lost Ark", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1599340/library_600x900.jpg", genre: "MMO", platform: "PC" },
  { name: "New World: Aeternum", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1063730/library_600x900.jpg", genre: "MMO", platform: "Multi" },
  { name: "Warframe", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/230410/library_600x900.jpg", genre: "MMO", platform: "Multi" },
  { name: "Sea of Thieves", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1172620/library_600x900.jpg", genre: "Co-op", platform: "Multi" },

  // ── Stealth / Tactical ──────────────────────────────
  { name: "Hitman: World of Assassination", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1659040/library_600x900.jpg", genre: "Stealth", platform: "Multi" },
  { name: "Metal Gear Solid V: The Phantom Pain", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/287700/library_600x900.jpg", genre: "Stealth", platform: "Multi" },
  { name: "Splinter Cell: Blacklist", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/235600/library_600x900.jpg", genre: "Stealth", platform: "Multi" },

  // ── Puzzle / Party ──────────────────────────────────
  { name: "Portal 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/620/library_600x900.jpg", genre: "Puzzle", platform: "Multi" },
  { name: "Among Us", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/945360/library_600x900.jpg", genre: "Party", platform: "Multi" },
  { name: "Stumble Guys", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1677740/library_600x900.jpg", genre: "Party", platform: "Multi" },
  { name: "Gartic Phone", posterUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=200", genre: "Party", platform: "PC" },
  { name: "Human: Fall Flat", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/477160/library_600x900.jpg", genre: "Party", platform: "Multi" },
  { name: "Overcooked! 2", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/728880/library_600x900.jpg", genre: "Party", platform: "Multi" },
  { name: "Gang Beasts", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/285900/library_600x900.jpg", genre: "Party", platform: "Multi" },
  { name: "A Way Out", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1222700/library_600x900.jpg", genre: "Co-op", platform: "Multi" },

  // ── VR Titles ───────────────────────────────────────
  { name: "Beat Saber", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/620980/library_600x900.jpg", genre: "VR", platform: "PC" },
  { name: "Boneworks", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/823500/library_600x900.jpg", genre: "VR", platform: "PC" },

  // ── Anime / JRPG ────────────────────────────────────
  { name: "Genshin Impact", posterUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=200", genre: "RPG", platform: "Multi" },
  { name: "Honkai: Star Rail", posterUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=200", genre: "RPG", platform: "Multi" },
  { name: "Wuthering Waves", posterUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=200", genre: "RPG", platform: "Multi" },
  { name: "Ni no Kuni II: Revenant Kingdom", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/589360/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Tales of Arise", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/740130/library_600x900.jpg", genre: "RPG", platform: "Multi" },
  { name: "Scarlet Nexus", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/775500/library_600x900.jpg", genre: "RPG", platform: "Multi" },

  // ── Card / Auto-battler ─────────────────────────────
  { name: "Teamfight Tactics", posterUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200", genre: "Strategy", platform: "PC" },
  { name: "Hearthstone", posterUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200", genre: "Strategy", platform: "Multi" },
  { name: "Yu-Gi-Oh! Master Duel", posterUrl: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1449850/library_600x900.jpg", genre: "Strategy", platform: "Multi" },
];

// ─────────────────────────────────────────────────────
//  All unique genres extracted from the catalog above
// ─────────────────────────────────────────────────────
export const ALL_GENRES: string[] = Array.from(
  new Set(GAME_CATALOG.map(g => g.genre))
).sort();

export const ALL_PLATFORMS: string[] = ["PC", "PS5", "Xbox", "Multi"];

export function getGameInitials(name: string): string {
  const parts = name.trim().split(/[\s:_-]+/);
  if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function generatePlaceholderPoster(name: string): string {
  const initials = getGameInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">
    <defs>
      <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0f1d"/>
        <stop offset="50%" stop-color="#0d0818"/>
        <stop offset="100%" stop-color="#140624"/>
      </linearGradient>
      <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#00f0ff"/>
        <stop offset="100%" stop-color="#ff007f"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#cyberGrad)"/>
    <rect width="90%" height="93%" x="5%" y="3.5%" fill="none" stroke="url(#neonGrad)" stroke-width="1.5" opacity="0.6"/>
    <line x1="5%" y1="20%" x2="95%" y2="20%" stroke="#ff007f" stroke-width="0.5" opacity="0.3"/>
    <line x1="5%" y1="80%" x2="95%" y2="80%" stroke="#00f0ff" stroke-width="0.5" opacity="0.3"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#00f0ff" font-family="sans-serif" font-size="32" font-weight="900" style="text-shadow: 0 0 10px rgba(0, 240, 255, 0.8)">${initials}</text>
    <text x="50%" y="88%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="bold" opacity="0.8">${name.substring(0, 18).toUpperCase()}${name.length > 18 ? '...' : ''}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getGameFromCatalog(name: string): CatalogGame {
  const match = GAME_CATALOG.find(g => g.name.toLowerCase() === name.toLowerCase());
  if (match) return match;
  return {
    name,
    posterUrl: generatePlaceholderPoster(name),
    genre: "Other",
    platform: "Multi"
  };
}

export function matchesGame(gameName: string, query: string): boolean {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return false;
  
  const cleanName = gameName.toLowerCase();
  
  // Direct inclusion
  if (cleanName.includes(cleanQuery)) return true;
  
  // Split query into words/tokens (splitting also on letter-number boundary e.g. cs2 -> ["cs", "2"])
  const queryWords = cleanQuery.split(/(?=[0-9])|(?<=[0-9])|[\s:_-]+/);
  
  // Abbreviation mapping table
  const abbreviations: Record<string, string[]> = {
    gta: ["grand", "theft", "auto"],
    cod: ["call", "of", "duty"],
    cs: ["counter", "strike"],
    fc: ["ea", "sports", "fc"],
    fifa: ["ea", "sports", "fc", "fifa"],
    bo: ["black", "ops"],
    mw: ["modern", "warfare"],
    fh: ["forza", "horizon"],
    fm: ["forza", "motorsport"],
    nfs: ["need", "for", "speed"],
    nba: ["nba"],
    rdr: ["red", "dead", "redemption"],
    r6: ["rainbow", "six"],
    gow: ["god", "of", "war"],
    re: ["resident", "evil"],
    mgs: ["metal", "gear", "solid"],
    mhw: ["monster", "hunter", "world"],
    mhr: ["monster", "hunter", "rise"],
    poe: ["path", "of", "exile"],
    ff: ["final", "fantasy"],
    ffxiv: ["final", "fantasy", "xiv"],
    wow: ["world", "of", "warcraft"],
    ets: ["euro", "truck", "simulator"],
    ac: ["assassin", "creed"],
    bg: ["baldur", "gate"],
    dos: ["divinity", "original", "sin"],
    tlou: ["the", "last", "of", "us"],
    msfs: ["microsoft", "flight", "simulator"],
    dbd: ["dead", "by", "daylight"],
    dmc: ["devil", "may", "cry"],
    aoe: ["age", "of", "empires"],
    tw: ["total", "war"],
    pubg: ["pubg", "battlegrounds"],
  };

  // Roman numerals mapping
  const numerals: Record<string, string> = {
    "1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v", "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x",
    "i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10"
  };

  // Expand abbreviations in query words
  const expandedWords: string[] = [];
  for (const word of queryWords) {
    if (abbreviations[word]) {
      expandedWords.push(...abbreviations[word]);
    } else {
      expandedWords.push(word);
    }
  }

  // Every word in query must be represented in the game name
  return expandedWords.every(word => {
    if (cleanName.includes(word)) return true;
    
    // Check Roman numeral equivalence
    if (numerals[word]) {
      const equiv = numerals[word];
      const regex = new RegExp(`\\b${equiv}\\b`);
      if (regex.test(cleanName)) return true;
    }
    
    return false;
  });
}
