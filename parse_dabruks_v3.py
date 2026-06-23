#!/usr/bin/env python3
"""
Parse dabruks.html v3 — правильный подход.

Стратегия:
1. Парсим все записи русское_слово → китайское_определение
2. Из каждого определения извлекаем КИТАЙСКИЕ СЛОВА (последовательности иероглифов)
3. Строим индекс: китайское_слово → [русские_переводы]
4. Фильтруем: убираем явный мусор, оставляем только осмысленные китайские слова
5. Генерируем seed-данные для chinese-web
"""

import re
import json
from collections import defaultdict

CJK = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+')

# Иероглифы, которые сами по себе не являются словами (только части составных)
# Но 是, 不, 人, 大, 小, 中, 上, 下 и т.д. — это слова
# Оставляем ВСЕ, потом отфильтруем по частоте и осмысленности

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
        m = re.search(r"let db_temp\s*=\s*\[(.*?)\];", block, re.DOTALL)
        if not m:
            continue
        raw = re.findall(r"\['(.*?)',\s*'(.*?)'\]", m.group(1), re.DOTALL)
        entries.extend(raw)
    
    return entries


def clean_definition(def_text):
    """Clean definition text for better Chinese extraction"""
    # Remove pinyin in brackets
    text = re.sub(r'\[[^\]]+\]', '', def_text)
    # Remove single Latin letters/words (pinyin)
    text = re.sub(r'[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+', ' ', text)
    # Remove numbers and punctuation that's not Chinese
    text = re.sub(r'[0-9《》「」『』【】《》〈〉""「」、，。！？：；（）—…·]+', ' ', text)
    # Remove Russian/Cyrillic text
    text = re.sub(r'[а-яА-ЯёЁ]+', ' ', text)
    return text


def extract_chinese_words(definition):
    """Extract Chinese word sequences from definition, return set of unique words"""
    cleaned = clean_definition(definition)
    matches = CJK.findall(cleaned)
    return set(matches)


def main():
    print("=" * 60)
    print("DABRUKS PARSER v3 — Chinese→Russian Dictionary")
    print("=" * 60)
    
    entries = parse_entries('/root/chineseWeb/dabruks.html')
    print(f"Total entries: {len(entries)}")
    
    # Build index: Chinese word → [Russian words that map to it]
    cn_to_ru = defaultdict(set)  # Chinese word → set of Russian words
    cn_full = defaultdict(list)  # Chinese word → list of full definitions (for context)
    
    for ru_word, cn_def in entries:
        cn_words = extract_chinese_words(cn_def)
        for cw in cn_words:
            if cw:
                cn_to_ru[cw].add(ru_word)
                if len(cn_full[cw]) < 3:  # Keep at most 3 example definitions
                    cn_full[cw].append({'russian': ru_word, 'definition': cn_def[:300]})
    
    print(f"Unique Chinese words found: {len(cn_to_ru)}")
    
    # Analyze by length
    by_len = defaultdict(int)
    for cw in cn_to_ru:
        by_len[len(cw)] += 1
    
    print("\nDistribution by character length:")
    for l in sorted(by_len.keys()):
        print(f"  {l} char(s): {by_len[l]:6d} words")
    
    # Find words that are in HSK data
    print("\nLoading existing HSK data...")
    try:
        with open('/root/chineseWeb/data/chinese_to_russian.json', 'r') as f:
            pass
    except:
        pass
    
    # Save full index
    output = {}
    for cw in sorted(cn_to_ru.keys()):
        rus_list = sorted(cn_to_ru[cw])
        output[cw] = {
            'russian': rus_list,
            'count': len(rus_list),
            'length': len(cw)
        }
    
    with open('/root/chineseWeb/data/bkrs_full_index.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=1)
    
    print(f"\nSaved: bkrs_full_index.json ({len(output)} entries)")
    
    # Show most common Chinese words
    sorted_words = sorted(output.items(), key=lambda x: -x[1]['count'])
    
    print("\nTop 100 Chinese words (by number of Russian translation contexts):")
    for i, (cw, info) in enumerate(sorted_words[:100]):
        rus_sample = info['russian'][:3]
        print(f"  {cw:20s} [{info['count']:3d}] ← {', '.join(rus_sample)}")
    
    # Generate a clean seed file for the web app
    print("\n\nGenerating seed data for ChineseWeb...")
    
    # Focus on:
    # 1. All words with 2+ characters (compound words)
    # 2. Single characters only if they're common (appear in 5+ translation contexts)
    
    seed = []
    for cw, info in output.items():
        if len(cw) >= 2:
            # Compound word — always include
            seed.append({
                'character': cw,
                'translation': min(info['russian'], key=len),
                'all_translations': info['russian'][:5],
                'source': 'bkrs'
            })
        elif info['count'] >= 5:
            # Single char that appears in many contexts — meaningful word
            seed.append({
                'character': cw,
                'translation': min(info['russian'], key=len),
                'all_translations': info['russian'][:5],
                'source': 'bkrs'
            })
    
    # Remove duplicates (some words might appear multiple times)
    seen = set()
    unique_seed = []
    for s in seed:
        if s['character'] not in seen:
            seen.add(s['character'])
            unique_seed.append(s)
    
    print(f"  Multi-character words: {len([s for s in unique_seed if len(s['character']) >= 2])}")
    print(f"  Single characters (freq>=5): {len([s for s in unique_seed if len(s['character']) == 1])}")
    print(f"  Total seed entries: {len(unique_seed)}")
    
    # Export as JSON
    with open('/root/chineseWeb/data/bkrs_seed.json', 'w', encoding='utf-8') as f:
        json.dump(unique_seed, f, ensure_ascii=False, indent=1)
    
    # Export as JS module for the web app
    js_lines = [
        '// Auto-generated from BKRS (daBruks) — Большой Русско-Китайский Словарь',
        '// Version: 2.3:260610 (2026-06-10)',
        '',
        'const bkrsSeedData = [',
    ]
    
    for s in unique_seed:
        ch = s['character'].replace("'", "\\'")
        tr = s['translation'].replace("'", "\\'")
        tr_all = ', '.join(s['all_translations']).replace("'", "\\'")
        js_lines.append(f"  {{ character: '{ch}', translation: '{tr}', all_translations: '{tr_all}', source: 'bkrs' }},")
    
    js_lines.append('];')
    js_lines.append('')
    js_lines.append('module.exports = bkrsSeedData;')
    
    with open('/root/chineseWeb/data/seed-bkrs.js', 'w', encoding='utf-8') as f:
        f.write('\n'.join(js_lines))
    
    print("  Saved: seed-bkrs.js")
    
    # Sample output
    print("\n" + "=" * 60)
    print("SAMPLE ENTRIES:")
    print("=" * 60)
    for s in unique_seed[:30]:
        print(f"  {s['character']:20s} → {s['translation'][:60]}")
    
    print(f"\n... and {len(unique_seed) - 30} more")


if __name__ == '__main__':
    main()
