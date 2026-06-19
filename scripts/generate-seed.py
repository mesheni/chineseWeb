#!/usr/bin/env python3
"""Generate seed-data.js for HSK 3.0 levels 1-6.

Combines data from:
1. ivankra/hsk30 (HSK 3.0 char list with levels & examples)
2. LiudmilaLV/json_hsk (Russian translations + pinyin for single chars)
3. drkameleon/complete-hsk-vocabulary (English meanings as fallback)
4. Compound word extraction: for chars missing from 1-3, extract meaning 
   from multi-character words in the old HSK data

Usage:
  python3 scripts/generate-seed.py          # all levels 1-6
  python3 scripts/generate-seed.py 1        # level 1 only
"""

import csv
import json
import sys
import os
from collections import Counter
from pypinyin import pinyin as pypinyin_func, Style

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HSK30_CHARS = os.path.expanduser('~/hsk30-data/hsk30-chars.csv')
OLD_HSK_RU = os.path.expanduser('~/hsk-russian/hsk.json')
COMPLETE_HSK = os.path.expanduser('~/hsk-complete/wordlists/inclusive')
OUTPUT = os.path.join(BASE, 'seed-data.js')

CATEGORY_NAMES = {
    1: 'HSK 1', 2: 'HSK 2', 3: 'HSK 3',
    4: 'HSK 4', 5: 'HSK 5', 6: 'HSK 6',
}


def load_all_translations():
    """Build a comprehensive char->translation dictionary from all sources.
    
    Strategy:
    1. Direct single-char entries (Russian preferred, English fallback)
    2. Compound word extraction: for chars appearing as first char of 
       multi-char words, extract the meaning
    
    Returns: { hanzi: { 'pinyin': str, 'translation': str, 'source': str } }
    """
    with open(OLD_HSK_RU, encoding='utf-8') as f:
        old_data = json.load(f)
    
    # Step 1: single-char entries (Russian first, then English)
    result = {}
    single_ru = {}  # hanzi -> translation
    single_en = {}  # hanzi -> translation
    
    for entry in old_data:
        hanzi = entry['hanzi']
        if len(hanzi) != 1:
            continue
        trans = entry['translations']
        if 'rus' in trans and trans['rus']:
            single_ru[hanzi] = {
                'pinyin': entry['pinyin'],
                'translation': '; '.join(trans['rus']),
                'source': 'ru_direct',
            }
        elif 'eng' in trans and trans['eng']:
            single_en[hanzi] = {
                'pinyin': entry['pinyin'],
                'translation': '; '.join(trans['eng']),
                'source': 'en_direct',
            }
    
    # Merge: Russian preferred
    for h, v in single_ru.items():
        result[h] = v
    for h, v in single_en.items():
        if h not in result:
            result[h] = v
    
    # Step 2: complete-hsk (English for chars not in old HSK)
    for lev_dir in ['old', 'new']:
        path = os.path.join(COMPLETE_HSK, lev_dir)
        if not os.path.isdir(path):
            continue
        for fname in sorted(os.listdir(path)):
            if not fname.endswith('.json') or '.min.' in fname:
                continue
            try:
                with open(os.path.join(path, fname), encoding='utf-8') as f:
                    wl = json.load(f)
            except Exception:
                continue
            for entry in wl:
                hanzi = entry.get('simplified', '')
                if not hanzi or len(hanzi) != 1 or hanzi in result:
                    continue
                for form in entry.get('forms', []):
                    meanings = form.get('meanings', [])
                    if meanings:
                        result[hanzi] = {
                            'pinyin': form.get('transcriptions', {}).get('pinyin', ''),
                            'translation': '; '.join(meanings[:3]),
                            'source': 'en_complete',
                        }
                        break
    
    # Step 3: Compound word extraction
    # For chars still missing, look at multi-character words in old HSK
    # Extract meaning from compound words where this char appears
    
    # Build compound word index: for each multi-char word, extract char->meaning
    compound_hints = {}  # hanzi -> Counter of possible translations
    
    for entry in old_data:
        word = entry['hanzi']
        if len(word) <= 1:
            continue
        
        # Get translation text
        trans = entry['translations']
        if 'rus' in trans and trans['rus']:
            trans_text = '; '.join(trans['rus'])
        elif 'eng' in trans and trans['eng']:
            trans_text = '; '.join(trans['eng'])
        else:
            continue
        
        # For each character in the word, record the translation
        for char in word:
            if char not in compound_hints:
                compound_hints[char] = Counter()
            # Use the first translation as hint
            first_trans = trans_text.split(';')[0].strip() if trans_text else ''
            if first_trans:
                compound_hints[char][first_trans] += 1
    
    # Apply compound hints for missing chars
    compound_applied = 0
    # Read HSK 3.0 chars to know which chars we need
    hsk30_chars = set()
    with open(HSK30_CHARS, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                if 1 <= int(row['Level']) <= 6:
                    hsk30_chars.add(row['Hanzi'])
            except ValueError:
                pass
    
    for char in hsk30_chars:
        if char in result:
            continue
        if char in compound_hints:
            # Get the most common translation
            most_common = compound_hints[char].most_common(1)
            if most_common:
                result[char] = {
                    'pinyin': '',  # Will be filled later
                    'translation': most_common[0][0],
                    'source': 'compound',
                }
                compound_applied += 1
    
    print(f'Translation sources:')
    sources = Counter(v['source'] for v in result.values())
    for s, c in sources.most_common():
        print(f'  {s}: {c}')
    print(f'  compound: {compound_applied}')
    
    return result, old_data


def get_pinyin(hanzi, old_data, result):
    """Get pinyin for a character from best available source."""
    # Check if we already have it from result dict
    if hanzi in result and result[hanzi]['pinyin']:
        return result[hanzi]['pinyin']
    
    # Check old HSK data
    for entry in old_data:
        if entry['hanzi'] == hanzi and len(hanzi) == 1:
            return entry['pinyin']
    
    # Fallback to pypinyin
    try:
        return pypinyin_func(hanzi, style=Style.TONE)[0][0]
    except Exception:
        return ''


def main():
    if len(sys.argv) > 1:
        requested_levels = [int(a) for a in sys.argv[1:]]
    else:
        requested_levels = list(range(1, 7))
    
    print(f'Generating seed data for HSK levels: {requested_levels}')
    print()
    
    translations, old_data = load_all_translations()
    
    # Read HSK 3.0 character list
    chars = []
    with open(HSK30_CHARS, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                level = int(row['Level'])
            except ValueError:
                continue
            if level not in requested_levels:
                continue
            
            hanzi = row['Hanzi']
            
            # Get translation
            if hanzi in translations:
                translation = translations[hanzi]['translation']
            else:
                translation = ''
            
            # Get pinyin
            pinyin_str = get_pinyin(hanzi, old_data, translations)
            
            examples = row.get('Examples', '').strip()
            category = CATEGORY_NAMES.get(level, f'HSK {level}')
            difficulty = level if level <= 5 else 5
            
            chars.append({
                'character': hanzi,
                'pinyin': pinyin_str,
                'translation': translation,
                'example': examples,
                'category': category,
                'difficulty': difficulty,
            })
    
    # Dedup by character (keep lowest level)
    seen = set()
    unique_chars = []
    for c in chars:
        if c['character'] not in seen:
            seen.add(c['character'])
            unique_chars.append(c)
    
    no_translation = [c for c in unique_chars if not c['translation']]
    no_pinyin = [c for c in unique_chars if not c['pinyin']]
    
    print(f'\nTotal unique characters: {len(unique_chars)}')
    print(f'With translation: {len(unique_chars) - len(no_translation)}')
    if no_translation:
        print(f'Without translation: {len(no_translation)} '
              f'(e.g. {", ".join(c["character"] for c in no_translation[:10])})')
    if no_pinyin:
        print(f'Without pinyin: {len(no_pinyin)}')
    
    # Generate seed-data.js
    lines = ['const words = [']
    for c in unique_chars:
        trans = c['translation'].replace('\\', '\\\\').replace("'", "\\'")
        example = c['example'].replace('\\', '\\\\').replace("'", "\\'")
        pinyin_str = c['pinyin'].replace("'", "\\'")
        
        lines.append(
            f"  {{ character: '{c['character']}', pinyin: '{pinyin_str}', "
            f"translation: '{trans}', example: '{example}', "
            f"category: '{c['category']}', difficulty: {c['difficulty']} }},"
        )
    lines.append('];')
    lines.append('')
    lines.append('module.exports = words;')
    
    content = '\n'.join(lines)
    
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(content)
    
    size_kb = os.path.getsize(OUTPUT) / 1024
    print(f'\nWritten: {OUTPUT} ({size_kb:.0f} KB, {len(unique_chars)} characters)')


if __name__ == '__main__':
    main()
