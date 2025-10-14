import * as SQLite from 'expo-sqlite';

console.log('SQLite.openDatabaseAsync:', SQLite.openDatabaseAsync);

export interface Ingredient {
  id: number;
  name: string;
  category: string;
  quantity: number;
  dateAdded: string;
}

export interface Recipe {
  id: number;
  name: string;
  ingredients: string;
  instructions: string;
  glass: string;
  source: string;
  dateAdded: string;
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'agent';
  message: string;
  timestamp: string;
}

class DatabaseServiceClass {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    this.db = await SQLite.openDatabaseAsync('recipez.db');

    // Create tables
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        quantity REAL,
        dateAdded TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        glass TEXT NOT NULL,
        source TEXT NOT NULL,
        dateAdded TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);

    console.log('Database initialized successfully');
  }

  
  // Ingredients CRUD
  async addIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<number> {
    const result = await this.db!.runAsync(
      `INSERT INTO ingredients (name, category, quantity)
       VALUES (?, ?, ?)`,
      [
        ingredient.name,
        ingredient.category,
        ingredient.quantity,
      ]
    );
    return result.lastInsertRowId;
  }

  async getAllIngredients(): Promise<Ingredient[]> {
    const result = await this.db!.getAllAsync<Ingredient>(
      'SELECT * FROM ingredients ORDER BY dateAdded DESC'
    );
    return result;
  }

  async deleteIngredient(id: number): Promise<void> {
    await this.db!.runAsync('DELETE FROM ingredients WHERE id = ?', [id]);
  }

  // Recipes CRUD
  async addRecipe(recipe: Omit<Recipe, 'id'>): Promise<number> {
    const result = await this.db!.runAsync(
      `INSERT INTO recipes (name, ingredients, instructions, glass, source, dateAdded)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        recipe.name,
        recipe.ingredients,
        recipe.instructions,
        recipe.glass,
        recipe.source,
        recipe.dateAdded,
      ]
    );
    return result.lastInsertRowId;
  }

  async getAllRecipes(): Promise<Recipe[]> {
    const result = await this.db!.getAllAsync<Recipe>(
      'SELECT * FROM recipes ORDER BY dateAdded DESC'
    );
    return result;
  }

  async deleteRecipe(id: number): Promise<void> {
    await this.db!.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
  }

  // Chat history
  async addChatMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    await this.db!.runAsync(
      `INSERT INTO chat_history (sender, message, timestamp)
       VALUES (?, ?, ?)`,
      [message.sender, message.message, message.timestamp]
    );
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    const result = await this.db!.getAllAsync<ChatMessage>(
      'SELECT * FROM chat_history ORDER BY timestamp ASC'
    );
    return result;
  }

  async clearChatHistory(): Promise<void> {
    await this.db!.runAsync('DELETE FROM chat_history');
  }
}

console.log('DatabaseServiceClass defined');

const DatabaseService = new DatabaseServiceClass();

console.log('DatabaseService instance created:', DatabaseService);

export default DatabaseService;