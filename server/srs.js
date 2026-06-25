function calculateReview(quality, currentInterval, easeFactor, reviewCount) {
  let interval;
  let ef = easeFactor;
  let newReviewCount;

  if (quality <= 2) {
    interval = 1;
    newReviewCount = 0;
    ef = Math.max(1.3, ef - 0.2);
  } else {
    if (reviewCount === 0) {
      interval = 1;
    } else {
      interval = Math.round(currentInterval * ef);
    }
    newReviewCount = reviewCount + 1;

    if (quality === 5) {
      ef = Math.min(2.5, ef + 0.15);
    }
  }

  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    interval,
    easeFactor: ef,
    nextReview: nextReview.toISOString(),
    reviewCount: newReviewCount
  };
}

module.exports = { calculateReview };
