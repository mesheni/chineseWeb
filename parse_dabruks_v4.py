#!/usr/bin/env python3
"""
Parse dabruks.html v4 — умный парсер.

Извлекает КИТАЙСКИЕ СЛОВА из определений русско-китайского словаря.
Стратегия: ищем китайский текст, за которым сразу идёт пиньинь (в скобках или латиницей).
Это ключевые переводы, а не случайные вхождения.
"""

import re
import json
from collections import defaultdict

# Patterns
CJK = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+')
# Pattern for Chinese text followed by pinyin: 伟大 wěidà  or  伟大[wěidà]  or  伟大[的]wěidà[de]
HAS_PINYIN = re.compile(
    r'([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+)'  # Chinese word(s)
    r'\s*'  # optional whitespace
    r'(?:'  
        r'\[[^\]]*\]'  # bracketed content (like [的])
        r'\s*'
    r')?'
    r'([a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+[\d]*)'  # pinyin
)

# Also look for Chinese text before  — or - (definition separator)
HAS_DASH = re.compile(
    r'([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]{2,})'  # Chinese word (2+ chars)
    r'\s*[—\-]\s*'  # dash separator
    r'([^,\n]*)'  # rest
)

# Chinese grammatical markers to filter out
GRAMMAR_MARKERS = set('的形副介连代数量前前后缀名词形容词副词代词数词量词介词连词助词叹词拟声词冠词感叹词语气词动词')

NOISE_WORDS = {
    '的形容词', '形容词', '名词', '副词', '动词', '数词', '量词',
    '口语', '书面语', '贬义', '褒义', '中性', '旧', '古', '方',
    '形', '副', '名', '动', '代', '数', '量', '介', '连', '助',
    '俗', '喻', '谑', '讽', '敬', '谦', '蔑',
    '参见', '见', '比较', '参看',
}


def parse_entries(html_file):
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


def extract_translation_words(definition):
    """
    Smart extraction: find Chinese words that are actual translations,
    not just characters appearing incidentally in examples or grammar notes.
    """
    words = set()
    
    # Strategy 1: Chinese text followed by pinyin (most reliable indicator of a translation)
    for m in HAS_PINYIN.finditer(definition):
        cn_text = m.group(1).strip()
        if cn_text and len(cn_text) >= 1:
            # Skip if it's a grammar marker
            if cn_text in NOISE_WORDS:
                continue
            if len(cn_text) == 1 and cn_text in GRAMMAR_MARKERS:
                continue
            words.add(cn_text)
    
    # Strategy 2: Look for numbered definitions: `1) 伟大...` or `1) 伟大`
    # These are at the start of lines after digits or special chars
    numbered = re.findall(r'(?:^|\n)\s*\d+[\)\.]\s*([\u4e00-\u9fff]+(?:[\u4e00-\u9fff]+)*)', definition)
    for cn_text in numbered:
        if len(cn_text) >= 2 and cn_text not in NOISE_WORDS:
            words.add(cn_text)
    
    # Strategy 3: Chinese text before  — (dash) indicating translation
    for m in HAS_DASH.finditer(definition):
        cn_text = m.group(1).strip()
        if cn_text not in NOISE_WORDS and len(cn_text) >= 2:
            words.add(cn_text)
    
    # Strategy 4: Semi-colon separated translations: `爱, 爱情, 恋爱`
    semi = re.findall(r'(?:^|\n)\s*\d+[\)\.]\s*([\u4e00-\u9fff][\u4e00-\u9fff，, ]*)', definition)
    for s in semi:
        parts = re.split(r'[，,、\s]+', s)
        for p in parts:
            p = p.strip()
            if p and len(p) >= 1 and p not in NOISE_WORDS:
                if len(p) >= 2 or p not in GRAMMAR_MARKERS:
                    words.add(p)
    
    return words


def main():
    print("=" * 60)
    print("DABRUKS PARSER v4 — Умный парсер")
    print("=" * 60)
    
    entries = parse_entries('/root/chineseWeb/dabruks.html')
    print(f"Всего записей: {len(entries)}")
    
    # Index: Chinese word → context info
    cn_index = defaultdict(lambda: {'russian_words': set(), 'definitions': [], 'count': 0})
    
    for ru_word, cn_def in entries:
        cn_words = extract_translation_words(cn_def)
        for cw in cn_words:
            cn_index[cw]['russian_words'].add(ru_word)
            cn_index[cw]['count'] += 1
            if len(cn_index[cw]['definitions']) < 5:
                cn_index[cw]['definitions'].append(cn_def[:200])
    
    print(f"Уникальных китайских слов: {len(cn_index)}")
    
    # Stats by length
    by_len = defaultdict(int)
    for cw in cn_index:
        by_len[len(cw)] += 1
    
    print("\nРаспределение по длине:")
    for l in sorted(by_len.keys()):
        print(f"  {l} иероглиф(а/ов): {by_len[l]:6d} слов")
    
    # Sort by frequency
    sorted_words = sorted(
        cn_index.items(),
        key=lambda x: (-len(x[1]['russian_words']), -x[1]['count'])
    )
    
    print("\nТоп-100 китайских слов (по кол-ву русских контекстов):")
    for i, (cw, info) in enumerate(sorted_words[:100]):
        rus_sample = list(info['russian_words'])[:3]
        print(f"  [{info['count']:3d}] {cw:25s} ← {', '.join(rus_sample)}")
    
    # Save
    output = {}
    for cw, info in cn_index.items():
        output[cw] = {
            'russian': sorted(info['russian_words']),
            'count': info['count'],
            'definitions': info['definitions'][:3]
        }
    
    with open('/root/chineseWeb/data/bkrs_v4_index.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=1)
    
    # Generate seed (only 2+ char words for quality)
    seed = []
    for cw, info in sorted_words:
        if len(cw) >= 2 and info['count'] >= 2:
            best_ru = min(info['russian_words'], key=len)
            seed.append({
                'character': cw,
                'translation': best_ru,
                'source': 'bkrs'
            })
    
    print(f"\nСгенерировано seed-записей (2+ иероглифа, >=2 вхождений): {len(seed)}")
    
    with open('/root/chineseWeb/data/bkrs_seed_v4.json', 'w', encoding='utf-8') as f:
        json.dump(seed, f, ensure_ascii=False, indent=1)
    
    # Sample
    print("\n" + "=" * 60)
    print("ПРИМЕРЫ ЗАПИСЕЙ:")
    print("=" * 60)
    for s in seed[:40]:
        print(f"  {s['character']:25s} → {s['translation'][:60]}")


if __name__ == '__main__':
    main()
