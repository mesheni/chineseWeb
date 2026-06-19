function calculateReview(quality, currentInterval, easeFactor, reviewCount) {
  let interval = currentInterval;
  let ef = easeFactor;
  let count = reviewCount;
  const now = new Date();

  if (quality <= 2) {
    interval = 0;
    ef = Math.max(1.3, ef - 0.2);
    count += 1;
  } else if (quality === 3) {
    interval = 1;
    ef = Math.max(1.3, ef - 0.15);
    count += 1;
  } else if (quality === 4) {
    if (count === 0) {
      interval = 1;
    } else if (count === 1) {
      interval = 6;
    } else {
      interval = Math.round(currentInterval * ef);
    }
    count += 1;
  } else if (quality === 5) {
    if (count === 0) {
      interval = 1;
    } else if (count === 1) {
      interval = 6;
    } else {
      interval = Math.round(currentInterval * ef);
    }
    ef = Math.min(2.5, ef + 0.15);
    count += 1;
  }

  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    interval,
    easeFactor: ef,
    nextReview: nextReview.toISOString()
  };
}

module.exports = { calculateReview };
