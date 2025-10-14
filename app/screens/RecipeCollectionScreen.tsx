
// screens/RecipeCollectionScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import DatabaseService, { Recipe } from '../services/DatabaseService';

const GLASS_TYPES = [
  { value: 'rocks', label: 'Rocks Glass' },
  { value: 'highball', label: 'Highball Glass' },
  { value: 'coupe', label: 'Coupe Glass' },
  { value: 'martini', label: 'Martini Glass' },
  { value: 'wine', label: 'Wine Glass' },
  { value: 'shot', label: 'Shot Glass' },
];

export default function RecipeCollectionScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedGlass, setSelectedGlass] = useState('rocks');

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const items = await DatabaseService.getAllRecipes();
      setRecipes(items);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load recipes');
    }
  };

  const handleAddRecipe = async () => {
    if (!name.trim() || !ingredients.trim() || !instructions.trim()) {
      Alert.alert('Error', 'Please complete all required fields');
      return;
    }

    try {
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      await DatabaseService.addRecipe({
        name: name.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        glass: selectedGlass,
        source: 'Manual Entry',
        dateAdded: currentDate,
      });

      setName('');
      setIngredients('');
      setInstructions('');
      setSelectedGlass('rocks');
      setShowForm(false);
      loadRecipes();
      Alert.alert('Success', 'Recipe added to collection');
    } catch (error) {
      console.error('Error adding recipe:', error);
      Alert.alert('Error', 'Failed to add recipe');
    }
  };

  const handleDeleteRecipe = (id: number, recipeName: string) => {
    Alert.alert('Delete Recipe', `Remove "${recipeName}" from collection?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await DatabaseService.deleteRecipe(id);
            loadRecipes();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete recipe');
          }
        },
      },
    ]);
  };

  const getStats = () => {
    const totalRecipes = recipes.length;
    const aiRecipes = recipes.filter(r => r.source === 'AI Generated').length;
    const manualRecipes = recipes.filter(r => r.source === 'Manual Entry').length;
    return { totalRecipes, aiRecipes, manualRecipes };
  };

  const stats = getStats();

  return (
    <ScrollView style={styles.container}>
      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalRecipes}</Text>
          <Text style={styles.statLabel}>Total Recipes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.aiRecipes}</Text>
          <Text style={styles.statLabel}>AI Generated</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.manualRecipes}</Text>
          <Text style={styles.statLabel}>Manual Entries</Text>
        </View>
      </View>

      {/* Add Recipe Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowForm(!showForm)}
      >
        <Text style={styles.addButtonText}>
          {showForm ? ' Cancel' : ' Add New Recipe '}
        </Text>
      </TouchableOpacity>

      {/* Add Recipe Form */}
      {showForm && (
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Add New Recipe</Text>

          <Text style={styles.label}>Recipe Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Classic Negroni"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Glass Type</Text>
          <View style={styles.glassGrid}>
            {GLASS_TYPES.map(glass => (
              <TouchableOpacity
                key={glass.value}
                style={[
                  styles.glassButton,
                  selectedGlass === glass.value && styles.glassButtonActive,
                ]}
                onPress={() => setSelectedGlass(glass.value)}
              >
                <Text
                  style={[
                    styles.glassButtonText,
                    selectedGlass === glass.value && styles.glassButtonTextActive,
                  ]}
                >
                  {glass.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Ingredients</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="30ml Gin&#10;30ml Campari&#10;30ml Sweet Vermouth&#10;Orange peel for garnish"
            value={ingredients}
            onChangeText={setIngredients}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Preparation Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="1. Add all ingredients to mixing glass with ice&#10;2. Stir for 30 seconds&#10;3. Strain into rocks glass over fresh ice&#10;4. Express orange peel and garnish"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#94a3b8"
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleAddRecipe}>
            <Text style={styles.saveButtonText}>Save Recipe</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recipe Collection */}
      <View style={styles.collectionSection}>
        <Text style={styles.sectionTitle}>Recipe Collection</Text>

        {recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No recipes yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by chatting with the AI assistant or manually adding your signature cocktails
            </Text>
          </View>
        ) : (
          <View style={styles.recipeGrid}>
            {recipes.map(recipe => (
              <View key={recipe.id} style={styles.recipeCard}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                
                <View style={styles.recipeMeta}>
                  <Text style={styles.recipeMetaText}>
                    Glass: {GLASS_TYPES.find(g => g.value === recipe.glass)?.label}
                  </Text>
                  <Text style={styles.recipeMetaText}>
                    Source: {recipe.source}
                  </Text>
                </View>

                <View style={styles.recipeSection}>
                  <Text style={styles.recipeSectionTitle}>Ingredients:</Text>
                  <Text style={styles.recipeSectionText}>{recipe.ingredients}</Text>
                </View>

                <View style={styles.recipeSection}>
                  <Text style={styles.recipeSectionTitle}>Instructions:</Text>
                  <Text style={styles.recipeSectionText}>{recipe.instructions}</Text>
                </View>

                <View style={styles.recipeFooter}>
                  <Text style={styles.recipeDate}>Added: {recipe.dateAdded}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRecipe(recipe.id, recipe.name)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#2d3748',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#1a202c',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  glassGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  glassButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  glassButtonActive: {
    backgroundColor: '#2d3748',
    borderColor: '#2d3748',
  },
  glassButtonText: {
    fontSize: 12,
    color: '#64748b',
  },
  glassButtonTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2d3748',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  collectionSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
  },
  recipeGrid: {
    gap: 16,
  },
  recipeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recipeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
  },
  recipeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  recipeMetaText: {
    fontSize: 12,
    color: '#64748b',
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
  recipeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  recipeDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});