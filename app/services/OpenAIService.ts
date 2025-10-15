// services/OpenAIService.ts
import { Ingredient, Recipe } from './DatabaseService';

// IMPORTANT: Replace with your actual OpenAI API key
// You can get one from: https://platform.openai.com/api-keys
const OPENAI_API_KEY = '//';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface RecipeSuggestion {
  name: string;
  glass: string;
  ingredients: string;
  instructions: string;
}

export interface MultipleRecipesResponse {
  recipes: RecipeSuggestion[];
}

class OpenAIServiceClass {
  private apiKey: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = OPENAI_API_KEY;
    this.isConfigured = OPENAI_API_KEY == '//' && OPENAI_API_KEY.length > 0;
  }

  // Set API key programmatically (useful for user input)
  setApiKey(key: string) {
    this.apiKey = key;
    this.isConfigured = key.length > 0;
  }

  // Check if API is configured
  isApiConfigured(): boolean {
    return this.isConfigured;
  }

  // Generate cocktail recipe(s) using OpenAI - can return multiple recipes
  async generateCocktailRecipe(
    userMessage: string,
    inventory: Ingredient[]
  ): Promise<RecipeSuggestion> {
    if (!this.isConfigured) {
      console.log('OpenAI API not configured, using fallback');
      return this.getFallbackRecipe();
    }

    const inventoryList = inventory.length > 0
      ? inventory.map(item => `${item.name} (${item.category})`).join(', ')
      : 'No inventory available';

    // Check if user is requesting multiple recipes
    const multipleRecipeKeywords = ['recipes', 'suggestions', 'options', 'cocktails', 'multiple', 'few', 'several', 'some'];
    const requestsMultiple = multipleRecipeKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );

    // Extract number if specified (e.g., "3 recipes", "5 cocktails")
    const numberMatch = userMessage.match(/(\d+)\s*(recipe|cocktail|drink|suggestion)/i);
    const requestedCount = numberMatch ? parseInt(numberMatch[1]) : (requestsMultiple ? 3 : 1);
    const actualCount = Math.min(Math.max(requestedCount, 1), 5); // Limit between 1-5

    const systemPrompt = requestsMultiple || actualCount > 1
      ? `You are an expert mixologist and cocktail creator. Create ${actualCount} different cocktail recipes based on the user's request.

Available ingredients in their bar: ${inventoryList}

IMPORTANT: You must respond with ONLY a valid JSON object with an array of recipes in this exact format:
{
  "recipes": [
    {
      "name": "Cocktail Name 1",
      "glass": "rocks|highball|coupe|martini|wine|shot",
      "ingredients": "Detailed ingredient list with exact measurements",
      "instructions": "Step-by-step preparation instructions"
    },
    {
      "name": "Cocktail Name 2",
      "glass": "rocks|highball|coupe|martini|wine|shot",
      "ingredients": "Detailed ingredient list with exact measurements",
      "instructions": "Step-by-step preparation instructions"
    }
  ]
}

Provide ${actualCount} different recipes. Use ingredients from their inventory when possible.
Make sure each glass type is one of: rocks, highball, coupe, martini, wine, or shot.`
      : `You are an expert mixologist and cocktail creator. Create a detailed cocktail recipe based on the user's request.

Available ingredients in their bar: ${inventoryList}

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "name": "Cocktail Name",
  "glass": "rocks|highball|coupe|martini|wine|shot",
  "ingredients": "Detailed ingredient list with exact measurements (e.g., 60ml Gin, 30ml Vermouth, etc.)",
  "instructions": "Step-by-step preparation instructions"
}

Use ingredients from their inventory when possible, but you can suggest alternatives if needed.
Make sure the glass type is one of: rocks, highball, coupe, martini, wine, or shot.`;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.8,
          max_tokens: requestsMultiple ? 1200 : 600,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error:', response.status, errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        
        // Check if it's a multiple recipes response
        if (parsed.recipes && Array.isArray(parsed.recipes)) {
          // Return first recipe (for backward compatibility)
          // The array will be handled by the chat screen
          const recipe = parsed.recipes[0];
          
          if (!recipe.name || !recipe.glass || !recipe.ingredients || !recipe.instructions) {
            throw new Error('Invalid recipe format');
          }

          // Validate glass type
          const validGlasses = ['rocks', 'highball', 'coupe', 'martini', 'wine', 'shot'];
          if (!validGlasses.includes(recipe.glass)) {
            recipe.glass = 'rocks';
          }

          return recipe;
        } else {
          // Single recipe response
          const recipe: RecipeSuggestion = parsed;
          
          if (!recipe.name || !recipe.glass || !recipe.ingredients || !recipe.instructions) {
            throw new Error('Invalid recipe format');
          }

          // Validate glass type
          const validGlasses = ['rocks', 'highball', 'coupe', 'martini', 'wine', 'shot'];
          if (!validGlasses.includes(recipe.glass)) {
            recipe.glass = 'rocks';
          }

          return recipe;
        }
      } catch (parseError) {
        console.error('Error parsing recipe JSON:', parseError);
        throw new Error('Failed to parse recipe from AI');
      }
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return this.getFallbackRecipe();
    }
  }

  // New method to generate multiple recipes at once
  async generateMultipleRecipes(
    userMessage: string,
    inventory: Ingredient[],
    count: number = 3
  ): Promise<RecipeSuggestion[]> {
    if (!this.isConfigured) {
      console.log('OpenAI API not configured, using fallback');
      return this.getMultipleFallbackRecipes(count);
    }

    const inventoryList = inventory.length > 0
      ? inventory.map(item => `${item.name} (${item.category})`).join(', ')
      : 'No inventory available';

    const actualCount = Math.min(Math.max(count, 1), 5); // Limit between 1-5

    const systemPrompt = `You are an expert mixologist and cocktail creator. Create ${actualCount} different and diverse cocktail recipes based on the user's request.

Available ingredients in their bar: ${inventoryList}

IMPORTANT: You must respond with ONLY a valid JSON object with an array of recipes in this exact format:
{
  "recipes": [
    {
      "name": "Cocktail Name 1",
      "glass": "rocks|highball|coupe|martini|wine|shot",
      "ingredients": "Detailed ingredient list with exact measurements",
      "instructions": "Step-by-step preparation instructions"
    }
  ]
}

Provide ${actualCount} DIFFERENT recipes with variety in spirits, flavors, and styles.
Use ingredients from their inventory when possible.
Make sure each glass type is one of: rocks, highball, coupe, martini, wine, or shot.`;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.9, // Higher temperature for more variety
          max_tokens: 1500,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed: MultipleRecipesResponse = JSON.parse(content);

      if (!parsed.recipes || !Array.isArray(parsed.recipes)) {
        throw new Error('Invalid recipes format');
      }

      // Validate and clean up each recipe
      const validGlasses = ['rocks', 'highball', 'coupe', 'martini', 'wine', 'shot'];
      const validatedRecipes = parsed.recipes
        .filter(recipe => recipe.name && recipe.glass && recipe.ingredients && recipe.instructions)
        .map(recipe => ({
          ...recipe,
          glass: validGlasses.includes(recipe.glass) ? recipe.glass : 'rocks'
        }));

      return validatedRecipes.length > 0 ? validatedRecipes : this.getMultipleFallbackRecipes(count);
    } catch (error) {
      console.error('OpenAI Multiple Recipes Error:', error);
      return this.getMultipleFallbackRecipes(count);
    }
  }

  // Get chat response using OpenAI
  async getChatResponse(
    recipes: string,
    chatHistory: Array<{ role: string; content: string }>,
    message: string,
  ): Promise<string> {
    if (!this.isConfigured) {
      console.log('OpenAI API not configured, using fallback');
      return this.getFallbackChatResponse(message);
    }

    const recipesJson = JSON.stringify({ recipes });

    const systemPrompt = `You are Recip.ez AI, an expert mixologist and professional cocktail assistant. 
You help users manage their bar inventory and create amazing cocktails. You are apart of the second part of the process, where you take the cocktail recipes generated by the AI and write them out in a friendly, engaging manner for the user.

These are the users generated cocktail recipes:
${recipesJson}


Your role:
- Write out the descriptions of the cocktail recipes in a friendly, engaging manner
- Do not just repeat the recipe back to the user
- Describe the flavor profile, history, and interesting facts about the cocktail
- Provide tips on how to best enjoy the cocktail  
- Dont use markdown or code blocks
- Use proper grammar and punctuation
- Keep it concise but informative (100 words max per cocktail)

Guidelines:
- Be friendly but professional

IMPORTANT: Your cocktail suggestions must align with the recipes provided. Do not suggest anything outside of those recipes.`;

    try {
      // Only keep last 6 messages for context (to manage token usage)
      const recentHistory = chatHistory.slice(-6);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: message },
      ];

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 350,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error:', response.status, errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI Chat Error:', error);
      // Return fallback response on error
      return this.getFallbackChatResponse(message);
    }
  }

  // Fallback recipe suggestions when API is not available
  getFallbackRecipe(): RecipeSuggestion {
    const recipes: RecipeSuggestion[] = [
      {
        name: 'Classic Negroni',
        glass: 'rocks',
        ingredients: '30ml Gin\n30ml Campari\n30ml Sweet Vermouth\nOrange peel for garnish',
        instructions: '1. Add all spirits to a mixing glass with ice\n2. Stir for 30 seconds to achieve proper dilution\n3. Strain over fresh ice in a rocks glass\n4. Express orange peel oils over the surface\n5. Garnish with the orange peel',
      },
      {
        name: 'Old Fashioned',
        glass: 'rocks',
        ingredients: '60ml Bourbon Whiskey\n1 sugar cube (or 5ml simple syrup)\n2-3 dashes Angostura bitters\nOrange peel\nLuxardo cherry (optional)',
        instructions: '1. Muddle sugar cube with bitters and a splash of water\n2. Add bourbon and large ice cube\n3. Stir gently for 20-30 seconds\n4. Express orange peel over the drink\n5. Garnish with orange peel and cherry',
      },
      {
        name: 'Classic Margarita',
        glass: 'coupe',
        ingredients: '50ml Tequila (Blanco)\n25ml Cointreau or Triple Sec\n25ml Fresh lime juice\nSalt for rim\nLime wheel for garnish',
        instructions: '1. Run lime wedge around rim of glass and dip in salt\n2. Add all ingredients to a shaker with ice\n3. Shake vigorously for 15 seconds\n4. Strain into prepared coupe glass\n5. Garnish with lime wheel',
      },
      {
        name: 'Mojito',
        glass: 'highball',
        ingredients: '50ml White Rum\n25ml Fresh lime juice\n15ml Simple syrup\n8-10 fresh mint leaves\nSoda water\nMint sprig and lime wheel for garnish',
        instructions: '1. Gently muddle mint leaves with simple syrup\n2. Add lime juice and rum\n3. Fill glass with crushed ice\n4. Stir well to combine\n5. Top with soda water\n6. Garnish with mint sprig and lime wheel',
      },
      {
        name: 'Whiskey Sour',
        glass: 'coupe',
        ingredients: '60ml Bourbon Whiskey\n30ml Fresh lemon juice\n22ml Simple syrup\n1 Egg white (optional)\n3 drops Angostura bitters\nLemon wheel and cherry for garnish',
        instructions: '1. If using egg white, dry shake all ingredients first (no ice)\n2. Add ice and shake vigorously for 15 seconds\n3. Double strain into chilled coupe glass\n4. If using egg white, float bitters on foam and draw pattern with toothpick\n5. Garnish with lemon wheel and cherry',
      },
      {
        name: 'Aviation Cocktail',
        glass: 'coupe',
        ingredients: '60ml Gin\n15ml Maraschino Liqueur\n10ml Crème de Violette\n22ml Fresh lemon juice\nLemon twist for garnish',
        instructions: '1. Add all ingredients to a shaker with ice\n2. Shake vigorously for 15 seconds\n3. Double strain into chilled coupe glass\n4. Express lemon twist oils over drink\n5. Garnish with the lemon twist',
      },
      {
        name: 'Moscow Mule',
        glass: 'highball',
        ingredients: '50ml Vodka\n15ml Fresh lime juice\n120ml Ginger beer\nLime wedge for garnish\nMint sprig (optional)',
        instructions: '1. Fill copper mug or highball glass with ice\n2. Add vodka and lime juice\n3. Top with ginger beer\n4. Stir gently to combine\n5. Garnish with lime wedge and mint sprig',
      },
      {
        name: 'Espresso Martini',
        glass: 'martini',
        ingredients: '50ml Vodka\n30ml Fresh espresso (cooled)\n20ml Coffee liqueur (Kahlúa)\n10ml Simple syrup\n3 coffee beans for garnish',
        instructions: '1. Add all ingredients to a shaker with ice\n2. Shake vigorously for 20 seconds\n3. Double strain into chilled martini glass\n4. The foam should form naturally from shaking\n5. Garnish with 3 coffee beans on top',
      },
    ];

    return recipes[Math.floor(Math.random() * recipes.length)];
  }

    getMultipleFallbackRecipes(count: number): RecipeSuggestion[] {
    const fallbackReturnRecipes: RecipeSuggestion[] = [];

    for (let i = 0; i < count; i++) {
      const recipe = this.getFallbackRecipe();
      fallbackReturnRecipes.push(recipe);
    }

    return fallbackReturnRecipes;
  }

  // Fallback chat responses when API is not available
  getFallbackChatResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Check for specific cocktail queries
    if (lowerMessage.includes('negroni')) {
      return "The Negroni is a classic Italian aperitivo cocktail. You'll need equal parts (30ml each) of gin, Campari, and sweet vermouth. Stir with ice for 30 seconds, strain into a rocks glass over fresh ice, and garnish with an orange peel. It's bitter, complex, and perfectly balanced.";
    }

    if (lowerMessage.includes('old fashioned')) {
      return "The Old Fashioned is the quintessential whiskey cocktail. Muddle a sugar cube with 2-3 dashes of Angostura bitters, add 60ml bourbon and a large ice cube, stir gently, and garnish with an orange peel. Simple, elegant, and timeless.";
    }

    if (lowerMessage.includes('margarita')) {
      return "For a perfect Margarita: shake 50ml tequila, 25ml Cointreau, and 25ml fresh lime juice with ice. Strain into a salt-rimmed coupe glass. Always use fresh lime juice - never bottled! The key is balance between sweet, sour, and the agave spirit.";
    }

    if (lowerMessage.includes('martini')) {
      return "The Martini is a sophisticated classic. Combine 60ml gin (or vodka) with 15ml dry vermouth in a mixing glass with ice. Stir for 30 seconds, strain into a chilled martini glass, and garnish with a lemon twist or olive. Adjust the vermouth ratio to your preference.";
    }

    if (lowerMessage.includes('mojito')) {
      return "The Mojito is a refreshing Cuban classic. Gently muddle mint leaves with simple syrup, add 50ml white rum and 25ml fresh lime juice, fill with crushed ice, stir, and top with soda water. Garnish with a mint sprig. The key is to muddle gently - bruising, not crushing the mint.";
    }

    // Check for technique queries
    if (lowerMessage.includes('stir') || lowerMessage.includes('shake')) {
      return "Stirring vs Shaking: Stir spirit-forward cocktails (Manhattan, Negroni, Martini) for 30 seconds to chill and dilute without aeration. Shake cocktails with citrus, cream, or egg whites for 15-20 seconds to properly emulsify and chill. Remember: 'Shake the juice, stir the booze!'";
    }

    if (lowerMessage.includes('glass') || lowerMessage.includes('glassware')) {
      return "Proper glassware enhances the cocktail experience:\n• Rocks glass: Old Fashioned, Negroni\n• Coupe: Daiquiri, Margarita, Sidecar\n• Martini glass: Martini, Manhattan\n• Highball: Mojito, Collins, Mule\n• Shot glass: Shots and shooters\nAlways chill your glassware for 10-15 minutes before serving.";
    }

    // Recipe/suggestion queries
    if (lowerMessage.includes('recipe') || lowerMessage.includes('make') || lowerMessage.includes('suggest') || lowerMessage.includes('cocktail')) {
      return "I can suggest numerous cocktail recipes! Some classics include the Negroni, Old Fashioned, Margarita, Mojito, Manhattan, Daiquiri, and Whiskey Sour. Tell me what spirits you have or what flavor profile you're interested in (sweet, sour, bitter, refreshing), and I'll recommend something perfect for you.";
    }

    // Shopping/stocking queries
    if (lowerMessage.includes('buy') || lowerMessage.includes('stock') || lowerMessage.includes('need') || lowerMessage.includes('essential')) {
      return "Essential bar basics:\n\nSpirits: Gin, Vodka, Bourbon, Rum (white & dark), Tequila\n\nLiqueurs: Cointreau, Dry Vermouth, Sweet Vermouth, Campari\n\nMixers: Simple syrup, fresh lemons & limes, Angostura bitters\n\nTools: Jigger, shaker, strainer, bar spoon, muddler\n\nStart with these and you can make dozens of classic cocktails!";
    }

    // Default response
    return "I'm here to help with cocktail recipes, mixing techniques, and bar management. Ask me about:\n\n• Specific cocktails (Negroni, Margarita, etc.)\n• What you can make with your current inventory\n• Mixing techniques and tips\n• Bar stocking recommendations\n• Ingredient substitutions\n\nNote: For enhanced AI-powered responses, configure your OpenAI API key in the OpenAIService.ts file.";
  }
}

const OpenAIService = new OpenAIServiceClass();

export default OpenAIService;