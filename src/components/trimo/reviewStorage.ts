import { Review } from "./types";

interface ReviewDatabase {
  reviews: Record<string, Review>;
}

const REVIEW_STORAGE_KEY = "trimo_reviews_db";

const emptyDatabase = (): ReviewDatabase => ({ reviews: {} });

const hasWindow = () => typeof window !== "undefined";

const readReviewDatabase = (): ReviewDatabase => {
  if (!hasWindow()) {
    return emptyDatabase();
  }

  const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY);

  if (!raw) {
    return emptyDatabase();
  }

  try {
    const parsed = JSON.parse(raw) as ReviewDatabase;
    return parsed?.reviews ? parsed : emptyDatabase();
  } catch {
    return emptyDatabase();
  }
};

const writeReviewDatabase = (database: ReviewDatabase) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(database));
};

export const loadStoredReviews = () => Object.values(readReviewDatabase().reviews);

export const saveReview = (review: Review) => {
  const database = readReviewDatabase();
  database.reviews[review.reviewId] = review;
  writeReviewDatabase(database);
  return loadStoredReviews();
};
