// screens/BarInventoryScreen.tsx
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
import DatabaseService, { Ingredient } from '../services/DatabaseService';

const GLASS_TYPES = [
  { id: 'rocks', name: 'Rocks' },
  { id: 'highball', name: 'Highball' },
  { id: 'coupe', name: 'Coupe' },
  { id: 'martini', name: 'Martini' },
  { id: 'wine', name: 'Wine' },
  { id: 'shot', name: 'Shot' },
];

const CATEGORIES = ['Spirit', 'Liqueur', 'Mixer', 'Bitters', 'Garnish', 'Other'];

export default function BarInventoryScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Spirit');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      const items = await DatabaseService.getAllIngredients();
      setIngredients(items);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      Alert.alert('Error', 'Failed to load inventory');
    }
  };

  const handleAddIngredient = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an ingredient name');
      return;
    }

    try {
      await DatabaseService.addIngredient({
        name: name.trim(),
        category,
        quantity: parseFloat(quantity) || 0,
        dateAdded: new Date().toISOString(),
      });

      setName('');
      setQuantity('');
      loadIngredients();
      Alert.alert('Success', 'Ingredient added to inventory');
    } catch (error) {
      console.error('Error adding ingredient:', error);
      Alert.alert('Error', 'Failed to add ingredient');
    }
  };

  const handleDeleteIngredient = (id: number, name: string) => {
    Alert.alert('Delete Ingredient', `Remove ${name} from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await DatabaseService.deleteIngredient(id);
            loadIngredients();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete ingredient');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Add New Ingredient</Text>

        <TextInput
          style={styles.input}
          placeholder="Ingredient Name (e.g., Hendrick's Gin)"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === cat && styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.label}>Quantity (ml)</Text>
            <TextInput
              style={styles.input}
              placeholder="750"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
          <Text style={styles.addButtonText}>Add to Inventory</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inventorySection}>
        <Text style={styles.sectionTitle}>
          Current Inventory ({ingredients.length} items)
        </Text>

        {ingredients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No ingredients yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add spirits, mixers, and garnishes to build your bar
            </Text>
          </View>
        ) : (
          <View style={styles.ingredientGrid}>
            {ingredients.map(item => (
              <View key={item.id} style={styles.ingredientCard}>
                <Text style={styles.ingredientName}>{item.name}</Text>
                <Text style={styles.ingredientMeta}>
                  {item.category} • {item.quantity}ml
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteIngredient(item.id, item.name)}
                >
                  <Text style={styles.deleteButtonText}>Remove</Text>
                </TouchableOpacity>
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
  formSection: {
    backgroundColor: 'white',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
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
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#1a202c',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  categoryButtonActive: {
    backgroundColor: '#2d3748',
    borderColor: '#2d3748',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  glassGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  glassButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  glassButtonActive: {
    backgroundColor: '#2d3748',
    borderColor: '#2d3748',
  },
  glassButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  glassButtonTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#2d3748',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  inventorySection: {
    padding: 16,
  },
  ingredientGrid: {
    gap: 12,
  },
  ingredientCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ingredientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  ingredientMeta: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  ingredientGlass: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
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