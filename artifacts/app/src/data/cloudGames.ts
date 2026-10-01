export type CloudPlatform =
  | "GeForce NOW"
  | "Xbox Cloud"
  | "Boosteroid"
  | "Luna"
  | "PlayStation Cloud"
  | "Blacknut";

export interface GamePlatformLink {
  platform: CloudPlatform;
  url: string;
}

export interface CloudGame {
  coverImage: string;
  id: string;
  name: string;
  category: string;
  description: string;
  platforms: GamePlatformLink[];
}

export const PLATFORM_INFO: Record<
  CloudPlatform,
  { name: string; tag: string; color: string; badgeBg: string; fallbackUrl: string }
> = {
  "GeForce NOW": {
    name: "GeForce NOW",
    tag: "GFN",
    color: "#76b900",
    badgeBg: "rgba(118, 185, 0, 0.15)",
    fallbackUrl: "https://www.nvidia.com/en-us/geforce-now/games/"
  },
  "Xbox Cloud": {
    name: "Xbox Cloud Gaming",
    tag: "XBOX",
    color: "#107c10",
    badgeBg: "rgba(16, 124, 16, 0.18)",
    fallbackUrl: "https://www.xbox.com/en-US/play"
  },
  Boosteroid: {
    name: "Boosteroid Cloud",
    tag: "BOOST",
    color: "#3b82f6",
    badgeBg: "rgba(59, 130, 246, 0.15)",
    fallbackUrl: "https://boosteroid.com/"
  },
  Luna: {
    name: "Amazon Luna",
    tag: "LUNA",
    color: "#a855f7",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    fallbackUrl: "https://luna.amazon.com/"
  },
  "PlayStation Cloud": {
    name: "PlayStation Cloud",
    tag: "PS CLOUD",
    color: "#0070d1",
    badgeBg: "rgba(0, 112, 209, 0.18)",
    fallbackUrl: "https://www.playstation.com/en-us/ps-now/"
  },
  Blacknut: {
    name: "Blacknut Cloud",
    tag: "BLACKNUT",
    color: "#f59e0b",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    fallbackUrl: "https://www.blacknut.com/en/games"
  }
};

export const CLOUD_GAMES: CloudGame[] = [
  {
    id: "gta-v",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_600x900.jpg",
    name: "Grand Theft Auto V",
    category: "Action / Open World",
    description: "Experience the blockbuster open-world action across Los Santos and Blaine County in high-resolution cloud streaming.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/57" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/grand-theft-auto-v-xbox-one/bpj686w6s0nh" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" }
    ]
  },
  {
    id: "fortnite",
    coverImage: "https://cdn2.unrealengine.com/en-fn-og-41-10-c1s9-egs-launcher-blade-1200x1600-1200x1600-cddf0540168b.jpg",
    name: "Fortnite",
    category: "Battle Royale",
    description: "Drop onto the Island, build, battle, and be the last player standing in Epic Games' iconic battle royale.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/23" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=46bfab06-d864-465d-9e56-2d9e45cdee0a" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/fortnite/BT5P2X999VH2" },
      { platform: "Luna", url: "https://luna.amazon.com/game/fortnite" }
    ]
  },
  {
    id: "cyberpunk-2077",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_600x900.jpg",
    name: "Cyberpunk 2077",
    category: "RPG / Sci-Fi",
    description: "An open-world action-adventure RPG set in the megalopolis of Night City, where you play as a cyberpunk mercenary.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/682" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=e5fc8a96-2cda-49ef-bd13-513bdc68045b" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/cyberpunk-2077/BX3M8L83BBRW" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" },
      { platform: "Blacknut", url: "https://www.blacknut.com/en/games" }
    ]
  },
  {
    id: "elden-ring",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg",
    name: "ELDEN RING",
    category: "Action RPG",
    description: "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/909" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/elden-ring/9nl9dv1sh9ls" }
    ]
  },
  {
    id: "apex-legends",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/library_600x900.jpg",
    name: "Apex Legends",
    category: "Hero Shooter",
    description: "Conquer with character in Apex Legends, a free-to-play battle royale where legendary characters fight for glory.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=cb2b1b5f-54ba-45fd-9839-96bbfe1376cd" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/apex-legends/BV9ML45J2Q5V" }
    ]
  },
  {
    id: "minecraft",
    coverImage: "https://minecraft.wiki/images/MC_vertical_key_art_2024.jpg?1bb06",
    name: "Minecraft",
    category: "Sandbox / Survival",
    description: "Explore infinite worlds and build everything from the simplest of homes to the grandest of castles.",
    platforms: [
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/minecraft/9MVXMVT8ZKWC" }
    ]
  },
  {
    id: "forza-horizon-5",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/library_600x900.jpg",
    name: "Forza Horizon 5",
    category: "Racing / Open World",
    description: "Lead breathtaking expeditions across the vibrant and ever-evolving open world landscapes of Mexico.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=6f5d61af-2cc5-41d5-9f08-1e9bbc75dad6" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/forza-horizon-5-standard-edition/9NKX70BBCDRN" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" }
    ]
  },
  {
    id: "hogwarts-legacy",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/library_600x900.jpg",
    name: "Hogwarts Legacy",
    category: "Action RPG",
    description: "Experience Hogwarts in the 1800s. Your character is a student who holds the key to an ancient secret.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/1166" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=deee193c-00b7-4ecc-aa5f-55f031a86c93" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/hogwarts-legacy/9MT5NJ5W7B8Z" },
      { platform: "Luna", url: "https://luna.amazon.com/game/hogwarts-legacy/B0FVWBCF89" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" }
    ]
  },
  {
    id: "red-dead-redemption-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_600x900.jpg",
    name: "Red Dead Redemption 2",
    category: "Action / Western",
    description: "America, 1899. Arthur Morgan and the Van der Linde gang are outlaws on the run across the rugged heartland.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/726" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/red-dead-redemption-2/9N2ZDN7NWQKV" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" }
    ]
  },
  {
    id: "witcher-3",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/library_600x900.jpg",
    name: "The Witcher 3: Wild Hunt",
    category: "RPG",
    description: "You are Geralt of Rivia, mercenary monster slayer. A war-torn, monster-infested continent is yours to explore.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/28" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=23346751-e1e5-40c6-8899-ec3fe6962e3a" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/the-witcher-3-wild-hunt/br765873cqjd" }
    ]
  },
  {
    id: "marvel-rivals",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2767030/library_600x900.jpg",
    name: "Marvel Rivals",
    category: "Hero Shooter",
    description: "A fast-paced, 6v6 superhero team-based PVP shooter featuring Marvel characters and destructible environments.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=4b44eb06-3d68-4ca0-92b8-ce4ffd20dff4" }
    ]
  },
  {
    id: "halo-infinite",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1240440/library_600x900.jpg",
    name: "Halo Infinite",
    category: "FPS / Sci-Fi",
    description: "When all hope is lost and humanity's fate hangs in the balance, the Master Chief is ready to confront the most ruthless foe.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=e758fbb3-5a92-431d-91df-dd404e16437b" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/halo-infinite/9np1p1wfs0lb" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" },
      { platform: "Blacknut", url: "https://www.blacknut.com/en/games" }
    ]
  },
  {
    id: "counter-strike-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_600x900.jpg",
    name: "Counter-Strike 2",
    category: "Tactical FPS",
    description: "The largest technical leap forward in Counter-Strike history, building on Valve's premier competitive shooter.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/54" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=dcff9c03-5971-4992-ab7d-0f655ef0bfe2" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" }
    ]
  },
  {
    id: "pubg",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/578080/library_600x900.jpg",
    name: "PUBG: Battlegrounds",
    category: "Battle Royale",
    description: "Land, loot, and outwit your opponents to become the lone survivor in a thrilling battle royale match.",
    platforms: [
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/pubg-battlegrounds/c0mn5dn8kr3f" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" },
      { platform: "Blacknut", url: "https://www.blacknut.com/en/games" }
    ]
  },
  {
    id: "genshin-impact",
    coverImage: "https://cdn2.unrealengine.com/egs-genshin-impact-4-7-carousel-mobile-1200x1600-d79d1e157e6a.jpeg",
    name: "Genshin Impact",
    category: "Action RPG",
    description: "Step into Teyvat, a vast world teeming with life and flowing with elemental energy in this expansive fantasy RPG.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/856" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=64cc9e92-6ad6-49b9-a335-8a579ba7b434" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/genshin-impact/9N7TFFRRZCC9" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" }
    ]
  },
  {
    id: "monster-hunter-wilds",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2246340/library_600x900.jpg",
    name: "Monster Hunter Wilds",
    category: "Action / Hunting",
    description: "The next generation of monster hunting with dynamic weather systems and breathtaking untamed ecosystems.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=8a8a22cc-b881-4a71-83c7-1c7f55687b34" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/monster-hunter-wilds/9nmt6xfn0lvd" }
    ]
  },
  {
    id: "the-sims-4",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/library_600x900.jpg",
    name: "The Sims 4",
    category: "Simulation",
    description: "Unleash your imagination and create a unique world of Sims that's an expression of you.",
    platforms: [
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/the-sims-4/c08jxnk0vg5l" }
    ]
  },
  {
    id: "dota-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/570/library_600x900.jpg",
    name: "Dota 2",
    category: "MOBA",
    description: "Every day, millions of players worldwide enter battle as one of over a hundred Dota heroes.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/55" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=432ddb0d-1f56-4546-ba6e-2091e615c1fc" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" },
      { platform: "Blacknut", url: "https://www.blacknut.com/en/games" }
    ]
  },
  {
    id: "roblox",
    coverImage: "https://images.launchbox-app.com/c037d380-fb97-4666-aac5-6d5310641023.jpg",
    name: "Roblox",
    category: "Platform / Sandbox",
    description: "Explore millions of immersive 3D digital experiences created by a global community of developers.",
    platforms: [
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/roblox-xbox/bq1tn1t79v9k" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" }
    ]
  },
  {
    id: "overwatch-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/library_600x900.jpg",
    name: "Overwatch 2",
    category: "Hero Shooter",
    description: "An always-on and free-to-play, team-based action game set in an optimistic future with dozens of unique heroes.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/100" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=405b1ba5-c881-4f2b-8f7d-cc9e7cd59b74" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/overwatch-2/c1c4dzjpbc2v" },
      { platform: "Blacknut", url: "https://www.blacknut.com/en/games" }
    ]
  },
  {
    id: "cod-warzone",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1962663/library_600x900.jpg",
    name: "Call of Duty: Warzone",
    category: "Battle Royale / FPS",
    description: "Massive free-to-play combat arena featuring battle royale and resurgence game modes.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/1121" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=8bfa0687-60fc-425e-9f10-6232693b90d7" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/call-of-duty-warzone/9NNFG8BQRCXL" }
    ]
  },
  {
    id: "ea-sports-fc-25",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/library_600x900.jpg",
    name: "EA Sports FC 25",
    category: "Sports / Football",
    description: "The world's game with over 19,000 players, 700+ teams, and 30+ leagues in cutting-edge football simulation.",
    platforms: [
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/ea-sports-fc-25-xbox-series-xs/9nnpstwt06vm" },
      { platform: "PlayStation Cloud", url: "https://www.playstation.com/en-us/ps-now/" }
    ]
  },
  {
    id: "honkai-star-rail",
    coverImage: "https://cdn2.unrealengine.com/egs-honkai-star-rail-2-3-carousel-mobile-1200x1600-aa5aa05b05a5.jpg",
    name: "Honkai: Star Rail",
    category: "Turn-Based RPG",
    description: "Hop aboard the Astral Express and experience the galaxy's infinite wonders filled with adventure and thrills.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=f66d19a8-4d80-406f-b1f0-075ff5e9b51c" }
    ]
  },
  {
    id: "avowed",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2457220/library_600x900.jpg",
    name: "Avowed",
    category: "Action RPG",
    description: "Explore the Living Lands, a mysterious island full of adventure and danger set in the fantasy world of Eora.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=2a895e62-4d91-43d0-9fe7-8eccd7fa3252" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/avowed/9msvpjchhrpr" }
    ]
  },
  {
    id: "baldurs-gate-3",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/library_600x900.jpg",
    name: "Baldur's Gate 3",
    category: "CRPG",
    description: "Gather your party and return to the Forgotten Realms in a tale of fellowship, sacrifice, and the ultimate struggle for power.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/994" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=095ad0c3-2167-45f1-aa80-1eceacbdeebb" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/baldur's-gate-3/9nd58lqtg09t" }
    ]
  },
  {
    id: "starfield",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/library_600x900.jpg",
    name: "Starfield",
    category: "Sci-Fi RPG",
    description: "Bethesda's next-generation role-playing game set amongst the stars. Create any character you want and explore with freedom.",
    platforms: [
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/starfield/9ncjsxwztp88" }
    ]
  },
  {
    id: "diablo-iv",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/library_600x900.jpg",
    name: "Diablo IV",
    category: "Action RPG",
    description: "The endless battle between the High Heavens and the Burning Hells rages on as chaos threatens to consume Sanctuary.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=d32c9410-62cb-45cf-9c53-740bb92d4a2d" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/diablo-iv/9n8117tm8jl3" }
    ]
  },
  {
    id: "destiny-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1085660/library_600x900.jpg",
    name: "Destiny 2",
    category: "MMO FPS",
    description: "Dive into the world of Destiny 2 to explore the mysteries of the solar system and experience responsive first-person shooter combat.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/111" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=d1768dc1-b451-449a-8f7f-cf5b20f98f6f" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/destiny-2/9p9wj5fw0gtd" }
    ]
  },
  {
    id: "rocket-league",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/library_600x900.jpg",
    name: "Rocket League",
    category: "Sports / Action",
    description: "Soccer meets driving in this award-winning physics-based multiplayer vehicular mayhem.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/328" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=9bcbf5b4-c460-4091-931c-a5a2a1fd9cc2" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/rocket-league/c125w9bg2k0v" }
    ]
  },
  {
    id: "rainbow-six-siege",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/359550/library_600x900.jpg",
    name: "Rainbow Six Siege",
    category: "Tactical Shooter",
    description: "Master the art of destruction and gadgetry in tense close-quarters team combat.",
    platforms: [
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play" }
    ]
  },
  {
    id: "no-mans-sky",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/275850/library_600x900.jpg",
    name: "No Man's Sky",
    category: "Survival / Exploration",
    description: "Explore a procedurally generated universe full of unique planets, alien species, and infinite danger.",
    platforms: [
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play" }
    ]
  },
  {
    id: "palworld",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/library_600x900.jpg",
    name: "Palworld",
    category: "Survival / Monster Taming",
    description: "Fight, farm, build and work alongside mysterious creatures called Pals in this open-world survival crafting game.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=a6c2a87a-b97a-4626-ab23-aa5883cfaed3" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/palworld-game-preview/9nkv34xdw014" }
    ]
  },
  {
    id: "stardew-valley",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/library_600x900.jpg",
    name: "Stardew Valley",
    category: "Simulation / RPG",
    description: "You've inherited your grandfather's old farm plot. Armed with hand-me-down tools and a few coins, start a new life.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/990" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=fd6716b9-b3d0-4642-ab7a-bd1b2122bac2" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/stardew-valley/c3d891z6tnqm" }
    ]
  },
  {
    id: "deep-rock-galactic",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/548430/library_600x900.jpg",
    name: "Deep Rock Galactic",
    category: "Co-op FPS",
    description: "1-4 player co-op FPS featuring badass space Dwarves, 100% destructible environments, procedurally-generated caves, and hordes of alien monsters.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/863" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=30cf85d6-5fe2-4e4c-b131-6d6a5e938101" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/deep-rock-galactic/9nhfvwx1v7qj" }
    ]
  },
  {
    id: "battlefield-2042",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1517290/library_600x900.jpg",
    name: "Battlefield 2042",
    category: "Action / FPS",
    description: "First-person shooter that marks the return to the iconic all-out warfare of the franchise with cutting-edge technology.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=2584fa7f-a3fd-4c6c-9f64-ed0154f6a0c4" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/battlefield-2042-xbox-series-xs/9p0t51bddwvt" }
    ]
  },
  {
    id: "hitman-woa",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1659040/library_600x900.jpg",
    name: "HITMAN World of Assassination",
    category: "Stealth / Action",
    description: "Enter the world of the ultimate assassin. Become Agent 47 in this globetrotting stealth thriller.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/973" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=7a403bd1-bb9a-4a3d-b4aa-26e53cb02a13" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/hitman-world-of-assassination/9nn82nh949d5" }
    ]
  },
  {
    id: "farming-simulator-25",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2300320/library_600x900.jpg",
    name: "Farming Simulator 25",
    category: "Simulation",
    description: "Establish your agricultural empire with authentic machinery across diverse international environments.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=6eb99257-edcb-4db0-8f58-c6e95b1f9027" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/farming-simulator-25/9nmcdq6rcjkh" }
    ]
  },
  {
    id: "dragons-dogma-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2054970/library_600x900.jpg",
    name: "Dragon's Dogma 2",
    category: "Action RPG",
    description: "A narrative-driven action-RPG series that challenges the players to choose their own experience.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=0e0fa489-80ce-4944-953f-99193b10dfdf" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/dragons-dogma-2/9pjqmbmj3154" }
    ]
  },
  {
    id: "payday-3",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1272080/library_600x900.jpg",
    name: "Payday 3",
    category: "Co-op Heist",
    description: "The anticipated sequel to one of the most popular co-op shooters ever. Relive the thrill of a perfectly planned heist.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=239bc48a-68bb-4a0c-9a6b-0dbf07588a58" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/payday-3/9npzvdch73sx" }
    ]
  },
  {
    id: "control",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/870780/library_600x900.jpg",
    name: "Control",
    category: "Action / Supernatural",
    description: "A third-person supernatural action-adventure game set in the shifting, secretive Federal Bureau of Control.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/210" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=df7191a4-1233-4944-9079-b9ed363008c1" },
      { platform: "Luna", url: "https://luna.amazon.com/game/control-ultimate-edition" }
    ]
  },
  {
    id: "death-stranding",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1850570/library_600x900.jpg",
    name: "Death Stranding",
    category: "Action / Adventure",
    description: "From legendary game creator Hideo Kojima comes an all-new, genre-defying open world action adventure.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/1140" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=48a598f8-4719-4d9f-b2db-f2f7461c40f7" }
    ]
  },
  {
    id: "chivalry-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1213820/library_600x900.jpg",
    name: "Chivalry 2",
    category: "Action / Medieval",
    description: "A multiplayer first person slasher inspired by epic medieval movie battles with 64-player battlefields.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/1045" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=5dbb12ed-fcda-43c9-82e3-52b214521a9f" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/chivalry-2/9n7cjx93zgwn" }
    ]
  },
  {
    id: "hell-let-loose",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/686810/library_600x900.jpg",
    name: "Hell Let Loose",
    category: "Tactical FPS / WWII",
    description: "A hardcore World War Two first person shooter with epic battles of 100 players with infantry, tanks, and artillery.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/1008" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=9357241e-49a8-476c-bbb8-6fa5e55f25f8" }
    ]
  },
  {
    id: "path-of-exile",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/238960/library_600x900.jpg",
    name: "Path of Exile",
    category: "Action RPG",
    description: "An online Action RPG set in the dark fantasy world of Wraeclast with deep character customization.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/33" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=b48796f4-e4ab-46aa-b82e-de3d5e45b751" }
    ]
  },
  {
    id: "war-thunder",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/236390/library_600x900.jpg",
    name: "War Thunder",
    category: "Vehicular Combat",
    description: "A free-to-play, cross-platform MMO combat game dedicated to military vehicles used in aviation, armored vehicles, and naval fleets.",
    platforms: [
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=956b4ff0-4fa7-43ca-a565-a552723977bb" }
    ]
  },
  {
    id: "team-fortress-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/440/library_600x900.jpg",
    name: "Team Fortress 2",
    category: "Team FPS",
    description: "One of the most popular online action games of all time, delivering constant free updates and unique character classes.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/107" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=40512534-ad27-4a12-afa7-6fc412288072" }
    ]
  },
  {
    id: "god-of-war",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/library_600x900.jpg",
    name: "God of War",
    category: "Action / Adventure",
    description: "His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods and monsters.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/886" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=423b98a9-a629-4ff2-b951-3824bff9e114" }
    ]
  },
  {
    id: "ac-mirage",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2973090/library_600x900.jpg",
    name: "Assassin's Creed Mirage",
    category: "Action / Stealth",
    description: "Experience the story of Basim, a cunning street thief seeking answers and justice on the crowded streets of ninth-century Baghdad.",
    platforms: [
      { platform: "Boosteroid", url: "https://cloud.boosteroid.com/application/1821" },
      { platform: "GeForce NOW", url: "https://play.geforcenow.com/games?game-id=af8443a4-fc41-459d-bbc6-c412adf0856b" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/assassins-creed-mirage/9nrpwttjhnbc" }
    ]
  },
  {
    id: "nba-2k27",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/4356430/library_600x900.jpg",
    name: "NBA 2K27",
    category: "Sports / Basketball",
    description: "Authentic NBA basketball simulation with deep player customization and franchise modes.",
    platforms: [
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play" },
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" }
    ]
  },
  {
    id: "ac-odyssey",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/812140/library_600x900.jpg",
    name: "Assassin's Creed Odyssey",
    category: "Action RPG",
    description: "Write your own epic odyssey and become a legendary Spartan hero in Ancient Greece.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/assassins-creed-odyssey" },
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" }
    ]
  },
  {
    id: "plague-tale-innocence",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/756090/library_600x900.jpg",
    name: "A Plague Tale: Innocence",
    category: "Adventure / Stealth",
    description: "Follow the grim tale of young Amicia and her little brother Hugo, in a heartrending journey through the darkest hours of history.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/a-plague-tale-innocence" }
    ]
  },
  {
    id: "abzu",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/384190/library_600x900.jpg",
    name: "Abzû",
    category: "Adventure / Exploration",
    description: "From the art director of Journey, ABZÛ is a beautiful underwater adventure that evokes the dream of diving.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/abzu" }
    ]
  },
  {
    id: "blair-witch",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1087690/library_600x900.jpg",
    name: "Blair Witch",
    category: "Horror / Psychological",
    description: "A first-person, story-driven psychological horror game based on the cinematic lore of Blair Witch.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/blair-witch" }
    ]
  },
  {
    id: "blasphemous",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/774361/library_600x900.jpg",
    name: "Blasphemous",
    category: "Metroidvania / Action",
    description: "A brutal action-platformer that combines fast-paced, skilled hack-n-slash combat with a deep, evocative narrative.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/blasphemous" }
    ]
  },
  {
    id: "bloodstained",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/698640/library_600x900.jpg",
    name: "Bloodstained: Ritual of the Night",
    category: "Metroidvania / RPG",
    description: "A gothic horror action side-scrolling RPG set in 19th century England led by Koji Igarashi.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/bloodstained-ritual-of-the-night" }
    ]
  },
  {
    id: "brothers-two-sons",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/225080/library_600x900.jpg",
    name: "Brothers: A Tale of Two Sons",
    category: "Adventure / Puzzle",
    description: "Guide two brothers on an epic fairy tale journey from visionary Swedish film director Josef Fares.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/brothers-a-tale-of-two-sons" }
    ]
  },
  {
    id: "call-of-the-sea",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1137310/library_600x900.jpg",
    name: "Call of the Sea",
    category: "Puzzle / Adventure",
    description: "An otherworldly tale of mystery and love set in the 1930s South Pacific.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/call-of-the-sea" }
    ]
  },
  {
    id: "chorus",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1321010/library_600x900.jpg",
    name: "Chorus",
    category: "Space Combat",
    description: "Take control of Nara, once the Circle's deadliest warrior, on a quest to destroy the dark cult that created her.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/chorus" }
    ]
  },
  {
    id: "crosscode",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/813780/library_600x900.jpg",
    name: "CrossCode",
    category: "Action RPG",
    description: "A retro-inspired 2D Action RPG set in the distant future with fast-paced combat and puzzle mechanics.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/crosscode" }
    ]
  },
  {
    id: "dirt-5",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1237940/library_600x900.jpg",
    name: "DiRT 5",
    category: "Racing / Off-road",
    description: "Blaze a trail across the world's most iconic off-road routes in an exhilarating arcade racing experience.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/dirt-5" }
    ]
  },
  {
    id: "dirt-rally-2",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/690790/library_600x900.jpg",
    name: "DiRT Rally 2.0",
    category: "Sim Racing",
    description: "Dare to race through the most iconic rally locations across the globe in powerful off-road vehicles.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/dirt-rally-2-0" }
    ]
  },
  {
    id: "everspace",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/396700/library_600x900.jpg",
    name: "Everspace",
    category: "Space Roguelike",
    description: "Action-focused single-player space shooter combining roguelike elements with top-notch visuals.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/everspace" }
    ]
  },
  {
    id: "far-cry-5",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/552520/library_600x900.jpg",
    name: "Far Cry 5",
    category: "Action / FPS",
    description: "Welcome to Hope County, Montana, land of the free and the brave, but also home to a fanatical doomsday cult.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/far-cry-5" },
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" }
    ]
  },
  {
    id: "far-cry-6",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2369390/library_600x900.jpg",
    name: "Far Cry 6",
    category: "Action / FPS",
    description: "Welcome to Yara, a tropical paradise frozen in time. As the dictator Anton Castillo seeks to restore his nation, ignite a revolution.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/far-cry-6" },
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" }
    ]
  },
  {
    id: "far-cry-primal",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/373930/library_600x900.jpg",
    name: "Far Cry Primal",
    category: "Action / Survival",
    description: "Welcome to the Stone Age, a time of extreme danger and limitless adventure, where giant beasts rule the Earth.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/far-cry-primal" }
    ]
  },
  {
    id: "furi",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/423230/library_600x900.jpg",
    name: "Furi",
    category: "Action / Boss Rush",
    description: "Fight your way free in this ultra-responsive, fast-paced sword fighting and dual-stick shooting game.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/furi" }
    ]
  },
  {
    id: "ghostrunner",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1139900/library_600x900.jpg",
    name: "Ghostrunner",
    category: "Cyberpunk Action",
    description: "Offers a unique single-player experience: fast-paced, violent combat, and an original setting that blends science fiction with post-apocalyptic themes.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/ghostrunner" },
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" }
    ]
  },
  {
    id: "ghost-of-a-tale",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/417290/library_600x900.jpg",
    name: "Ghost of a Tale",
    category: "Action / Stealth",
    description: "An action-RPG game in which you play as Tilo, a mouse and minstrel thrown into a perilous adventure.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/ghost-of-a-tale" }
    ]
  },
  {
    id: "bug-fables",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1082710/library_600x900.jpg",
    name: "Bug Fables: The Everlasting Sapling",
    category: "Adventure RPG",
    description: "Follow Vi, Kabbu, and Leif as they uncover the secrets of the land of Bugaria in search of immortality.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/bug-fables-the-everlasting-sapling" }
    ]
  },
  {
    id: "castlevania-collection",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1097520/library_600x900.jpg",
    name: "Castlevania Anniversary Collection",
    category: "Retro / Classic",
    description: "Traces the origins of the historic vampire franchise featuring timeless 8-bit and 16-bit classics.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/castlevania-anniversary-collection" }
    ]
  },
  {
    id: "contra-collection",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1097530/library_600x900.jpg",
    name: "Contra Anniversary Collection",
    category: "Retro / Run & Gun",
    description: "Brings this classic Run and Gun franchise back to modern platforms and a new generation of gamers.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/contra-anniversary-collection" }
    ]
  },
  {
    id: "endling",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1321440/library_600x900.jpg",
    name: "Endling: Extinction Is Forever",
    category: "Adventure / Survival",
    description: "Experience a world ravaged by mankind through the eyes of the last mother fox on Earth.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/endling-extinction-is-forever" }
    ]
  },
  {
    id: "avatar-frontiers",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2531320/library_600x900.jpg",
    name: "Avatar: Frontiers of Pandora",
    category: "Action / Sci-Fi",
    description: "Set in the Western Frontier, reconnect with your lost heritage and discover what it truly means to be Na'vi.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/avatar-frontiers-of-pandora" },
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" }
    ]
  },
  {
    id: "deponia-doomsday",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/398200/library_600x900.jpg",
    name: "Deponia Doomsday",
    category: "Point & Click / Comedy",
    description: "Can you change the fate of Deponia? Do you have what it takes to alter Rufus' past, present and future?",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/deponia-doomsday" }
    ]
  },
  {
    id: "disc-room",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/962360/library_600x900.jpg",
    name: "Disc Room",
    category: "Arcade / Bullet Hell",
    description: "Step into the oversized spacesuit of a brave scientist and explore a sprawling supernatural disc-filled slaughterhouse.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/disc-room" }
    ]
  },
  {
    id: "ac-valhalla",
    coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2208940/library_600x900.jpg",
    name: "Assassin's Creed Valhalla",
    category: "Action RPG",
    description: "Become Eivor, a legendary Viking warrior raised on tales of battle and glory in 9th-century England.",
    platforms: [
      { platform: "Luna", url: "https://luna.amazon.com/game/assassins-creed-valhalla" },
      { platform: "GeForce NOW", url: "https://www.nvidia.com/en-us/geforce-now/games/" },
      { platform: "Xbox Cloud", url: "https://www.xbox.com/en-US/play/games/assassins-creed-valhalla/9p2n57mc619k" }
    ]
  }
];


// ─── Play Tracking & Most Played Helpers ─────────────────────────────────────

const CLOUD_GAMES_PLAY_KEY = "unstable_cloud_games_play_count";
const CLOUD_GAMES_RECENT_KEY = "unstable_cloud_games_recent";

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function trackCloudGamePlay(gameId: string) {
  const counts = safeGetStorage<Record<string, number>>(CLOUD_GAMES_PLAY_KEY, {});
  counts[gameId] = (counts[gameId] || 0) + 1;
  safeSetStorage(CLOUD_GAMES_PLAY_KEY, counts);

  const recent = safeGetStorage<string[]>(CLOUD_GAMES_RECENT_KEY, []);
  const idx = recent.indexOf(gameId);
  if (idx !== -1) recent.splice(idx, 1);
  recent.unshift(gameId);
  if (recent.length > 30) recent.length = 30;
  safeSetStorage(CLOUD_GAMES_RECENT_KEY, recent);
}

export function getCloudGamePlayCounts(): Record<string, number> {
  return safeGetStorage<Record<string, number>>(CLOUD_GAMES_PLAY_KEY, {});
}

export function getMostPlayedCloudGames(limit: number = 10): CloudGame[] {
  const counts = getCloudGamePlayCounts();
  const gameMap = new Map<string, CloudGame>(CLOUD_GAMES.map((g) => [g.id, g]));

  // Sort played games by count descending
  const playedEntries = Object.entries(counts)
    .filter(([id, count]) => count > 0 && gameMap.has(id))
    .sort((a, b) => b[1] - a[1]);

  const result: CloudGame[] = [];
  const addedIds = new Set<string>();

  for (const [id] of playedEntries) {
    const game = gameMap.get(id);
    if (game && !addedIds.has(id)) {
      result.push(game);
      addedIds.add(id);
      if (result.length >= limit) break;
    }
  }

  // If user hasn't played enough games yet, fill with top default showcase games
  if (result.length < limit) {
    for (const game of CLOUD_GAMES) {
      if (!addedIds.has(game.id)) {
        result.push(game);
        addedIds.add(game.id);
        if (result.length >= limit) break;
      }
    }
  }

  return result.slice(0, limit);
}
