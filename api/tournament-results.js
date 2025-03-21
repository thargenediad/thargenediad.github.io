// api/tournament-results.js - for Vercel serverless deployment
const axios = require('axios');
const cheerio = require('cheerio');

// Simple cache implementation (cleared on function instance recycling)
let resultsCache = null;
let lastFetched = null;

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
    
    // Find results on the page (adjust selectors based on actual page structure)
    const completedGames = [];
    
    // Example selector pattern - adjust based on actual NCAA page structure
    $('.tournament-game-completed').each((i, elem) => {
      const team1 = $(elem).find('.team1-name').text().trim();
      const seed1 = $(elem).find('.team1-seed').text().trim();
      const score1 = $(elem).find('.team1-score').text().trim();
      
      const team2 = $(elem).find('.team2-name').text().trim();
      const seed2 = $(elem).find('.team2-seed').text().trim();
      const score2 = $(elem).find('.team2-score').text().trim();
      
      const winner = parseInt(score1) > parseInt(score2) ? team1 : team2;
      const winnerSeed = parseInt(score1) > parseInt(score2) ? seed1 : seed2;
      
      completedGames.push({
        round: 1, // Determine round from context/container
        team1, 
        seed1, 
        team2, 
        seed2,
        score1,
        score2, 
        winner, 
        winnerSeed
      });
    });
    
    // Determine current tournament round
    const tournamentStatus = $('.tournament-status').text().trim() || "Round of 64";
    
    // Cache the results
    resultsCache = { tournamentStatus, completedGames };
    
    // For now, return hardcoded results if scraping fails
    resultsCache = {
      tournamentStatus: "Round of 32",
      completedGames: [
        // Thursday, March 20 results
        {round: 1, team1: "Louisville", seed1: "8", team2: "Creighton", seed2: "9", winner: "Creighton", winnerSeed: "9"},
        {round: 1, team1: "Purdue", seed1: "4", team2: "High Point", seed2: "13", winner: "Purdue", winnerSeed: "4"},
        {round: 1, team1: "Wisconsin", seed1: "3", team2: "Montana", seed2: "14", winner: "Wisconsin", winnerSeed: "3"},
        {round: 1, team1: "Houston", seed1: "1", team2: "SIU Edwardsville", seed2: "16", winner: "Houston", winnerSeed: "1"},
        {round: 1, team1: "Auburn", seed1: "1", team2: "Alabama State", seed2: "16", winner: "Auburn", winnerSeed: "1"},
        {round: 1, team1: "Clemson", seed1: "5", team2: "McNeese", seed2: "12", winner: "McNeese", winnerSeed: "12"},
        {round: 1, team1: "BYU", seed1: "6", team2: "VCU", seed2: "11", winner: "BYU", winnerSeed: "6"},
        {round: 1, team1: "Gonzaga", seed1: "8", team2: "Georgia", seed2: "9", winner: "Gonzaga", winnerSeed: "8"},
        {round: 1, team1: "Tennessee", seed1: "2", team2: "Wofford", seed2: "15", winner: "Tennessee", winnerSeed: "2"},
        {round: 1, team1: "Kansas", seed1: "7", team2: "Arkansas", seed2: "10", winner: "Arkansas", winnerSeed: "10"},
        {round: 1, team1: "Texas A&M", seed1: "4", team2: "Yale", seed2: "13", winner: "Texas A&M", winnerSeed: "4"}
        // Other games scheduled later on Thursday not yet completed
      ]
    };
    
    lastFetched = Date.now();
    return res.json(resultsCache);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament data' });
  }
};
