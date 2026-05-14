import { TrainingCategory, useTraining } from '@/src/screens/TrainingContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const categories: TrainingCategory[] = ['Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];

export default function AddLogRoute() {
  const router = useRouter();
  const { addLog } = useTraining();

  const [category, setCategory] = useState<TrainingCategory>('Strength');
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [distanceLoad, setDistanceLoad] = useState('');
  const [readiness, setReadiness] = useState('8');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!type || !duration) {
      alert('Please fill out at least the session type and duration.');
      return;
    }

    await addLog({
      date: new Date().toISOString().slice(0, 10),
      category,
      type,
      duration,
      distanceLoad,
      readiness,
      notes,
    });
    
    // Go back to the Log screen after saving
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Training Log</Text>
      <Text style={styles.subtitle}>Record your latest session below.</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((c) => (
            <TouchableOpacity 
              key={c} 
              style={[styles.categoryPill, category === c && styles.categoryPillActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.categoryText, category === c && styles.categoryTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Session Type</Text>
        <TextInput 
          style={styles.input} 
          placeholderTextColor="#667060"
          placeholder="e.g., Loaded Ruck" 
          value={type}
          onChangeText={setType}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Duration</Text>
        <TextInput 
          style={styles.input} 
          placeholderTextColor="#667060"
          placeholder="e.g., 45 mins" 
          value={duration}
          onChangeText={setDuration}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Distance / Load (Optional)</Text>
        <TextInput 
          style={styles.input} 
          placeholderTextColor="#667060"
          placeholder="e.g., 5km - 15kg" 
          value={distanceLoad}
          onChangeText={setDistanceLoad}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Readiness / Feel (1-10)</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="numeric"
          placeholderTextColor="#667060"
          placeholder="8" 
          value={readiness}
          onChangeText={setReadiness}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Notes</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholderTextColor="#667060"
          placeholder="How did it feel? Any hot spots?" 
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>SAVE LOG</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>CANCEL</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 20, paddingBottom: 60, gap: 18 },
  title: { color: '#f2f5ef', fontSize: 28, fontWeight: '900', marginTop: 40 },
  subtitle: { color: '#aeb8aa', fontSize: 15, marginBottom: 8 },
  formGroup: { gap: 8 },
  label: { color: '#8fbf8f', fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  input: { 
    backgroundColor: '#0d1812', 
    borderWidth: 1, 
    borderColor: '#203529', 
    color: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    fontSize: 16 
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: { 
    backgroundColor: '#102018', 
    borderWidth: 1, 
    borderColor: '#26382c', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 999 
  },
  categoryPillActive: { backgroundColor: '#91e6a3', borderColor: '#91e6a3' },
  categoryText: { color: '#aeb8aa', fontWeight: '800' },
  categoryTextActive: { color: '#07110c', fontWeight: '900' },
  saveButton: { backgroundColor: '#91e6a3', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#07110c', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  cancelButton: { padding: 16, alignItems: 'center' },
  cancelButtonText: { color: '#8fbf8f', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});