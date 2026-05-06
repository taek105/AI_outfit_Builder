"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mom-ai-fashion-upvotes";

function readVotes() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function UpvoteButton({ outfitId, initialScore }) {
  const [popularScore, setPopularScore] = useState(initialScore);
  const [isLocked, setIsLocked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    const votes = readVotes();
    const voted = Boolean(votes[outfitId]);
    setIsLocked(voted);
    setPopularScore(initialScore + (voted ? 1 : 0));
  }, [initialScore, outfitId]);

  async function handleUpvote() {
    if (isLocked || isPending || isClicked) {
      return;
    }

    setIsClicked(true);
    setIsPending(true);

    try {
      const votes = readVotes();
      votes[outfitId] = true;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
      const nextScore = initialScore + 1;
      setIsLocked(true);
      setPopularScore(nextScore);
      window.dispatchEvent(new CustomEvent("outfit-upvoted", {
        detail: {
          outfitId,
          popularScore: nextScore
        }
      }));
    } catch {
      setIsClicked(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button className="btn secondary" type="button" disabled={isLocked || isPending || isClicked} onClick={handleUpvote}>
      추천 {popularScore} {isLocked ? "(완료)" : ""}
    </button>
  );
}
