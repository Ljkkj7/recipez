// screens/AIChatScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DatabaseService, { ChatMessage, Ingredient } from '../services/DatabaseService';
import OpenAIService, { RecipeSuggestion } from '../services/OpenAIService';

export default function AIChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestion[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChatHistory();
    loadInventory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await DatabaseService.getChatHistory();
      if (history.length === 0) {
        // Add welcome message
        const welcomeMsg: ChatMessage = {
          id: 0,
          sender: 'agent',
          message: 'Welcome to your professional cocktail assistant. I can analyze your inventory, suggest recipes based on available ingredients, and provide detailed preparation instructions. Ask me for single recipes or multiple suggestions at once!',
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
      } else {
        setMessages(history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const items = await DatabaseService.getAllIngredients();
      setInventory(items);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      message: userMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    await DatabaseService.addChatMessage({
      sender: 'user',
      message: userMessage,
      timestamp: userMsg.timestamp,
    });

    try {
      // Check if user is requesting multiple recipes
      const multipleKeywords = ['recipes', 'suggestions', 'options', 'cocktails', 'multiple', 'few', 'several'];
      const requestsMultiple = multipleKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );

      // Extract number if specified
      const numberMatch = userMessage.match(/(\d+)\s*(recipe|cocktail|drink|suggestion)/i);
      const requestedCount = numberMatch ? parseInt(numberMatch[1]) : (requestsMultiple ? 3 : 0);

      let responseText: string = '';

      if (requestsMultiple || requestedCount > 1) {
        // Handle multiple recipes request
        try {
          const count = Math.min(requestedCount || 3, 5);
          
          const chatHistory = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.message,
          }));

          // Generate multiple recipes
          const recipes = await OpenAIService.generateMultipleRecipes(
            userMessage,
            inventory,
            count
          );

          const recipesJson = JSON.stringify({ recipes });

          responseText = await OpenAIService.getChatResponse(
            recipesJson,
            chatHistory,
            userMessage
          );

          // Add all recipes to suggestions
          setRecipeSuggestions(prev => [...prev, ...recipes]);

        } catch (error) {
          console.log('Using fallback for multiple recipes');
          responseText = `Here are ${requestedCount || 3} cocktail suggestions for you:`;
          const fallbackRecipes = OpenAIService.getMultipleFallbackRecipes(requestedCount || 3);
          setRecipeSuggestions(prev => [...prev, ...fallbackRecipes]);
        }
      } else {
        // Handle single recipe or general chat
        try {
          const chatHistory = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.message,
          }));

          // Check if user is asking for a recipe
          if (
            userMessage.toLowerCase().includes('recipe') ||
            userMessage.toLowerCase().includes('make') ||
            userMessage.toLowerCase().includes('suggest')
          ) {
            try {
              const recipe = await OpenAIService.generateCocktailRecipe(
                userMessage,
                inventory
              );

              setRecipeSuggestions(prev => [...prev, recipe]);
            } catch (error) {
              console.log('Recipe generation failed, using fallback');
              const fallbackRecipe = OpenAIService.getFallbackRecipe();
              setRecipeSuggestions(prev => [...prev, fallbackRecipe]);
            }
          }
        } catch (error) {
          console.log('Using fallback responses');
          responseText = OpenAIService.getFallbackChatResponse(userMessage);

          if (
            userMessage.toLowerCase().includes('recipe') ||
            userMessage.toLowerCase().includes('make') ||
            userMessage.toLowerCase().includes('suggest')
          ) {
            const fallbackRecipe = OpenAIService.getFallbackRecipe();
            setRecipeSuggestions(prev => [...prev, fallbackRecipe]);
          }
        }
      }

      // Add agent response
      const agentMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: 'agent',
        message: responseText,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, agentMsg]);
      await DatabaseService.addChatMessage({
        sender: 'agent',
        message: responseText,
        timestamp: agentMsg.timestamp,
      });
    } catch (error) {
      console.error('Error generating response:', error);
      Alert.alert('Error', 'Failed to generate response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe: RecipeSuggestion) => {
    try {
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      await DatabaseService.addRecipe({
        name: recipe.name,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        glass: recipe.glass,
        source: 'AI Generated',
        dateAdded: currentDate,
      });
      Alert.alert('Success', `"${recipe.name}" saved to your collection`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  const handleClearHistory = () => {
    Alert.alert('Clear Chat History', 'Delete all chat messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await DatabaseService.clearChatHistory();
            setMessages([]);
            setRecipeSuggestions([]);
            loadChatHistory();
          } catch (error) {
            Alert.alert('Error', 'Failed to clear history');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Recipe Assistant</Text>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map((msg, index) => (
          <View
            key={`${msg.id}-${index}`}
            style={[
              styles.messageBubble,
              msg.sender === 'user' ? styles.userBubble : styles.agentBubble,
            ]}
          >
            {msg.sender === 'agent' && (
              <Text style={styles.agentLabel}>Recip.ez AI:</Text>
            )}
            <Text
              style={[
                styles.messageText,
                msg.sender === 'user' && styles.userMessageText,
              ]}
            >
              {msg.message}
            </Text>
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2d3748" />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}

        {recipeSuggestions.length > 0 && (
          <View style={styles.recipesSection}>
            <Text style={styles.recipesSectionTitle}>Recipe Suggestions</Text>
            {recipeSuggestions.map((recipe, index) => (
              <View key={index} style={styles.recipeCard}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                <Text style={styles.recipeGlass}>Glass: {recipe.glass}</Text>
                <View style={styles.recipeSection}>
                  <Text style={styles.recipeSectionTitle}>Ingredients:</Text>
                  <Text style={styles.recipeSectionText}>{recipe.ingredients}</Text>
                </View>
                <View style={styles.recipeSection}>
                  <Text style={styles.recipeSectionTitle}>Instructions:</Text>
                  <Text style={styles.recipeSectionText}>{recipe.instructions}</Text>
                </View>
                <TouchableOpacity
                  style={styles.saveRecipeButton}
                  onPress={() => handleSaveRecipe(recipe)}
                >
                  <Text style={styles.saveRecipeButtonText}>Save to Collection</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about cocktail recipes, inventory, or techniques..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2d3748',
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  agentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1a202c',
  },
  userMessageText: {
    color: 'white',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  recipesSection: {
    marginTop: 16,
  },
  recipesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
  },
  recipeCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recipeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  recipeGlass: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  recipeSection: {
    marginBottom: 12,
  },
  recipeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  recipeSectionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  saveRecipeButton: {
    backgroundColor: '#2d3748',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveRecipeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    maxHeight: 100,
    color: '#1a202c',
  },
  sendButton: {
    backgroundColor: '#2d3748',
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});