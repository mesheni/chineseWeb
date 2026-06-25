function validateListName(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { error: 'Поле "name" обязательно и должно быть непустой строкой' };
  }
  if (name.length > 100) {
    return { error: 'Поле "name" не может быть длиннее 100 символов' };
  }
  return null;
}

function validateDictionaryId(dictionary_id) {
  if (dictionary_id === undefined || dictionary_id === null || typeof dictionary_id !== 'number' || !Number.isInteger(dictionary_id) || dictionary_id < 1) {
    return { error: 'Поле "dictionary_id" обязательно и должно быть целым числом' };
  }
  return null;
}

function validateReviewInput(word_id, quality) {
  if (word_id === undefined || word_id === null || typeof word_id !== 'number' || !Number.isInteger(word_id) || word_id < 1) {
    return { error: 'Поле "word_id" обязательно и должно быть целым числом' };
  }
  if (quality === undefined || quality === null || typeof quality !== 'number' || !Number.isInteger(quality) || quality < 1 || quality > 5) {
    return { error: 'Поле "quality" обязательно и должно быть целым числом от 1 до 5' };
  }
  return null;
}

function validateSearchParams(limit, offset) {
  if (limit !== undefined && limit !== null) {
    const num = Number(limit);
    if (!Number.isInteger(num) || num < 1) {
      return { error: 'Параметр "limit" должен быть положительным целым числом' };
    }
    if (num > 200) {
      return { error: 'Параметр "limit" не может превышать 200' };
    }
  }
  if (offset !== undefined && offset !== null) {
    const num = Number(offset);
    if (!Number.isInteger(num) || num < 0) {
      return { error: 'Параметр "offset" должен быть целым числом >= 0' };
    }
  }
  return null;
}

module.exports = { validateListName, validateDictionaryId, validateReviewInput, validateSearchParams };
