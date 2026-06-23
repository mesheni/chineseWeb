#!/usr/bin/env python3
"""
Parse dabruks.html — extract Chinese→Russian dictionary entries v2.
Smarter parsing: extracts meaningful Chinese words (not just single chars),
focuses on multi-character compounds and key translations.
"""

import re
import json

# Regex for Chinese characters
CJK = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+')
# Single Chinese character that is a common particle/grammar word (noise)
NOISE_CHARS = set('的了一是不也在人有我他她它这那和与就对把被从到去来')

def parse_entries(html_file):
    """Extract all [russian, definition] entries from dabruks.html"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    blocks = re.findall(
        r'<script[^>]*id="dabruks_ids_\d+"[^>]*>(.*?)</script>',
        content, re.DOTALL
    )
    
    entries = []
    for block in blocks:
        match = re.search(r"let db_temp\s*=\s*\[(.*?)\];", block, re.DOTALL)
        if not match:
            continue
        raw = re.findall(r"\['(.*?)',\s*'(.*?)'\]", match.group(1), re.DOTALL)
        entries.extend(raw)
    
    return entries


def extract_key_translations(definition):
    """
    Extract meaningful Chinese words from a definition.
    Strategy:
    - Find Chinese character sequences
    - Filter out noise (single particle chars)
    - Prefer multi-character compounds
    - Return with context score
    """
    matches = CJK.findall(definition)
    words = {}
    
    for m in matches:
        text = m.strip()
        if not text:
            continue
        
        # Skip single noise characters
        if len(text) == 1 and text in NOISE_CHARS:
            continue
        
        # For single chars, only keep if they're not too generic
        if len(text) == 1:
            # Check if it's a meaningful character by seeing if it appears as
            # a standalone word (not just part of compounds)
            continue
        
        # Multi-character word — count it
        words[text] = words.get(text, 0) + 1
    
    return words


def detect_chinese_phrases(definition, russian_word):
    """
    Smart extraction: detect Chinese phrases that are actual translations,
    not just characters appearing in examples.
    """
    # Split definition into segments by Chinese punctuation / newlines
    segments = re.split(r'[；;。\n]', definition)
    
    results = []
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        
        # Find Chinese text in this segment
        chinese_parts = CJK.findall(seg)
        
        for cp in chinese_parts:
            cp = cp.strip()
            if not cp:
                continue
            
            # Skip single noise chars
            if len(cp) == 1 and cp in NOISE_CHARS:
                continue
            
            # Extract pinyin after the Chinese text
            pinyin_match = re.search(
                re.escape(cp) + r'\s*(\[[^\]]+\]|[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\d\s]+)',
                seg
            )
            pinyin = pinyin_match.group(1).strip() if pinyin_match else ''
            
            results.append({
                'chinese': cp,
                'pinyin': pinyin,
                'russian_word': russian_word,
                'context': seg[:200]  # Keep context for reference
            })
    
    return results


def main():
    html_file = '/root/chineseWeb/dabruks.html'
    
    print("=" * 60)
    print("DABRUKS PARSER v2 — Chinese→Russian Dictionary Extraction")
    print("=" * 60)
    
    entries = parse_entries(html_file)
    print(f"\nTotal raw entries: {len(entries)}")
    
    # Build Chinese word index
    word_index = {}  # chinese_word → list of (russian_word, pinyin, context)
    
    for russian_word, definition in entries:
        phrases = detect_chinese_phrases(definition, russian_word)
        for p in phrases:
            ch = p['chinese']
            if ch not in word_index:
                word_index[ch] = []
            word_index[ch].append(p)
    
    print(f"Unique Chinese words/phrases: {len(word_index)}")
    
    # Filter: keep multi-character words (2+ chars) that are most meaningful
    multi_char = {k: v for k, v in word_index.items() if len(k) >= 2}
    single_char = {k: v for k, v in word_index.items() if len(k) == 1}
    
    print(f"  Multi-character (2+): {len(multi_char)}")
    print(f"  Single character: {len(single_char)}")
    
    # Sort by frequency (number of different Russian words that map to it)
    by_freq = sorted(multi_char.items(), key=lambda x: -len(x[1]))
    
    print("\nTop 100 most common Chinese words (multi-char):")
    for ch, refs in by_freq[:100]:
        rus_words = list(set(r['russian_word'] for r in refs))
        print(f"  [{len(refs):3d} refs] {ch} ← {', '.join(rus_words[:3])}{'…' if len(rus_words) > 3 else ''}")
    
    # Save structured output
    # Format 1: Full word index (Chinese → Russian translations)
    output = {}
    for ch, refs in word_index.items():
        # Deduplicate by russian word
        seen_rus = set()
        unique_refs = []
        for r in refs:
            if r['russian_word'] not in seen_rus:
                seen_rus.add(r['russian_word'])
                unique_refs.append(r)
        output[ch] = unique_refs
    
    with open('/root/chineseWeb/data/bkrs_word_index.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=1)
    
    # Format 2: Simplified mapping (Chinese → [Russian translations])
    compact = {}
    for ch, refs in output.items():
        compact[ch] = list(set(r['russian_word'] for r in refs))
    
    with open('/root/chineseWeb/data/bkrs_compact.json', 'w', encoding='utf-8') as f:
        json.dump(compact, f, ensure_ascii=False, indent=1, sort_keys=True)
    
    # Format 3: For seed data generation — multi-character words with pinyin
    seed_entries = []
    for ch, refs in multi_char.items():
        # Get the most relevant Russian translation (shortest/simplest)
        rus_simple = min(set(r['russian_word'] for r in refs), key=len)
        # Get pinyin if available
        pinyins = [r['pinyin'] for r in refs if r['pinyin']]
        pinyin = pinyins[0] if pinyins else ''
        
        seed_entries.append({
            'character': ch,
            'pinyin': pinyin,
            'translation': rus_simple,
            'source': 'bkrs'
        })
    
    # Also add single chars if they have meaningful translations
    for ch, refs in single_char.items():
        rus_simple = min(set(r['russian_word'] for r in refs), key=len)
        pinyins = [r['pinyin'] for r in refs if r['pinyin']]
        pinyin = pinyins[0] if pinyins else ''
        seed_entries.append({
            'character': ch,
            'pinyin': pinyin,
            'translation': rus_simple,
            'source': 'bkrs'
        })
    
    seed_entries.sort(key=lambda x: (-len(x['character']), x['character']))
    
    # Save as seed-data.js for the web app
    js_lines = ['// Auto-generated seed data from BKRS (daBruks)']
    js_lines.append('// Source: Большой Русско-Китайский Словарь (2026-06-10)')
    js_lines.append('// Generated: via parse_dabruks_v2.py')
    js_lines.append('')
    js_lines.append('const seedData = [')
    
    for entry in seed_entries:
        # Escape quotes
        ch = entry['character'].replace("'", "\\'")
        py = entry['pinyin'].replace("'", "\\'")
        tr = entry['translation'].replace("'", "\\'")
        js_lines.append(f"  {{ character: '{ch}', pinyin: '{py}', translation: '{tr}', source: 'bkrs' }},")
    
    js_lines.append('];')
    js_lines.append('')
    js_lines.append('module.exports = seedData;')
    
    seed_path = '/root/chineseWeb/data/seed-bkrs.js'
    with open(seed_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(js_lines))
    
    print(f"\nSaved files:")
    print(f"  bkrs_word_index.json — full index ({len(output)} entries)")
    print(f"  bkrs_compact.json — simplified mapping ({len(compact)} entries)")
    print(f"  seed-bkrs.js — seed data ({len(seed_entries)} entries)")
    
    print(f"\nSample entries from seed data:")
    for e in seed_entries[:20]:
        print(f"  {e['character']:15s} [{e['pinyin'][:20]:20s}] → {e['translation'][:50]}")


if __name__ == '__main__':
    main()
