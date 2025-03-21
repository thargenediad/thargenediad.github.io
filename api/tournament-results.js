// api/tournament-results.js - for Vercel serverless deployment
const axios = require('axios');
const cheerio = require('cheerio');

// Simple cache implementation (cleared on function instance recycling)
let resultsCache = null;
let lastFetched = null;

// Add the tournament round determination function here
function determineTournamentRound(completedGames) {
  const totalGames = completedGames.length;
  
  if (totalGames < 4) return "First Four";
  if (totalGames < 36) return "Round of 64"; // 4 First Four + up to 32 first round games
  if (totalGames < 52) return "Round of 32"; // Previous + up to 16 second round games
  if (totalGames < 60) return "Sweet 16";    // Previous + up to 8 Sweet 16 games
  if (totalGames < 64) return "Elite Eight"; // Previous + up to 4 Elite Eight games
  if (totalGames < 66) return "Final Four";  // Previous + up to 2 Final Four games
  return "Championship";                     // All games completed
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Use cache if available and recent
    if (resultsCache && lastFetched && (Date.now() - lastFetched < 15 * 60 * 1000)) {
      return res.json(resultsCache);
    }
    
    // Fetch NCAA tournament page
    const response = await axios.get('https://www.ncaa.com/news/basketball-men/mml-official-bracket/2025-03-20/latest-bracket-schedule-and-scores-2025-ncaa-mens-tournament');
    const html = response.data;
    const $ = cheerio.load(html);
    console.log("Data fetched:", html);
    
    // Find results on the page (adjust selectors based on actual page structure)
    const completedGames = [];
    
    // Extract game results
    $('ul li').each((i, elem) => {
      const gameText = $(elem).text().trim();
      
      // Skip games that don't have results yet
      if (!gameText.includes('vs.')) {
        // Find winner (in <strong> tags)
        const winnerText = $(elem).find('strong').text().trim();
        
        // Extract team info using regex
        const winnerRegex = /\((\d+)\)\s+([^,]+)\s+(\d+)/;
        const winnerMatch = winnerText.match(winnerRegex);
        
        if (winnerMatch) {
          const winnerSeed = winnerMatch[1];
          const winnerName = winnerMatch[2].trim();
          const winnerScore = winnerMatch[3];
          
          // Extract loser info
          const loserRegex = /,\s*\((\d+)\)\s+([^,]+)\s+(\d+)/;
          const loserMatch = gameText.match(loserRegex);
          
          if (loserMatch) {
            const loserSeed = loserMatch[1];
            const loserName = loserMatch[2].trim();
            const loserScore = loserMatch[3];
            
            completedGames.push({
              round: 1,
              team1: winnerName,
              seed1: winnerSeed,
              score1: winnerScore,
              team2: loserName,
              seed2: loserSeed,
              score2: loserScore,
              winner: winnerName,
              winnerSeed: winnerSeed
            });
          }
        }
      }
    });
    
    // Determine current tournament round
    const tournamentStatus = determineTournamentRound(completedGames);
    
    // Cache the results
    resultsCache = { tournamentStatus, completedGames };
    
    // For now, return hardcoded results if scraping fails
    // resultsCache = {
    //   tournamentStatus: "Round of 32",
    //   completedGames: [
    //     // Thursday, March 20 results
    //     {round: 1, team1: "Louisville", seed1: "8", team2: "Creighton", seed2: "9", winner: "Creighton", winnerSeed: "9"},
    //     {round: 1, team1: "Purdue", seed1: "4", team2: "High Point", seed2: "13", winner: "Purdue", winnerSeed: "4"},
    //     {round: 1, team1: "Wisconsin", seed1: "3", team2: "Montana", seed2: "14", winner: "Wisconsin", winnerSeed: "3"},
    //     {round: 1, team1: "Houston", seed1: "1", team2: "SIU Edwardsville", seed2: "16", winner: "Houston", winnerSeed: "1"},
    //     {round: 1, team1: "Auburn", seed1: "1", team2: "Alabama State", seed2: "16", winner: "Auburn", winnerSeed: "1"},
    //     {round: 1, team1: "Clemson", seed1: "5", team2: "McNeese", seed2: "12", winner: "McNeese", winnerSeed: "12"},
    //     {round: 1, team1: "BYU", seed1: "6", team2: "VCU", seed2: "11", winner: "BYU", winnerSeed: "6"},
    //     {round: 1, team1: "Gonzaga", seed1: "8", team2: "Georgia", seed2: "9", winner: "Gonzaga", winnerSeed: "8"},
    //     {round: 1, team1: "Tennessee", seed1: "2", team2: "Wofford", seed2: "15", winner: "Tennessee", winnerSeed: "2"},
    //     {round: 1, team1: "Kansas", seed1: "7", team2: "Arkansas", seed2: "10", winner: "Arkansas", winnerSeed: "10"},
    //     {round: 1, team1: "Texas A&M", seed1: "4", team2: "Yale", seed2: "13", winner: "Texas A&M", winnerSeed: "4"}
    //     // Other games scheduled later on Thursday not yet completed
    //   ]
    // };
    
    lastFetched = Date.now();
    return res.json(resultsCache);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      debug: true,
      timestamp: new Date().toISOString(),
      error: error.toString(),
      stack: error.stack
    });
  }
};
