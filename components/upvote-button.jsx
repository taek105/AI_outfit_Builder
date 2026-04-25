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
    setIsLocked(Boolean(votes[outfitId]));
  }, [outfitId]);

  async function handleUpvote() {
    if (isLocked || isPending || isClicked) {
      return;
    }

    setIsClicked(true);
    setIsPending(true);

    try {
      const response = await fetch(`/api/outfits/${outfitId}/upvote`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setIsClicked(false);
        return;
      }

      const votes = readVotes();
      votes[outfitId] = true;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
      setIsLocked(true);
      setPopularScore(payload.popularScore);
      window.dispatchEvent(new CustomEvent("outfit-upvoted", {
        detail: {
          outfitId,
          popularScore: payload.popularScore
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
      👍 {popularScore} {isLocked ? "(완료)" : ""}
    </button>
  );
}
