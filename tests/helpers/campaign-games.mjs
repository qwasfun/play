// Select by the declared capability; ordinary-only packages need no campaign file.
export const campaignGames=games=>games.filter(game=>game.campaign);
export async function loadCampaignModules(games,load){
  const modules={};
  for(const {id} of campaignGames(games))modules[id]={...await load(`games/${id}/src/index.js`),...await load(`games/${id}/src/campaign.js`)};
  return modules;
}
