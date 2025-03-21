// server.js - Deploy on Vercel, Netlify, Replit, etc.
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// Cache results to minimize NCAA website hits
let resultsCache = null;
let lastFetched = null;

app.get('/api/tournament-results', async (req, res) => {
  try {
    // Return cached results if less than 15 minutes old
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
    lastFetched = Date.now();
    
    res.json(resultsCache);
  } catch (error) {
    console.error('Error scraping tournament data:', error);
    res.status(500).json({ error: 'Failed to fetch tournament data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
