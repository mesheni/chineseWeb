#!/usr/bin/env python3
"""
Парсер dabruks.html v5 — сохраняем всё.

Из каждого вхождения китайского текста в определении создаём запись.
Ничего не фильтруем: ни по длине, ни по частоте, ни по «осмысленности».
Каждая запись содержит: китайский текст, русское слово-источник, полное определение.
"""

import re
import json

CJK = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+')


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


def extract_all_chinese(definition):
    """Просто найти все последовательности китайских иероглифов в тексте."""
    return set(CJK.findall(definition))


def main():
    print("=" * 60)
    print("ПАРСЕР v5 — Сохраняем всё")
    print("=" * 60)
    
    entries = parse_entries('/root/chineseWeb/dabruks.html')
    print(f"Всего записей: {len(entries)}")
    
    # Собираем все вхождения: [китайский_текст] → [записи]
    # Каждая запись: {russian: str, definition: str}
    all_entries = {}
    
    for ru_word, cn_def in entries:
        cn_words = extract_all_chinese(cn_def)
        for cw in cn_words:
            if cw not in all_entries:
                all_entries[cw] = []
            # Сохраняем русское слово и полное определение
            all_entries[cw].append({
                'russian': ru_word,
                'definition': cn_def  # полное определение, без обрезки
            })
    
    print(f"Уникальных китайских текстов: {len(all_entries)}")
    
    # Статистика по длине
    by_len = {}
    for cw in all_entries:
        l = len(cw)
        by_len[l] = by_len.get(l, 0) + 1
    
    print("\nРаспределение по длине:")
    for l in sorted(by_len.keys()):
        print(f"  {l} иероглиф(а/ов): {by_len[l]:6d}")
    
    # Сохраняем полный индекс
    # Формат: [ [китайский_текст, [записи...]], ... ]
    output = []
    for cw in sorted(all_entries.keys()):
        # Дедуплицируем записи по русскому слову
        seen_ru = set()
        unique_records = []
        for rec in all_entries[cw]:
            if rec['russian'] not in seen_ru:
                seen_ru.add(rec['russian'])
                unique_records.append(rec)
        output.append({
            'chinese': cw,
            'length': len(cw),
            'count': len(unique_records),
            'records': unique_records
        })
    
    # Сортируем: сначала короткие, потом длинные
    output.sort(key=lambda x: (x['length'], x['chinese']))
    
    with open('/root/chineseWeb/data/bkrs_complete.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=1)
    
    print(f"\nСохранено: bkrs_complete.json")
    print(f"  Всего записей: {len(output)}")
    
    # Покажем самые интересные примеры
    print("\n" + "=" * 60)
    print("ПРИМЕРЫ ЗАПИСЕЙ:")
    print("=" * 60)
    
    # Пару односимвольных
    for item in output[:5]:
        cw = item['chinese']
        first = item['records'][0]
        print(f"\n  [{cw}]")
        print(f"    Русское слово: {first['russian']}")
        print(f"    Определение: {first['definition'][:150]}...")
    
    # Пару двусложных
    two_char = [x for x in output if len(x['chinese']) == 2]
    print(f"\n  --- Двусложные слова (всего {len(two_char)}) ---")
    for item in two_char[:5]:
        cw = item['chinese']
        first = item['records'][0]
        print(f"\n  [{cw}] (в {item['count']} контекстах)")
        print(f"    Русское слово: {first['russian']}")
        print(f"    Определение: {first['definition'][:200]}...")
    
    # Пара длинных
    long_items = [x for x in output if len(x['chinese']) >= 4][:3]
    print(f"\n  --- Длинные слова ---")
    for item in long_items:
        cw = item['chinese']
        print(f"\n  [{cw}] ({len(cw)} иероглифа, в {item['count']} контекстах)")
        first = item['records'][0]
        print(f"    → {first['russian']}")
    
    print(f"\n\nГотово! Файл: /root/chineseWeb/data/bkrs_complete.json")
    print(f"Всего записей: {len(output)}")
    print(f"Из них односимвольных: {by_len.get(1, 0)}")
    print(f"Двусложных: {by_len.get(2, 0)}")
    print(f"Трёхсложных: {by_len.get(3, 0)}")


if __name__ == '__main__':
    main()
