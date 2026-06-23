#!/usr/bin/env python3
"""
Parse HSK 3.0 PDF files (уровни 1-6).
Structure: № | Слово | [Пиньинь] | Перевод слова
"""
import subprocess, re, json, os

HSK_DIR = '/root/chineseWeb'
HSK_FILES = [
    ('HSK 3.0_Уровень 1.pdf', 1),
    ('HSK 3.0_Уровень 2.pdf', 2),
    ('HSK 3.0_Уровень 3.pdf', 3),
    ('HSK 3.0_Уровень 4.pdf', 4),
    ('HSK 3.0_Уровень 5.pdf', 5),
    ('HSK 3.0_Уровень 6.pdf', 6),
]

PINYIN_RE = re.compile(r'\[([^\]]+)\]')

def pdf_to_text(filepath):
    result = subprocess.run(['pdftotext', '-layout', filepath, '-'],
                          capture_output=True, text=True, timeout=30)
    return result.stdout

def parse_hsk_level(text, level):
    lines = text.split('\n')
    words = []
    i = 0
    
    # Skip header
    while i < len(lines) and 'Перевод слова' not in lines[i]:
        i += 1
    i += 1  # Skip past header line
    
    while i < len(lines):
        line = lines[i].strip()
        i += 1
        
        # Skip empty lines and page numbers
        if not line or re.match(r'^\d+$', line) or 'Уровень' in line or 'Больше материалов' in line or 'HSK версия' in line:
            continue
        
        # Check if this line starts a new entry (starts with a number followed by Chinese)
        # Pattern: number, then Chinese text
        num_match = re.match(r'^(\d+)\s+', line)
        if not num_match:
            continue
        
        entry_num = num_match.group(1)
        rest = line[num_match.end():].strip()
        
        # rest should contain: Chinese_word [pinyin] translation_start
        # But sometimes the structure is spread across lines
        
        # Extract Chinese word (before any bracket or space)
        pinyin_match = PINYIN_RE.search(rest)
        if pinyin_match:
            # Word is everything before the pinyin
            word_end = pinyin_match.start()
            word = rest[:word_end].strip()
            pinyin = pinyin_match.group(1)
            translation = rest[pinyin_match.end():].strip()
        else:
            # No pinyin on this line — word might be standalone
            word = rest.strip()
            pinyin = ''
            translation = ''
        
        # If translation is empty or very short, collect next lines
        # that don't start with a number (continuation of translation)
        while i < len(lines):
            next_line = lines[i].strip()
            i += 1
            if not next_line:
                continue
            if re.match(r'^\d+\s', next_line):
                i -= 1  # Put back, it's a new entry
                break
            # Skip page numbers at top of page
            if re.match(r'^\d+$', next_line):
                continue
            # It's continuation of translation
            if translation:
                translation += ' ' + next_line
            else:
                translation = next_line
        
        if word:
            # Clean word: remove formatting markers
            word = re.sub(r'[｜|]', ' | ', word).strip()
            words.append({
                'level': level,
                'word': word,
                'pinyin': pinyin,
                'translation': translation.strip()
            })
    
    return words

def main():
    all_words = []
    
    for filename, level in HSK_FILES:
        filepath = os.path.join(HSK_DIR, filename)
        if not os.path.exists(filepath):
            print(f"⚠️ Not found: {filename}")
            continue
        
        print(f"📄 Level {level}...", end=' ', flush=True)
        text = pdf_to_text(filepath)
        words = parse_hsk_level(text, level)
        print(f"{len(words)} words")
        all_words.extend(words)
    
    print(f"\n📊 Total: {len(all_words)} words across {len(set(w['level'] for w in all_words))} levels")
    
    from collections import Counter
    for l in sorted(set(w['level'] for w in all_words)):
        cnt = sum(1 for w in all_words if w['level'] == l)
        print(f"   HSK {l}: {cnt} слов")
    
    # Save
    output_path = os.path.join(HSK_DIR, 'data', 'hsk30_data.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_words, f, ensure_ascii=False, indent=1)
    print(f"\n💾 Saved: {output_path}")
    
    # Sample
    print("\n📝 Samples:")
    for w in all_words[:10]:
        print(f"   [{w['level']}] {w['word']:15s} [{w['pinyin']:20s}] → {w['translation'][:50]}")

if __name__ == '__main__':
    main()
