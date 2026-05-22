import { tokens as T } from '@/src/theme/tokens';
import {
  addVaultEntry,
  deleteVaultEntry,
  loadVault,
  updateVaultEntry,
  VAULT_TAG_COLORS,
  type VaultEntry,
  type VaultTag,
} from '@/src/utils/vaultUtils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const TAGS: VaultTag[] = ['INTEL', 'TRAINING', 'EQUIPMENT', 'LESSON', 'ADMIN'];

type EditorState = { mode: 'new' } | { mode: 'edit'; entry: VaultEntry };

function TagChip({ tag, active, onPress }: { tag: string; active: boolean; onPress: () => void }) {
  const color = tag === 'ALL' ? T.textAccent : VAULT_TAG_COLORS[tag as VaultTag] ?? T.textAccent;
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${tag}`}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.filterChipText, active && { color }]}>{tag}</Text>
    </TouchableOpacity>
  );
}

function EntryCard({
  entry,
  expanded,
  onPress,
  onEdit,
  onDelete,
}: {
  entry: VaultEntry;
  expanded: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = VAULT_TAG_COLORS[entry.tag];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={entry.title}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          <View style={[styles.tagBadge, { borderColor: color + '55' }]}>
            <Text style={[styles.tagBadgeText, { color }]}>{entry.tag}</Text>
          </View>
          <Text style={styles.cardDate}>{entry.date}</Text>
        </View>
        <Text style={styles.cardTitle}>{entry.title}</Text>
        {expanded ? (
          <Text style={styles.cardBodyText}>{entry.body}</Text>
        ) : (
          entry.body ? <Text style={styles.cardPreview} numberOfLines={2}>{entry.body}</Text> : null
        )}
        {expanded && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit entry">
              <Text style={styles.actionBtnText}>EDIT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete entry">
              <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>DELETE</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function VaultScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<VaultTag | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftTag, setDraftTag] = useState<VaultTag>('INTEL');

  useEffect(() => {
    loadVault().then((v) => { setEntries(v); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      if (filterTag !== 'ALL' && e.tag !== filterTag) return false;
      if (q && !e.title.toLowerCase().includes(q) && !e.body.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, filterTag, search]);

  const openNew = useCallback(() => {
    setDraftTitle('');
    setDraftBody('');
    setDraftTag('INTEL');
    setEditor({ mode: 'new' });
  }, []);

  const openEdit = useCallback((entry: VaultEntry) => {
    setDraftTitle(entry.title);
    setDraftBody(entry.body);
    setDraftTag(entry.tag);
    setEditor({ mode: 'edit', entry });
  }, []);

  const handleSave = useCallback(async () => {
    const title = draftTitle.trim();
    if (!title) return;
    if (editor?.mode === 'edit') {
      const updated = { ...editor.entry, title, body: draftBody.trim(), tag: draftTag };
      setEntries(await updateVaultEntry(entries, updated));
    } else {
      setEntries(await addVaultEntry(entries, { title, body: draftBody.trim(), tag: draftTag }));
    }
    setEditor(null);
  }, [draftTitle, draftBody, draftTag, editor, entries]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert('Delete Entry', 'Remove this entry from the vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setEntries(await deleteVaultEntry(entries, id));
          setExpandedId(null);
        },
      },
    ]);
  }, [entries]);

  if (loading) return <View style={styles.screen} />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={styles.header}>
        <View style={vlt.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>[ ← BACK ]</Text>
          </TouchableOpacity>
          <View style={vlt.vaultBadge}>
            <Text style={vlt.vaultBadgeText}>[ CLASSIFIED ]</Text>
          </View>
        </View>
        <Text style={vlt.kicker}>[ KNOWLEDGE VAULT ]</Text>
        <Text style={styles.title}>INTEL STORE</Text>
        <View style={styles.headerDivider} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search entries..."
          placeholderTextColor={T.textHintDark}
          accessibilityLabel="Search vault entries"
        />
      </View>

      {/* Tag filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TagChip tag="ALL" active={filterTag === 'ALL'} onPress={() => setFilterTag('ALL')} />
        {TAGS.map((t) => (
          <TagChip key={t} tag={t} active={filterTag === t} onPress={() => setFilterTag(t)} />
        ))}
      </ScrollView>

      {/* Entry list */}
      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO ENTRIES</Text>
            <Text style={styles.emptySubtext}>
              {search || filterTag !== 'ALL' ? 'No entries match your filter.' : 'Tap + NEW ENTRY to add your first intelligence log.'}
            </Text>
          </View>
        ) : (
          filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onPress={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onEdit={() => openEdit(entry)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      {!editor && (
        <TouchableOpacity style={styles.fab} onPress={openNew} accessibilityRole="button" accessibilityLabel="Add new vault entry">
          <Text style={styles.fabText}>[ + NEW ENTRY ]</Text>
        </TouchableOpacity>
      )}

      {/* Editor overlay */}
      {editor && (
        <View style={styles.editorOverlay}>
          <View style={styles.editor}>
            <Text style={styles.editorKicker}>{editor.mode === 'new' ? 'NEW ENTRY' : 'EDIT ENTRY'}</Text>

            {/* Tag picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
              {TAGS.map((t) => {
                const color = VAULT_TAG_COLORS[t];
                const active = draftTag === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tagPill, active && { borderColor: color, backgroundColor: color + '22' }]}
                    onPress={() => setDraftTag(t)}
                    accessibilityRole="button"
                    accessibilityLabel={`Tag: ${t}`}
                  >
                    <Text style={[styles.tagPillText, active && { color }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.titleInput}
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Entry title..."
              placeholderTextColor={T.textHintDark}
              accessibilityLabel="Entry title"
            />
            <TextInput
              style={styles.bodyInput}
              value={draftBody}
              onChangeText={setDraftBody}
              placeholder="Intelligence, observations, lessons..."
              placeholderTextColor={T.textHintDark}
              multiline
              accessibilityLabel="Entry body"
            />

            <View style={styles.editorActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditor(null)} accessibilityRole="button" accessibilityLabel="Cancel">
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !draftTitle.trim() && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!draftTitle.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save entry"
              >
                <Text style={styles.saveBtnText}>SAVE ENTRY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const vlt = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kicker: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  vaultBadge: { borderWidth: 1, borderColor: 'rgba(224,80,80,0.4)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  vaultBadgeText: { color: '#e05050', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgDark },
  header: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  headerRow: { marginBottom: 6 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1e3826', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7 },
  backBtnText: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  kicker: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  title: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  headerDivider: { height: 1, backgroundColor: T.borderDim, marginTop: 12 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: { backgroundColor: '#0a1610', borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, color: T.textPrimaryDark, fontSize: 13, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 10 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  filterChip: { borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipText: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 110, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: T.textHintDark, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  emptySubtext: { color: '#2e5038', fontSize: 13, fontWeight: '700', textAlign: 'center', maxWidth: 280 },
  card: { flexDirection: 'row', backgroundColor: '#0a1610', borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, overflow: 'hidden' },
  cardAccent: { width: 3, flexShrink: 0 },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3 },
  tagBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  cardDate: { color: T.textHintDark, fontSize: 10, fontWeight: '800' },
  cardTitle: { color: T.textPrimaryDark, fontSize: 15, fontWeight: '900', letterSpacing: 0.1 },
  cardPreview: { color: T.textSubtle, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  cardBodyText: { color: T.textSubtle, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { borderWidth: 1, borderColor: T.borderDim, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnText: { color: T.textAccent, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  actionBtnDanger: { borderColor: '#3d1414' },
  actionBtnTextDanger: { color: '#e05050' },
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: T.textAccent, borderRadius: 4, paddingVertical: 15, alignItems: 'center' },
  fabText: { color: T.bgDark, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  editorOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(5,14,9,0.97)', borderTopWidth: 1, borderTopColor: T.borderDim },
  editor: { padding: 16, gap: 12 },
  editorKicker: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  tagRow: { gap: 6 },
  tagPill: { borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 14, paddingVertical: 8 },
  tagPillText: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  titleInput: { backgroundColor: T.bgDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, color: T.textPrimaryDark, fontSize: 14, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 10 },
  bodyInput: { backgroundColor: T.bgDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, color: T.textPrimaryDark, fontSize: 13, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 10, minHeight: 90, textAlignVertical: 'top' },
  editorActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: T.borderDim, borderRadius: 4, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  saveBtn: { flex: 2, backgroundColor: T.textAccent, borderRadius: 4, paddingVertical: 13, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: T.bgDark, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
});
