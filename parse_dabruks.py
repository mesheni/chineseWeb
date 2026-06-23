#!/usr/bin/env python3
"""
Parse dabruks.html — extract Chinese→Russian dictionary entries.
Builds an inverted index: Chinese word/phrase → Russian translations.
"""

import re
import json
import sys

CJK_RE = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+')
# Pattern to extract full Chinese phrases (including punctuation marks common in Chinese)
CHINESE_TEXT_RE = re.compile(r'[[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]+')

data_file = '/root/chineseWeb/dabruks.html'

print("Reading dabruks.html...")
with open(data_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all dabruks_ids blocks
# Pattern: between <script ... id="dabruks_ids_N"> ... </script>
blocks = re.findall(
    r'<script[^>]*id="dabruks_ids_\d+"[^>]*>(.*?)</script>',
    content,
    re.DOTALL
)

print(f"Found {len(blocks)} data blocks")

# Parse entries from each block
entries = []
entry_pattern = re.compile(r"\['(.*?)',\s*'(.*?)'\]", re.DOTALL)

for block in blocks:
    # Skip the boilerplate
    match = re.search(r"let db_temp\s*=\s*\[(.*?)\];", block, re.DOTALL)
    if not match:
        continue
    array_content = match.group(1)
    
    # Split by ],\n[' pattern
    raw_entries = re.findall(r"\['(.*?)',\s*'(.*?)'\]", array_content, re.DOTALL)
    entries.extend(raw_entries)

print(f"Total parsed entries: {len(entries)}")

# Now build the Chinese→Russian mapping
chinese_to_russian = {}  # Chinese text → list of (russian_word, full_definition)

# Also track Chinese word frequency for filtering
chinese_word_freq = {}

for russian_word, chinese_def in entries:
    # Find all Chinese character sequences in the definition
    chinese_matches = CJK_RE.findall(chinese_def)
    
    if not chinese_matches:
        continue
    
    # Also try to extract meaningful Chinese phrases (exclude single chars that are parts of longer words)
    # Get unique Chinese text fragments
    seen = set()
    for match in chinese_matches:
        text = match.strip()
        if len(text) < 1:
            continue
        
        if text not in seen:
            seen.add(text)
            
            if text not in chinese_to_russian:
                chinese_to_russian[text] = []
            
            chinese_to_russian[text].append({
                'russian': russian_word,
                'definition': chinese_def,
                'source': 'dabruks'
            })
            
            chinese_word_freq[text] = chinese_word_freq.get(text, 0) + 1

print(f"\nUnique Chinese words/phrases found: {len(chinese_to_russian)}")

# Filter: keep only entries that appear at least 2 times (to reduce noise)
# But also keep all entries — let's sort by frequency for QA
sorted_by_freq = sorted(chinese_word_freq.items(), key=lambda x: -x[1])

print("\nTop 50 most frequent Chinese words in dictionary:")
for word, freq in sorted_by_freq[:50]:
    rus = chinese_to_russian[word][0]['russian']
    print(f"  [{freq:4d}x] {word} ← {rus}")

# Save the full mapping
print("\nSaving chinese_to_russian.json...")
with open('/root/chineseWeb/data/chinese_to_russian.json', 'w', encoding='utf-8') as f:
    json.dump(chinese_to_russian, f, ensure_ascii=False, indent=1)
print("Done! File saved.")

# Also save a compact version (just Chinese → Russian word)
compact = {}
for ch, entries_list in chinese_to_russian.items():
    compact[ch] = list(set(e['russian'] for e in entries_list))

with open('/root/chineseWeb/data/chinese_to_russian_compact.json', 'w', encoding='utf-8') as f:
    json.dump(compact, f, ensure_ascii=False, indent=1)

print(f"\nStats:")
print(f"  Total raw entries: {len(entries)}")
print(f"  Chinese→Russian mappings: {len(chinese_to_russian)}")
print(f"  Compact mappings saved")

